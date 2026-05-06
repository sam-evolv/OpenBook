/**
 * Tool definitions + server-side dispatcher for the consumer
 * AI booking assistant. Read by app/api/ai/chat/route.ts only.
 *
 * The model's job ends at propose_slot. Confirmation is deterministic:
 * the UI POSTs the proposal IDs to /api/booking/confirm, which runs
 * hold_slot_for_ai and either confirms (free) or returns a Stripe
 * Checkout URL (paid). hold_and_book was removed from the model's tool
 * surface after repeated UUID hallucinations — see PR #69.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ---------------------------------------------------------------------------
// Europe/Dublin timezone helpers
// ---------------------------------------------------------------------------
//
// Single source of truth for every time the agent constructs, queries, or
// displays. The OpenBook business runs on Dublin local time year-round —
// that means BST (UTC+1) from late March to late October and GMT (UTC+0)
// the rest of the year. Every helper here uses Intl with the Europe/Dublin
// time zone so daylight-savings transitions are handled by the platform
// rather than hand-rolled offset arithmetic.

const DUBLIN_TZ = 'Europe/Dublin';

const DUBLIN_TIME_FMT = new Intl.DateTimeFormat('en-IE', {
  timeZone: DUBLIN_TZ,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

const DUBLIN_DATE_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: DUBLIN_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const DUBLIN_HHMM_FMT = new Intl.DateTimeFormat('en-GB', {
  timeZone: DUBLIN_TZ,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const DUBLIN_DISPLAY_TIME_FMT = new Intl.DateTimeFormat('en-IE', {
  timeZone: DUBLIN_TZ,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

// "Tuesday 6 May at 3:00 PM" — matches the consumer ProposalCard
// (app/(consumer)/assistant/format.ts:formatProposalTime) so the model's
// acknowledgement and the rendered card always agree.
function formatDublinTime(d: Date): string {
  const parts = DUBLIN_TIME_FMT.formatToParts(d);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? '';
  const dayPeriod = (get('dayPeriod') || '').toUpperCase();
  return `${get('weekday')} ${get('day')} ${get('month')} at ${get('hour')}:${get('minute')} ${dayPeriod}`.trim();
}

/** YYYY-MM-DD calendar date in Europe/Dublin for a UTC instant. */
function dublinDateOf(d: Date): string {
  return DUBLIN_DATE_FMT.format(d);
}

/** "HH:MM" (24-hour) wall-clock in Europe/Dublin for a UTC instant. */
function dublinHHMMOf(d: Date): string {
  const parts = DUBLIN_HHMM_FMT.formatToParts(d);
  const h = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const m = parts.find((p) => p.type === 'minute')?.value ?? '00';
  // en-GB midnight is sometimes returned as "24" — normalise to "00".
  return `${h === '24' ? '00' : h}:${m}`;
}

/** "3:00 PM"-style short Dublin time, used as a slot display string. */
function dublinShortTime(d: Date): string {
  const parts = DUBLIN_DISPLAY_TIME_FMT.formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const dayPeriod = (get('dayPeriod') || '').toUpperCase();
  return `${get('hour')}:${get('minute')} ${dayPeriod}`.trim();
}

/**
 * Convert a Dublin wall-clock (Y/M/D h:m) into the correct UTC instant.
 * Uses the round-trip-through-Intl trick so DST is handled automatically:
 * we ask the platform what wall-clock that tentative UTC instant displays
 * as in Dublin, derive the offset from the delta, and shift accordingly.
 */
function dublinWallClockToInstant(
  y: number,
  m: number,
  d: number,
  h: number,
  min: number,
  sec = 0
): Date {
  const tentativeUtc = Date.UTC(y, m - 1, d, h, min, sec);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: DUBLIN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(tentativeUtc));
  const part = (t: string) =>
    Number(parts.find((p) => p.type === t)?.value ?? '0');
  const dY = part('year');
  const dM = part('month');
  const dD = part('day');
  let dH = part('hour');
  if (dH === 24) dH = 0;
  const dMin = part('minute');
  const dSec = part('second');
  const dublinAsUtc = Date.UTC(dY, dM - 1, dD, dH, dMin, dSec);
  const offsetMs = dublinAsUtc - tentativeUtc;
  return new Date(tentativeUtc - offsetMs);
}

const HAS_OFFSET_RE = /([+-]\d{2}:?\d{2}|Z)$/i;
const NAIVE_DATETIME_RE =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/;

/**
 * Parse a slot_start string into a UTC Date instant, treating any value
 * without an explicit offset as Europe/Dublin local time. The model often
 * fabricates a "naked" timestamp from the user's natural-language ask
 * ("3pm today") — interpreting that as UTC produces a one-hour-off booking
 * during BST. By assuming Dublin-local for naked strings we recover the
 * intent the user actually expressed.
 */
function parseSlotStartFlexible(input: unknown): Date | null {
  if (typeof input !== 'string' || input.trim() === '') return null;
  const s = input.trim();
  if (HAS_OFFSET_RE.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  const m = NAIVE_DATETIME_RE.exec(s);
  if (m) {
    const [, y, mo, da, hh, mm, ss] = m;
    return dublinWallClockToInstant(
      Number(y),
      Number(mo),
      Number(da),
      Number(hh),
      Number(mm),
      Number(ss ?? '0')
    );
  }
  // Last-ditch: let JS try. If it parses, callers can still match by
  // Dublin local time downstream.
  const fallback = new Date(s);
  return isNaN(fallback.getTime()) ? null : fallback;
}

// ---------------------------------------------------------------------------
// Search helpers — used by search_businesses
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'near', 'any', 'some', 'this', 'that',
  'into', 'onto', 'from', 'find', 'book', 'show', 'show', 'get', 'one',
  'have', 'has', 'had', 'are', 'can', 'you', 'your', 'mine',
]);

/**
 * Strip PostgREST `.or()`-hostile characters from an ILIKE value.
 * Commas are clause separators, parens are grouping, percent expands the
 * wildcard, double-quotes break the parser. We keep letters, digits,
 * spaces and a small punctuation set the wire format tolerates.
 */
function sanitizeIlikeValue(s: string): string {
  return s.replace(/[%(),"`]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Split a free-text query into ILIKE-friendly tokens. Drops short and
 * stop words so "personal trainer at Evolv Performance" tokenises as
 * ['personal', 'trainer', 'evolv', 'performance'] — every meaningful
 * word can then OR-match against name, category, and description, so
 * "personal trainer" hits a business with category "Personal Training"
 * via the "personal" token.
 */
function tokenizeForIlike(q: string): string[] {
  if (!q) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of q.toLowerCase().split(/[^a-z0-9]+/i)) {
    if (raw.length < 3) continue;
    if (STOP_WORDS.has(raw)) continue;
    const safe = sanitizeIlikeValue(raw);
    if (!safe || seen.has(safe)) continue;
    seen.add(safe);
    out.push(safe);
  }
  return out;
}

export type ToolName =
  | 'search_businesses'
  | 'list_services'
  | 'get_availability'
  | 'propose_slot'
  | 'cancel_hold';

export const TOOL_DEFS = [
  {
    type: 'function' as const,
    function: {
      name: 'search_businesses',
      description:
        "Search live OpenBook businesses in Ireland. Returns at most 5 results, ranked by rating then name, INCLUDING each business's bookable services with service_id, name, duration_minutes, price_cents and description. The services array is pre-sorted by sort_order ascending — `services[0]` is the business's primary / headline service. Default to services[0] when the user requests a specific time without naming a service.\n\nWhen the user names a specific business (\"book me at Evolv Performance\", \"Yoga Flow Cork\", \"Refresh Barber\"), pass that name as `business_name` — the tool then does a direct name/slug ILIKE lookup and ignores `query`. Otherwise pass the user's free-text intent in `query` (\"personal trainer\", \"haircut Cork\", \"sauna tonight\") and the tool tokenises it for partial matching across name, category and description, so \"personal trainer\" matches a business with category \"Personal Training\".\n\nUse this once at the start of a booking conversation. Because services are returned alongside the business, you usually do NOT need to call list_services. Do not call search_businesses again after a business has been chosen unless the user explicitly asks to look at a different business.",
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              "Free-text intent — service type, category, or location. Examples: 'personal trainer', 'physio', 'haircut Cork'. Tokenised for partial matching against name, category, and description. Required (pass an empty string only when business_name is set).",
          },
          business_name: {
            type: 'string',
            description:
              "Optional. Pass when the user names a specific business (\"Evolv Performance\", \"Refresh Barber\"). Does a direct ILIKE lookup against businesses.name and businesses.slug and skips the keyword search.",
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_services',
      description:
        'List all bookable services for a given business. Use this after the user has chosen a business.',
      parameters: {
        type: 'object',
        properties: {
          business_id: { type: 'string', description: 'UUID of the business.' },
        },
        required: ['business_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_availability',
      description:
        "Check available time slots for a specific service on a specific date in Europe/Dublin. Returns each slot as `{ slot_start, slot_end, display_time, dublin_local }` where `slot_start` is a UTC ISO timestamp (the canonical instant), `display_time` is the human-readable Dublin time (e.g. '3:00 PM'), and `dublin_local` is the Dublin wall-clock (e.g. '15:00'). When the user asks for a specific time like '3pm', match it against `display_time` or `dublin_local` — never against the UTC offset in `slot_start`. Resolve every relative date the user mentions ('today', 'tomorrow', 'Friday') in Europe/Dublin, then pass YYYY-MM-DD.",
      parameters: {
        type: 'object',
        properties: {
          business_id: { type: 'string' },
          service_id: { type: 'string' },
          date: {
            type: 'string',
            description: 'YYYY-MM-DD in Europe/Dublin.',
          },
        },
        required: ['business_id', 'service_id', 'date'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'propose_slot',
      description:
        "Propose a specific slot to the user. The slot_start MUST be one of the `slot_start` UTC ISO values returned verbatim by a previous get_availability call — copy it character-for-character. Do not re-format, do not strip the offset, and do not construct your own timestamp from the user's natural-language time. The dispatcher can recover from a mis-formatted timestamp by matching the Dublin wall-clock, but a verbatim slot_start is always correct. Times are interpreted in Europe/Dublin; the displayed proposal will always show Dublin local time.",
      parameters: {
        type: 'object',
        properties: {
          business_id: { type: 'string' },
          service_id: { type: 'string' },
          slot_start: {
            type: 'string',
            description: 'ISO timestamp (with timezone).',
          },
        },
        required: ['business_id', 'service_id', 'slot_start'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'cancel_hold',
      description:
        'Release a slot the user explicitly backed out of after a booking was created.',
      parameters: {
        type: 'object',
        properties: { booking_id: { type: 'string' } },
        required: ['booking_id'],
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Argument validation
// ---------------------------------------------------------------------------

export function validateArgs(name: ToolName, args: any): string | null {
  if (!args || typeof args !== 'object') return 'invalid_args';
  switch (name) {
    case 'search_businesses': {
      const hasQuery =
        typeof args.query === 'string' && args.query.trim() !== '';
      const hasName =
        typeof args.business_name === 'string' &&
        args.business_name.trim() !== '';
      if (!hasQuery && !hasName) return 'query_required';
      return null;
    }
    case 'list_services':
      if (!UUID_RE.test(args.business_id ?? '')) return 'invalid_business_id';
      return null;
    case 'get_availability':
      if (!UUID_RE.test(args.business_id ?? '')) return 'invalid_business_id';
      if (!UUID_RE.test(args.service_id ?? '')) return 'invalid_service_id';
      if (!DATE_RE.test(args.date ?? '')) return 'invalid_date';
      return null;
    case 'propose_slot':
      if (!UUID_RE.test(args.business_id ?? '')) return 'invalid_business_id';
      if (!UUID_RE.test(args.service_id ?? '')) return 'invalid_service_id';
      if (typeof args.slot_start !== 'string' || isNaN(Date.parse(args.slot_start)))
        return 'invalid_slot_start';
      return null;
    case 'cancel_hold':
      if (!UUID_RE.test(args.booking_id ?? '')) return 'invalid_booking_id';
      return null;
  }
}

// ---------------------------------------------------------------------------
// Tool execution — each returns the JSON the model will see as a tool result.
// Special events the SSE stream should also surface (proposal, payment_required,
// confirmed, requires_auth, error) are returned alongside the model-visible
// result via the `event` field.
// ---------------------------------------------------------------------------

export type ToolStreamEvent =
  | {
      type: 'proposal';
      data: {
        business_id: string;
        service_id: string;
        business_name: string;
        service_name: string;
        slot_start: string;
        slot_end: string;
        price_cents: number;
        requires_payment: boolean;
      };
    }
  | {
      type: 'payment_required';
      data: { booking_id: string; payment_url: string; expires_at: string | null };
    }
  | { type: 'confirmed'; data: { booking_id: string } }
  | {
      type: 'requires_auth';
      data: {
        pending_proposal: {
          business_id: string;
          service_id: string;
          slot_start: string;
        };
      };
    }
  | { type: 'error'; data: { code: string; message: string } };

export interface ToolDispatchResult {
  modelResult: any;
  events: ToolStreamEvent[];
}

interface DispatchCtx {
  /** Public client carrying the user's session (RLS / auth.uid() inside RPCs). */
  userClient: SupabaseClient;
  /** Service-role client for non-auth-sensitive lookups + logging. */
  adminClient: SupabaseClient;
  /** Resolved customer id for the signed-in user; null when anonymous. */
  customerId: string | null;
  /** Origin for server-to-server calls into /api/checkout/create. */
  origin: string;
  /** Auth cookie header forwarded into /api/checkout/create. */
  cookieHeader: string;
}

export async function dispatchTool(
  name: ToolName,
  args: any,
  ctx: DispatchCtx
): Promise<ToolDispatchResult> {
  const events: ToolStreamEvent[] = [];

  switch (name) {
    case 'search_businesses': {
      const businessNameArg =
        typeof args.business_name === 'string' ? args.business_name.trim() : '';
      const queryArg =
        typeof args.query === 'string' ? args.query.trim() : '';

      let rawBusinesses: Array<{
        business_id: string;
        name: string;
        slug: string;
        category: string;
        primary_colour: string | null;
        address: string | null;
        rating: number | null;
        is_live: boolean;
      }> = [];

      // Path A — direct name/slug lookup. Used when the user named a
      // specific business ("book me at Evolv Performance"). The previous
      // RPC-only implementation went through a category+location filter
      // and missed exact-name asks like that entirely.
      if (businessNameArg) {
        const safe = sanitizeIlikeValue(businessNameArg);
        if (!safe) {
          return {
            modelResult: { businesses: [] },
            events,
          };
        }
        const { data, error } = await ctx.adminClient
          .from('businesses')
          .select(
            'id, name, slug, category, primary_colour, address, rating, is_live'
          )
          .eq('is_live', true)
          .or(`name.ilike.%${safe}%,slug.ilike.%${safe}%`)
          .order('rating', { ascending: false, nullsFirst: false })
          .order('name', { ascending: true })
          .limit(5);
        if (error) {
          events.push({
            type: 'error',
            data: { code: 'tool_error', message: error.message },
          });
          return { modelResult: { error: error.message }, events };
        }
        rawBusinesses = (data ?? []).map((b: any) => ({
          business_id: b.id,
          name: b.name,
          slug: b.slug,
          category: b.category,
          primary_colour: b.primary_colour,
          address: b.address,
          rating: b.rating,
          is_live: b.is_live,
        }));
      } else {
        // Path B — keyword search with token-level partial matching.
        // The previous RPC did `category ILIKE '%' || qcat || '%'` against
        // the whole query string, so "personal trainer" never matched a
        // business with category "Personal Training". Tokenise instead so
        // every meaningful word OR-matches against name, category and
        // description independently.
        const tokens = tokenizeForIlike(queryArg);
        let q = ctx.adminClient
          .from('businesses')
          .select(
            'id, name, slug, category, primary_colour, address, rating, is_live'
          )
          .eq('is_live', true);

        if (tokens.length > 0) {
          const clauses: string[] = [];
          for (const t of tokens) {
            clauses.push(`name.ilike.%${t}%`);
            clauses.push(`category.ilike.%${t}%`);
            clauses.push(`description.ilike.%${t}%`);
          }
          q = q.or(clauses.join(','));
        }

        const { data, error } = await q
          .order('rating', { ascending: false, nullsFirst: false })
          .order('name', { ascending: true })
          .limit(5);
        if (error) {
          events.push({
            type: 'error',
            data: { code: 'tool_error', message: error.message },
          });
          return { modelResult: { error: error.message }, events };
        }
        rawBusinesses = (data ?? []).map((b: any) => ({
          business_id: b.id,
          name: b.name,
          slug: b.slug,
          category: b.category,
          primary_colour: b.primary_colour,
          address: b.address,
          rating: b.rating,
          is_live: b.is_live,
        }));
      }

      // Pull active services for every returned business in a single
      // round-trip. Without this the model says "no specific services
      // listed" the moment a user asks "do they have a fade and how
      // much is it" — the search result alone has no service detail.
      let servicesByBusiness: Record<string, any[]> = {};
      const ids = rawBusinesses.map((b) => b.business_id).filter(Boolean);
      if (ids.length > 0) {
        const { data: svcRows, error: svcErr } = await ctx.adminClient
          .from('services')
          .select(
            'id, business_id, name, duration_minutes, price_cents, description, sort_order'
          )
          .in('business_id', ids)
          .eq('is_active', true)
          .order('sort_order', { ascending: true, nullsFirst: false });
        if (svcErr) {
          console.error('[search_businesses] services lookup failed', svcErr);
        } else {
          for (const row of svcRows ?? []) {
            const list = servicesByBusiness[row.business_id] ?? [];
            list.push({
              service_id: row.id,
              name: row.name,
              duration_minutes: row.duration_minutes,
              price_cents: row.price_cents,
              description: row.description ?? null,
            });
            servicesByBusiness[row.business_id] = list;
          }
        }
      }

      const businesses = rawBusinesses.map((b) => ({
        ...b,
        services: servicesByBusiness[b.business_id] ?? [],
      }));

      return { modelResult: { businesses }, events };
    }

    case 'list_services': {
      const { data, error } = await ctx.userClient.rpc('list_services_for_ai', {
        p_business_id: args.business_id,
      });
      if (error) {
        events.push({
          type: 'error',
          data: { code: 'tool_error', message: error.message },
        });
        return { modelResult: { error: error.message }, events };
      }
      return { modelResult: { services: data ?? [] }, events };
    }

    case 'get_availability': {
      const { data, error } = await ctx.userClient.rpc(
        'get_availability_for_ai',
        {
          p_business_id: args.business_id,
          p_service_id: args.service_id,
          p_date: args.date,
        }
      );
      if (error) {
        events.push({
          type: 'error',
          data: { code: 'tool_error', message: error.message },
        });
        return { modelResult: { error: error.message }, events };
      }
      // Enrich every slot with Dublin local display strings so the model
      // never has to convert UTC offsets in its head. The previous bug
      // pattern: model saw `slot_start: 14:00+00:00`, read that as "2pm"
      // (forgetting BST), and told the user there was no 3pm slot — even
      // though 14:00 UTC IS 3pm Dublin in summer. Now the model can match
      // user intent against `display_time` / `dublin_local` directly.
      const rawSlots = (data ?? []) as Array<{
        slot_start: string;
        slot_end: string;
      }>;
      const slots = rawSlots.map((s) => {
        const start = new Date(s.slot_start);
        const end = new Date(s.slot_end);
        return {
          slot_start: s.slot_start,
          slot_end: s.slot_end,
          display_time: dublinShortTime(start),
          display_end: dublinShortTime(end),
          dublin_local: dublinHHMMOf(start),
          dublin_date: dublinDateOf(start),
        };
      });
      return {
        modelResult: {
          slots,
          tz: DUBLIN_TZ,
          requested_date: args.date,
          note:
            'All times are Europe/Dublin. To match a user-requested time, compare against `display_time` (e.g. "3:00 PM") or `dublin_local` (e.g. "15:00"). When calling propose_slot, pass the matching `slot_start` value verbatim.',
        },
        events,
      };
    }

    case 'propose_slot': {
      // Look up names + duration + price for the proposal event.
      // Pull services.business_id too so we can cross-check the service
      // belongs to the claimed business — without that guard the model
      // can pair a service_id from one business with a business_id from
      // another, and the mismatch only surfaces later as a confusing
      // business_service_mismatch on /api/booking/confirm.
      const [{ data: biz }, { data: svc }] = await Promise.all([
        ctx.adminClient
          .from('businesses')
          .select('id, name')
          .eq('id', args.business_id)
          .maybeSingle(),
        ctx.adminClient
          .from('services')
          .select('id, name, duration_minutes, price_cents, business_id')
          .eq('id', args.service_id)
          .maybeSingle(),
      ]);
      if (!biz || !svc) {
        const msg = !biz ? 'business_not_found' : 'service_not_found';
        console.error('[propose_slot] lookup failed', {
          business_id: args.business_id,
          service_id: args.service_id,
          biz_found: Boolean(biz),
          svc_found: Boolean(svc),
        });
        events.push({ type: 'error', data: { code: msg, message: msg } });
        return { modelResult: { error: msg }, events };
      }
      if (svc.business_id !== biz.id) {
        const msg = 'business_service_mismatch';
        console.error('[propose_slot] business/service mismatch', {
          business_id: args.business_id,
          service_id: args.service_id,
          service_business_id: svc.business_id,
        });
        events.push({ type: 'error', data: { code: msg, message: msg } });
        return {
          modelResult: {
            error: msg,
            hint: 'That service does not belong to that business. Re-run list_services for the chosen business and propose a service that returns from there.',
          },
          events,
        };
      }

      // Parse the model-supplied slot_start tolerantly. A naked
      // "2026-05-06T15:00:00" is treated as Europe/Dublin local time
      // (so "3pm today" routes to the right UTC instant during BST).
      // Strings carrying an explicit offset are honoured as-is.
      const requested = parseSlotStartFlexible(args.slot_start);
      if (!requested) {
        const msg = 'invalid_slot_start';
        events.push({ type: 'error', data: { code: msg, message: msg } });
        return {
          modelResult: {
            error: msg,
            hint: 'slot_start must be one of the slot_start values returned by get_availability (UTC ISO with offset). Copy the value verbatim.',
          },
          events,
        };
      }

      // Validate the slot is actually one of the slots get_availability
      // returned for that Dublin date. Catches the model fabricating an
      // ISO string from a user-stated time (e.g. "3:15" → "15:15+00:00",
      // which is 4:15 PM Dublin during BST) rather than passing through
      // the verbatim slot from a prior get_availability result.
      const dublinDate = dublinDateOf(requested);
      const dublinHHMM = dublinHHMMOf(requested);
      const { data: availData } = await ctx.userClient.rpc(
        'get_availability_for_ai',
        {
          p_business_id: biz.id,
          p_service_id: svc.id,
          p_date: dublinDate,
        }
      );
      const availSlots = (availData ?? []) as Array<{ slot_start: string }>;
      const proposedInstant = requested.getTime();

      // First try an exact-instant match (the happy path: the model
      // copied a slot_start verbatim).
      let canonical = availSlots.find(
        (s) => new Date(s.slot_start).getTime() === proposedInstant
      );

      // Fall back to a Dublin-wall-clock match: same Dublin date, same
      // HH:MM. This recovers from the model passing "3pm" as a UTC
      // timestamp during BST (which is one hour off the canonical slot)
      // by matching on the local time the user actually meant. We never
      // silently shift the day — only the offset within the same Dublin
      // date — so we can't accidentally book the user a day later.
      if (!canonical) {
        canonical = availSlots.find((s) => {
          const d = new Date(s.slot_start);
          return (
            dublinDateOf(d) === dublinDate && dublinHHMMOf(d) === dublinHHMM
          );
        });
        if (canonical) {
          console.warn('[propose_slot] recovered via Dublin-local match', {
            requested: requested.toISOString(),
            dublin_local: `${dublinDate} ${dublinHHMM}`,
            canonical: canonical.slot_start,
          });
        }
      }

      if (!canonical) {
        const msg = 'slot_not_in_availability';
        console.error('[propose_slot] slot not in availability', {
          proposed: requested.toISOString(),
          dublin_date: dublinDate,
          dublin_local: dublinHHMM,
          available_count: availSlots.length,
          first_few: availSlots.slice(0, 6).map((s) => s.slot_start),
        });
        events.push({ type: 'error', data: { code: msg, message: msg } });
        return {
          modelResult: {
            error: msg,
            hint: `No slot at ${dublinHHMM} on ${dublinDate} (Europe/Dublin). Pick a slot_start verbatim from your most recent get_availability result and copy it character-for-character.`,
            available_today: availSlots.slice(0, 6).map((s) => ({
              slot_start: s.slot_start,
              dublin_local: dublinHHMMOf(new Date(s.slot_start)),
              display_time: dublinShortTime(new Date(s.slot_start)),
            })),
          },
          events,
        };
      }

      const start = new Date(canonical.slot_start);
      const end = new Date(start.getTime() + svc.duration_minutes * 60_000);
      const proposal = {
        business_id: biz.id,
        service_id: svc.id,
        business_name: biz.name,
        service_name: svc.name,
        slot_start: start.toISOString(),
        slot_end: end.toISOString(),
        price_cents: svc.price_cents,
        requires_payment: svc.price_cents > 0,
      };
      events.push({ type: 'proposal', data: proposal });
      // Pre-format the slot in Europe/Dublin and hand it to the model.
      // The model has been observed converting the +00:00 ISO string to
      // UTC text instead of BST, producing a 1-hour mismatch with the
      // ProposalCard (which uses Europe/Dublin via formatProposalTime).
      // The fix is to tell the model exactly what string to use.
      const displayTime = formatDublinTime(start);
      return {
        modelResult: {
          proposed: {
            ...proposal,
            display_time: displayTime,
            dublin_local: dublinHHMMOf(start),
            tz: DUBLIN_TZ,
          },
          note:
            `Proposal shown to user for ${displayTime} (Europe/Dublin). When you acknowledge, use that exact time string verbatim — do not re-format the ISO timestamp yourself. Your work is done for this booking; the UI handles confirmation deterministically. If the user wants a different time, propose another slot. Do not announce the booking as confirmed yourself.`,
        },
        events,
      };
    }

    case 'cancel_hold': {
      if (!ctx.customerId) {
        events.push({
          type: 'error',
          data: { code: 'requires_auth', message: 'Sign in required.' },
        });
        return { modelResult: { error: 'requires_auth' }, events };
      }
      const { data, error } = await ctx.userClient.rpc('cancel_hold_for_ai', {
        p_booking_id: args.booking_id,
      });
      if (error) {
        events.push({
          type: 'error',
          data: { code: 'cancel_failed', message: error.message },
        });
        return { modelResult: { error: error.message }, events };
      }
      return { modelResult: { booking: data ?? null }, events };
    }
  }
}
