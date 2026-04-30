/**
 * Tool definitions + server-side dispatcher for the consumer
 * AI booking assistant. Read by app/api/ai/chat/route.ts only.
 *
 * Read-side tools (search/list/availability) are anon-callable
 * via RPC. Write-side tools (hold/cancel) require an authenticated
 * Supabase user; the agent loop intercepts hold_and_book when no
 * customer_id is present and surfaces a `requires_auth` SSE event.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { sendBookingConfirmation } from '@/lib/email';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type ToolName =
  | 'search_businesses'
  | 'list_services'
  | 'get_availability'
  | 'propose_slot'
  | 'hold_and_book'
  | 'cancel_hold';

export const TOOL_DEFS = [
  {
    type: 'function' as const,
    function: {
      name: 'search_businesses',
      description:
        'Search live OpenBook businesses in Ireland. Returns at most 5 results, ranked by rating then name. Use this when the user expresses booking intent. Call this once at the start of a booking conversation. Do not call it again after a business has been chosen.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              "What the user is looking for, e.g. 'physio', 'haircut', 'sauna'.",
          },
          category: {
            type: 'string',
            description:
              "Optional category filter, e.g. 'Health & Therapy', 'Hair & Beauty'.",
          },
          location: {
            type: 'string',
            description:
              "Optional location filter. Should be a city name like 'Cork' or 'Dublin', not a country. Matches against the business address as a substring. Only include this if the user explicitly mentions a city; do not infer 'ireland' or default to a location.",
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
        'Propose a specific slot to the user for confirmation. Does NOT book yet. Call this when you have narrowed to one slot and want the user to confirm.',
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
      name: 'hold_and_book',
      description:
        "Hold the slot and book it. For paid services this returns a Stripe Checkout URL the user must visit; the booking is held in 'awaiting_payment' for 10 minutes. For free services this confirms immediately. Only call after the user has confirmed the proposal in the UI (e.g. they sent 'yes, book it' or similar).",
      parameters: {
        type: 'object',
        properties: {
          business_id: { type: 'string' },
          service_id: { type: 'string' },
          slot_start: { type: 'string' },
        },
        required: ['business_id', 'service_id', 'slot_start'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'cancel_hold',
      description: 'Release a slot the user backed out of after hold_and_book.',
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
    case 'hold_and_book':
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
          category: args.category ?? null,
          location: args.location ?? null,
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
      return {
        modelResult: {
          proposed: proposal,
          note:
            'Proposal shown to user. Wait for explicit confirmation before calling hold_and_book.',
        },
        events,
      };
    }

    case 'hold_and_book': {
      if (!ctx.customerId) {
        const pending = {
          business_id: args.business_id,
          service_id: args.service_id,
          slot_start: args.slot_start,
        };
        events.push({ type: 'requires_auth', data: { pending_proposal: pending } });
        return {
          modelResult: {
            requires_auth: true,
            note:
              'User is not signed in. Tell them they need to sign in to confirm; the slot will be remembered.',
          },
          events,
        };
      }

      const { data, error } = await ctx.userClient.rpc('hold_slot_for_ai', {
        p_service_id: args.service_id,
        p_slot_start: args.slot_start,
      });

      if (error) {
        const code =
          error.message?.includes('slot_unavailable')
            ? 'slot_unavailable'
            : error.message?.includes('insufficient_privilege')
              ? 'requires_auth'
              : 'hold_failed';
        const userMsg =
          code === 'slot_unavailable'
            ? 'That slot was just taken — let me find another.'
            : code === 'requires_auth'
              ? 'You need to sign in to confirm this booking.'
              : 'Could not hold the slot. Please try again.';
        events.push({ type: 'error', data: { code, message: userMsg } });
        return { modelResult: { error: code, message: userMsg }, events };
      }

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        events.push({
          type: 'error',
          data: { code: 'hold_failed', message: 'No row returned from hold' },
        });
        return { modelResult: { error: 'hold_failed' }, events };
      }

      // Free booking — already confirmed inside the RPC.
      if (!row.requires_payment) {
        events.push({ type: 'confirmed', data: { booking_id: row.booking_id } });

        // Fire confirmation emails for free AI bookings. The Stripe webhook
        // owns the paid path; /api/booking owns cash/free non-AI bookings.
        // This branch is the only one that hits free AI bookings, so without
        // this the customer never hears back.
        //
        // Fire-and-forget Promise.allSettled — one failed send must not
        // abort the other, and a Resend hiccup must never fail the booking
        // (the row is already 'confirmed' in the DB). Mirror the wrapping
        // and logging in /api/booking.
        try {
          const bookingId = row.booking_id;
          Promise.allSettled([
            sendBookingConfirmation({ bookingId, audience: 'customer' }),
            sendBookingConfirmation({ bookingId, audience: 'business' }),
          ]).then((results) => {
            for (const result of results) {
              if (result.status === 'rejected') {
                console.error('[ai] confirmation email failed:', {
                  bookingId,
                  reason: result.reason,
                });
              }
            }
          });
        } catch (e) {
          console.error('[ai] confirmation email dispatch threw:', e);
        }

        return {
          modelResult: {
            booking_id: row.booking_id,
            status: 'confirmed',
            note:
              'Free booking confirmed immediately. Tell the user it is in their Bookings tab.',
          },
          events,
        };
      }

      // Paid — call the existing /api/checkout/create endpoint server-to-server.
      try {
        const res = await fetch(`${ctx.origin}/api/checkout/create`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            cookie: ctx.cookieHeader,
          },
          body: JSON.stringify({ bookingId: row.booking_id }),
        });
        const payload = (await res.json().catch(() => ({}))) as {
          requires_payment?: boolean;
          checkout_url?: string | null;
          error?: string;
        };
        if (!res.ok || !payload.checkout_url) {
          events.push({
            type: 'error',
            data: {
              code: 'checkout_unavailable',
              message:
                payload.error ?? 'Could not create payment session. Try again.',
            },
          });
          return {
            modelResult: { error: 'checkout_unavailable', detail: payload.error },
            events,
          };
        }
        events.push({
          type: 'payment_required',
          data: {
            booking_id: row.booking_id,
            payment_url: payload.checkout_url,
            expires_at: row.expires_at ?? null,
          },
        });
        return {
          modelResult: {
            booking_id: row.booking_id,
            status: 'awaiting_payment',
            payment_url: payload.checkout_url,
            expires_at: row.expires_at,
            note:
              'Payment required to confirm. Tell the user the slot is held for 10 minutes and they need to complete payment.',
          },
          events,
        };
      } catch (e: any) {
        events.push({
          type: 'error',
          data: {
            code: 'checkout_unavailable',
            message: 'Could not create payment session. Try again.',
          },
        });
        return { modelResult: { error: e?.message ?? 'checkout_failed' }, events };
      }
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
