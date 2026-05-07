// get_availability — precise slot availability for a business + service.
// Spec: docs/mcp-server-spec.md section 5.4. Column mappings: Appendix D.
//
// Strategy: reuse the canonical Postgres function `get_availability_for_ai`
// (defined in 20260430120000, updated in 20260507170000 to also exclude
// active mcp_holds). It already accounts for hours, closures, buffers,
// existing bookings, and now mcp_holds — exactly the four sources of truth
// for availability. We call it once per date in the requested range and
// overlay promoted-slot metadata.
//
// Round trips:
//   1. business lookup
//   2. service lookup
//   3. parallel rpc(get_availability_for_ai) for each date in range
//   4. promoted_slots overlay
// Performance budget per spec section 14: p95 < 300ms.

import {
  getAvailabilityInput,
  getAvailabilityOutput,
} from '../../../../lib/mcp/schemas';
import { supabaseAdmin } from '../../../../lib/supabase';
import type { ToolHandler } from './index';

const MAX_RANGE_DAYS = 14;
const DEFAULT_RANGE_DAYS = 7;

type Slot = {
  start_iso: string;
  end_iso: string;
  promoted?: {
    kind: 'standard' | 'flash_sale';
    discount_percent?: number;
    message?: string;
  };
};

function addDaysIso(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function diffDays(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

function datesInRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let cursor = from; cursor <= to; cursor = addDaysIso(cursor, 1)) {
    out.push(cursor);
  }
  return out;
}

const NOT_FOUND = (code: 'BUSINESS_NOT_FOUND' | 'SERVICE_NOT_FOUND', message: string) => ({
  error: { code, message },
});

export const getAvailabilityHandler: ToolHandler = async (input) => {
  const parsed = getAvailabilityInput.parse(input);
  const { slug, service_id, date_from } = parsed;

  // Effective date range: default +7 days, cap at +14.
  const requestedTo = parsed.date_to ?? addDaysIso(date_from, DEFAULT_RANGE_DAYS);
  const date_to =
    diffDays(date_from, requestedTo) > MAX_RANGE_DAYS
      ? addDaysIso(date_from, MAX_RANGE_DAYS)
      : requestedTo;

  const supa = supabaseAdmin();

  const { data: business, error: bizErr } = await supa
    .from('businesses')
    .select('id, slug, name')
    .eq('slug', slug)
    .eq('is_live', true)
    .maybeSingle();
  if (bizErr) {
    console.error('[mcp.get_availability] business lookup error', { slug, bizErr });
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch business.' } };
  }
  if (!business) {
    return NOT_FOUND('BUSINESS_NOT_FOUND', 'Business not found or not currently live.');
  }

  const { data: service, error: svcErr } = await supa
    .from('services')
    .select('id, name, duration_minutes, price_cents, is_active')
    .eq('id', service_id)
    .eq('business_id', business.id)
    .maybeSingle();
  if (svcErr) {
    console.error('[mcp.get_availability] service lookup error', { service_id, svcErr });
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch service.' } };
  }
  if (!service || service.is_active === false) {
    return NOT_FOUND('SERVICE_NOT_FOUND', 'Service not found or not currently active.');
  }

  // Fan out per date — the rpc is single-day. The sweep inside is idempotent
  // and the cost of N parallel sweeps is dominated by the partial index on
  // `bookings_active_holds_idx`, so this stays cheap.
  const dates = datesInRange(date_from, date_to);
  const rpcResults = await Promise.all(
    dates.map((d) =>
      supa.rpc('get_availability_for_ai', {
        p_business_id: business.id,
        p_service_id: service.id,
        p_date: d,
      }),
    ),
  );

  type RpcRow = { slot_start: string; slot_end: string };
  const rawSlots: RpcRow[] = [];
  for (const r of rpcResults) {
    if (r.error) {
      console.error('[mcp.get_availability] rpc error', { slug, service_id, error: r.error });
      return {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to compute availability.',
        },
      };
    }
    const rows = (r.data ?? []) as RpcRow[];
    for (const row of rows) rawSlots.push(row);
  }

  // Promoted overlay. Only standard / flash_sale rows surface here;
  // regulars_only is a different surface.
  const fromIso = `${date_from}T00:00:00.000Z`;
  const toIso = `${date_to}T23:59:59.999Z`;
  const { data: promoted, error: promoErr } = await supa
    .from('mcp_promoted_slots')
    .select('slot_start, kind, original_price_eur, promoted_price_eur, message')
    .eq('business_id', business.id)
    .eq('service_id', service.id)
    .eq('is_active', true)
    .in('kind', ['standard', 'flash_sale'])
    .gte('slot_start', fromIso)
    .lte('slot_start', toIso);
  if (promoErr) {
    console.error('[mcp.get_availability] promoted lookup error', { promoErr });
    // Non-fatal: continue with un-overlaid slots. Promoted is enrichment.
  }

  const promotedByStart = new Map<string, NonNullable<typeof promoted>[number]>();
  for (const row of promoted ?? []) {
    promotedByStart.set(new Date(row.slot_start as string).toISOString(), row);
  }

  let slots: Slot[];
  try {
    slots = rawSlots.map((s) => {
      const startIsoNorm = new Date(s.slot_start).toISOString();
      const endIsoNorm = new Date(s.slot_end).toISOString();
      return { start_iso: startIsoNorm, end_iso: endIsoNorm } as Slot;
    });
  } catch (err) {
    console.error('[mcp.get_availability] malformed rpc rows', { slug, service_id, err });
    return {
      error: {
        code: 'RESPONSE_VALIDATION_FAILED',
        message: 'Internal error constructing availability.',
      },
    };
  }
  slots = slots.map((slot) => {
    const startIsoNorm = slot.start_iso;
    const p = promotedByStart.get(startIsoNorm);
    if (p) {
      const kind = p.kind as 'standard' | 'flash_sale';
      const original = Number(p.original_price_eur);
      const promo = Number(p.promoted_price_eur);
      const discount =
        kind === 'flash_sale' && original > 0
          ? Math.round((1 - promo / original) * 100)
          : undefined;
      slot.promoted = {
        kind,
        ...(discount !== undefined ? { discount_percent: discount } : {}),
        ...(p.message ? { message: p.message } : {}),
      };
    }
    return slot;
  });

  const response = {
    business: { slug: business.slug, name: business.name },
    service: {
      service_id: service.id,
      name: service.name,
      duration_minutes: service.duration_minutes,
      price_eur: service.price_cents / 100,
      // deposit_eur intentionally omitted — column not stored (Appendix D).
    },
    slots,
    timezone: 'Europe/Dublin' as const,
    ...(slots.length === 0
      ? {
          notes:
            'No availability for this service in the requested date range. Try a wider window or a different service.',
        }
      : {}),
  };

  const validation = getAvailabilityOutput.safeParse(response);
  if (!validation.success) {
    console.error('[mcp.get_availability] response validation failed', {
      slug,
      service_id,
      issues: validation.error.format(),
    });
    return {
      error: {
        code: 'RESPONSE_VALIDATION_FAILED',
        message: 'Internal error constructing availability.',
      },
    };
  }

  // Lazy-fire drain for the waitlist notification queue. The
  // /api/cron/notify-waitlist endpoint exists for Vercel Pro projects,
  // but Hobby caps crons at 1/day — so we drain a tiny batch here
  // on every availability check. Fire-and-forget: must NOT affect the
  // response or its latency. See lib/mcp/process-waitlist-notifications.ts
  // for the trade-off (notifications fire seconds after a slot frees up
  // during busy periods, up to ~30 minutes during quiet ones).
  void drainWaitlistQueueLazily();

  return validation.data;
};

async function drainWaitlistQueueLazily(): Promise<void> {
  try {
    // Lazy import so the processor module (and its Resend transitive)
    // only loads when the handler actually fires — keeps the cold-start
    // cost off the availability path.
    const { processWaitlistNotifications } = await import(
      '../../../../lib/mcp/process-waitlist-notifications'
    );
    await processWaitlistNotifications({ limit: 5 });
  } catch (err) {
    // Never let a queue-drain error affect availability. Log and move on.
    console.error('[mcp.get_availability] lazy waitlist drain failed', err);
  }
}
