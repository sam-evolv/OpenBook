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
import type { ToolContext, ToolHandler } from './index';

const HOLD_DURATION_MIN = 10;
const APP_DOMAIN = (() => {
  const fromEnv = process.env.APP_DOMAIN;
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === 'production') {
    // Fail loud — we don't want to silently sign URLs against the wrong host.
    throw new Error('APP_DOMAIN env var is required in production');
  }
  return 'http://localhost:3000';
})();

function checkoutBaseUrl(): string {
  if (APP_DOMAIN.startsWith('http://') || APP_DOMAIN.startsWith('https://')) return APP_DOMAIN;
  return `https://${APP_DOMAIN}`;
}

const DUBLIN_TZ = 'Europe/Dublin';

const NUMBER_WORDS: Record<number, string> = {
  0: 'midnight',
  1: 'one',
  2: 'two',
  3: 'three',
  4: 'four',
  5: 'five',
  6: 'six',
  7: 'seven',
  8: 'eight',
  9: 'nine',
  10: 'ten',
  11: 'eleven',
  12: 'twelve',
};

function dublinParts(date: Date) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: DUBLIN_TZ,
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return {
    weekday: get('weekday'),
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
  };
}

function dublinDayKey(date: Date): string {
  const p = dublinParts(date);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

function partOfDay(hour: number): string {
  if (hour >= 5 && hour < 12) return 'in the morning';
  if (hour >= 12 && hour < 17) return 'in the afternoon';
  if (hour >= 17 && hour < 22) return 'in the evening';
  return 'at night';
}

function humaniseTime(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const hourWord = NUMBER_WORDS[h12] ?? String(h12);
  if (minute === 0) return `${hourWord} ${partOfDay(hour)}`;
  if (minute === 15) return `quarter past ${hourWord} ${partOfDay(hour)}`;
  if (minute === 30) return `half past ${hourWord} ${partOfDay(hour)}`;
  if (minute === 45) return `quarter to ${hourWord === 'twelve' ? 'one' : NUMBER_WORDS[(h12 % 12) + 1] ?? ''} ${partOfDay(hour)}`;
  return `${hourWord} ${String(minute).padStart(2, '0')} ${partOfDay(hour)}`;
}

export function humaniseDateTime(date: Date, now: Date = new Date()): string {
  const dKey = dublinDayKey(date);
  const nowKey = dublinDayKey(now);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowKey = dublinDayKey(tomorrow);

  const p = dublinParts(date);
  const time = humaniseTime(p.hour, p.minute);

  if (dKey === nowKey) return `today at ${time}`;
  if (dKey === tomorrowKey) return `tomorrow at ${time}`;
  return `${p.weekday} at ${time}`;
}

const responseError = (code: string, message: string, extras: Record<string, unknown> = {}) => ({
  error: { code, message, ...extras },
});

export const holdAndCheckoutHandler: ToolHandler = async (input, ctx: ToolContext) => {
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
    .select('id, slug, name, is_live')
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
    p_source_assistant: ctx.sourceAssistant,
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
    },
    next_step_for_user: isFree
      ? 'Tap the link to confirm your booking; held for ten minutes.'
      : 'Tap the link to confirm and pay; held for ten minutes.',
  };

  const validation = holdAndCheckoutOutput.safeParse(response);
  if (!validation.success) {
    console.error('[mcp.hold] response validation failed', validation.error.format());
    return responseError('RESPONSE_VALIDATION_FAILED', 'Internal error constructing hold response.');
  }
  return validation.data;
};

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
      supa.rpc('get_availability_for_ai', {
        p_business_id: businessId,
        p_service_id: service.id,
        p_date: d,
      }),
    ),
  );
  const flat: Array<{ slot_start: string; slot_end: string }> = [];
  for (const r of results) {
    if (r.error || !Array.isArray(r.data)) continue;
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
