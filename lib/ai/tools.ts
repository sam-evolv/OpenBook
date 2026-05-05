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

const DUBLIN_TIME_FMT = new Intl.DateTimeFormat('en-IE', {
  timeZone: 'Europe/Dublin',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
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
        "Search live OpenBook businesses in Ireland. Returns at most 5 results, ranked by rating then name. Pass the user's free-text query exactly — business name, service type, or both. Examples: 'Evolv', 'physio Cork', 'haircut', 'Yoga Flow Cork'. Use this once at the start of a booking conversation. Do not call it again after a business has been chosen.",
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              "What the user is looking for, e.g. 'physio', 'haircut', 'sauna'.",
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
        "Check available time slots for a specific service on a specific date. Returns ISO timestamps in UTC. Always use Europe/Dublin when reasoning about dates the user mentions ('tomorrow', 'Tuesday').",
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
        'Propose a specific slot to the user. The slot_start MUST be one of the slot_start values returned by a previous get_availability call — pass it through verbatim. Never construct your own ISO timestamp from a user-stated time; that will produce wrong-timezone bookings. Does NOT book yet — the UI confirms deterministically.',
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
    case 'search_businesses':
      if (typeof args.query !== 'string' || args.query.trim() === '')
        return 'query_required';
      return null;
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
      const { data, error } = await ctx.userClient.rpc(
        'search_businesses_for_ai',
        {
          query_text: args.query,
          category: null,
          location: null,
        }
      );
      if (error) {
        events.push({
          type: 'error',
          data: { code: 'tool_error', message: error.message },
        });
        return { modelResult: { error: error.message }, events };
      }
      return { modelResult: { businesses: data ?? [] }, events };
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
      return { modelResult: { slots: data ?? [] }, events };
    }

    case 'propose_slot': {
      // Look up names + duration + price for the proposal event.
      const [{ data: biz }, { data: svc }] = await Promise.all([
        ctx.adminClient
          .from('businesses')
          .select('id, name')
          .eq('id', args.business_id)
          .maybeSingle(),
        ctx.adminClient
          .from('services')
          .select('id, name, duration_minutes, price_cents')
          .eq('id', args.service_id)
          .maybeSingle(),
      ]);
      if (!biz || !svc) {
        const msg = !biz ? 'business_not_found' : 'service_not_found';
        events.push({ type: 'error', data: { code: msg, message: msg } });
        return { modelResult: { error: msg }, events };
      }
      const start = new Date(args.slot_start);
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
          proposed: { ...proposal, display_time: displayTime },
          note:
            `Proposal shown to user for ${displayTime}. When you acknowledge, use that exact time string verbatim — do not re-format the ISO timestamp yourself. Your work is done for this booking; the UI handles confirmation deterministically. If the user wants a different time, propose another slot. Do not announce the booking as confirmed yourself.`,
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
