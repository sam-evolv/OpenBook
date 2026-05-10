// hold_and_checkout — places a 10-minute hold on a slot and returns a
// signed checkout URL plus a longer-lived polling token for follow-up.
// Spec: docs/mcp-server-spec.md section 5.5.
//
// Concurrency safety: the bookings + mcp_holds inserts happen inside the
// `create_mcp_hold_atomically` Postgres function (see migration
// 20260507200000) so two simultaneous calls for the same slot can't both
// win. On conflict we surface 3 nearby alternatives.

import {
  holdAndCheckoutInput,
  holdAndCheckoutOutput,
} from '../../../../lib/mcp/schemas';
import { supabaseAdmin } from '../../../../lib/supabase';
import { signHoldToken, signPollingToken } from '../../../../lib/mcp/tokens';
import { humaniseDateTime } from '../../../../lib/checkout/format-datetime';
import { safeTask, wrapToolBoundary } from '../../../../lib/mcp/serialization';
import { getPaymentMode, type PaymentMode } from '../../../../lib/payments/payment-mode';
import type { ToolContext, ToolHandler } from './index';

export { humaniseDateTime };

const HOLD_DURATION_MIN = 10;
const APP_DOMAIN = (() => {
  const fromEnv = process.env.APP_DOMAIN;
  if (fromEnv) return fromEnv;
  return process.env.NODE_ENV === 'production' ? 'app.openbook.ie' : 'http://localhost:3000';
})();

function checkoutBaseUrl(): string {
  if (APP_DOMAIN.startsWith('http://') || APP_DOMAIN.startsWith('https://')) return APP_DOMAIN;
  return `https://${APP_DOMAIN}`;
}

const responseError = (code: string, message: string, extras: Record<string, unknown> = {}) => ({
  error: { code, message, ...extras },
});

// Three-way branched copy for next_step_for_user. stripe_now keeps the
// original wording; in_person paid surfaces the price and business name
// so the assistant can tell the user upfront they will settle directly
// with the business; in_person free omits any mention of payment. Whole
// euros render without trailing .00 ("€40" not "€40.00").
function buildNextStepCopy(args: {
  paymentMode: PaymentMode;
  priceCents: number;
  businessName: string;
}): string {
  const { paymentMode, priceCents, businessName } = args;

  if (paymentMode === 'stripe_now') {
    return 'Tap the link to confirm and pay; held for ten minutes.';
  }

  if (priceCents === 0) {
    return 'Tap the link to confirm; held for ten minutes.';
  }

  const eur = (priceCents / 100).toFixed(2).replace(/\.00$/, '');
  return `Tap the link to confirm. You'll pay €${eur} at ${businessName} on the day; held for ten minutes.`;
}

export const _holdAndCheckoutImpl: ToolHandler = async (input, ctx: ToolContext) => {
  const parsed = holdAndCheckoutInput.parse(input);
  const { slug, service_id, start_iso, customer_hints } = parsed;

  // start_iso is validated as datetime() by the Zod schema, but parse defensively.
  const startAt = new Date(start_iso);
  if (Number.isNaN(startAt.getTime())) {
    return responseError('SLOT_IN_PAST', 'Slot start is not a valid timestamp.');
  }
  if (startAt.getTime() <= Date.now()) {
    return responseError('SLOT_IN_PAST', 'Slot start is in the past.');
  }

  const supa = supabaseAdmin();

  const { data: business, error: bizErr } = await supa
    .from('businesses')
    .select('id, slug, name, is_live, stripe_account_id, stripe_charges_enabled')
    .eq('slug', slug)
    .eq('is_live', true)
    .maybeSingle();
  if (bizErr) {
    console.error('[mcp.hold] business lookup error', { slug, bizErr });
    return responseError('INTERNAL_ERROR', 'Failed to fetch business.');
  }
  if (!business) {
    return responseError('BUSINESS_NOT_FOUND', 'Business not found or not currently live.');
  }

  const { data: service, error: svcErr } = await supa
    .from('services')
    .select('id, name, duration_minutes, price_cents, is_active')
    .eq('id', service_id)
    .eq('business_id', business.id)
    .maybeSingle();
  if (svcErr) {
    console.error('[mcp.hold] service lookup error', { service_id, svcErr });
    return responseError('INTERNAL_ERROR', 'Failed to fetch service.');
  }
  if (!service || service.is_active === false) {
    return responseError('SERVICE_NOT_FOUND', 'Service not found or not currently active.');
  }

  const endAt = new Date(startAt.getTime() + service.duration_minutes * 60_000);
  const expiresAt = new Date(Date.now() + HOLD_DURATION_MIN * 60_000);

  const { data: rpcRows, error: rpcErr } = await supa.rpc('create_mcp_hold_atomically', {
    p_business_id: business.id,
    p_service_id: service.id,
    p_start_at: startAt.toISOString(),
    p_end_at: endAt.toISOString(),
    p_expires_at: expiresAt.toISOString(),
    // Caller-declared source_assistant is used only for the bridge-card CTA
    // copy on /c/[token], not as a security boundary. Header-sniffing was
    // already trivially spoofable, so trusting the explicit input is no
    // worse — and is more reliable for clients we don't recognise by UA.
    p_source_assistant: parsed.source_assistant ?? ctx.sourceAssistant,
    p_customer_hints: customer_hints ?? null,
  });

  if (rpcErr) {
    console.error('[mcp.hold] rpc error', { rpcErr });
    return responseError('INTERNAL_ERROR', 'Failed to create hold.');
  }

  const row = Array.isArray(rpcRows) ? rpcRows[0] : null;
  if (!row) {
    return responseError('INTERNAL_ERROR', 'Hold creation returned no row.');
  }

  if (row.conflict_reason === 'SERVICE_NOT_FOUND') {
    return responseError('SERVICE_NOT_FOUND', 'Service not found or not currently active.');
  }

  if (row.conflict_reason === 'SLOT_UNAVAILABLE') {
    // Fetch a few alternatives over the next 7 days.
    const alts = await fetchAlternatives(supa, business.id, service, startAt);
    return responseError(
      'SLOT_UNAVAILABLE',
      'That slot was just taken. Three nearby alternatives are available.',
      { alternatives: alts },
    );
  }

  if (!row.hold_id || !row.booking_id) {
    return responseError('INTERNAL_ERROR', 'Hold creation returned malformed result.');
  }

  // Sign tokens.
  const holdToken = await signHoldToken({
    hold_id: row.hold_id,
    booking_id: row.booking_id,
    business_id: business.id,
    service_id: service.id,
    expires_at: expiresAt.toISOString(),
  });
  const pollingToken = await signPollingToken({
    hold_id: row.hold_id,
    booking_id: row.booking_id,
  });

  const checkoutUrl = `${checkoutBaseUrl()}/c/${holdToken}`;
  const isFree = service.price_cents === 0;

  // Resolve payment_mode using the same helper the page-side flow uses
  // (lib/payments/payment-mode.ts, introduced in PR #145). Free services
  // and businesses without Stripe Connect onboarding both resolve to
  // in_person; everything else is stripe_now. The MCP-side copy tracks
  // this so assistants tell users upfront whether they pay now or at
  // the business on the day.
  const paymentMode: PaymentMode = getPaymentMode(business, service);

  const response = {
    hold_id: row.hold_id,
    polling_token: pollingToken,
    expires_at: expiresAt.toISOString(),
    checkout_url: checkoutUrl,
    summary: {
      business_name: business.name,
      service_name: service.name,
      start_iso: startAt.toISOString(),
      start_human: humaniseDateTime(startAt),
      duration_minutes: service.duration_minutes,
      price_eur: service.price_cents / 100,
      // deposit_eur intentionally omitted — column not stored (Appendix D).
      is_free: isFree,
      payment_mode: paymentMode,
    },
    next_step_for_user: buildNextStepCopy({
      paymentMode,
      priceCents: service.price_cents,
      businessName: business.name,
    }),
  };

  const validation = holdAndCheckoutOutput.safeParse(response);
  if (!validation.success) {
    console.error('[mcp.hold] response validation failed', validation.error.format());
    return responseError('RESPONSE_VALIDATION_FAILED', 'Internal error constructing hold response.');
  }
  return validation.data;
};

export const holdAndCheckoutHandler: ToolHandler = wrapToolBoundary(
  'hold_and_checkout',
  () => ({
    checkout_url: null,
    polling_token: null,
    notes: 'OpenBook checkout is temporarily unavailable. Please try again shortly.',
  }),
  _holdAndCheckoutImpl,
);

type SupabaseClient = ReturnType<typeof supabaseAdmin>;

async function fetchAlternatives(
  supa: SupabaseClient,
  businessId: string,
  service: { id: string; name: string; duration_minutes: number; price_cents: number },
  near: Date,
): Promise<Array<Record<string, unknown>>> {
  const dates: string[] = [];
  const start = new Date(near);
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    dates.push(d.toISOString().slice(0, 10));
  }
  const results = await Promise.all(
    dates.map((d) =>
      safeTask(
        `hold.alts.rpc:${businessId}:${d}`,
        supa.rpc('get_availability_for_ai', {
          p_business_id: businessId,
          p_service_id: service.id,
          p_date: d,
        }),
      ),
    ),
  );
  const flat: Array<{ slot_start: string; slot_end: string }> = [];
  for (const r of results) {
    if (!r || r.error || !Array.isArray(r.data)) continue;
    for (const row of r.data as Array<{ slot_start: string; slot_end: string }>) {
      flat.push(row);
    }
  }
  flat.sort((a, b) => a.slot_start.localeCompare(b.slot_start));
  return flat.slice(0, 3).map((s) => ({
    service_id: service.id,
    service_name: service.name,
    start_iso: new Date(s.slot_start).toISOString(),
    duration_minutes: service.duration_minutes,
    price_eur: service.price_cents / 100,
  }));
}
