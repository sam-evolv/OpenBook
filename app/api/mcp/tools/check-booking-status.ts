// check_booking_status — the agentic loop.
// Spec: docs/mcp-server-spec.md section 5.6 ("the moat").
//
// The assistant calls this with the polling_token returned from
// hold_and_checkout. We verify the token, rate-limit per booking, look up
// the booking row, and return a status enum (+ rich details when confirmed)
// the assistant can use to follow up with the user.
//
// Performance budget: p95 < 150ms (spec section 14). Two Supabase queries
// in the worst case (booking on every call; customers only when confirmed).
// We intentionally don't cache — every poll could legitimately return a
// new status.

import {
  checkBookingStatusInput,
  checkBookingStatusOutput,
} from '../../../../lib/mcp/schemas';
import { supabaseAdmin } from '../../../../lib/supabase';
import { verifyPollingToken } from '../../../../lib/mcp/tokens';
import { checkPollingTokenRateLimit } from '../../../../lib/mcp/rate-limit';
import { wrapToolBoundary } from '../../../../lib/mcp/serialization';
import type { ToolContext, ToolHandler } from './index';

type BookingRow = {
  id: string;
  status: string | null;
  starts_at: string;
  ends_at: string;
  customer_id: string | null;
  notes: string | null;
  businesses: {
    id: string;
    name: string;
    slug: string;
    address_line: string | null;
    address: string | null;
    city: string | null;
    phone: string | null;
  } | null;
  services: {
    id: string;
    name: string;
    price_cents: number;
  } | null;
};

// Wire-format status mapping. The spec's enum is
// 'pending_payment' | 'confirmed' | 'expired' | 'failed'; the DB has a
// richer set ('pending', 'pending_payment', 'awaiting_payment',
// 'confirmed', 'cancelled', 'expired', 'payment_failed', ...). Anything
// that isn't a terminal state collapses to 'pending_payment' from the
// assistant's POV — the next poll will distinguish.
function toWireStatus(dbStatus: string | null): 'pending_payment' | 'confirmed' | 'expired' | 'failed' {
  switch (dbStatus) {
    case 'confirmed':
      return 'confirmed';
    case 'expired':
      return 'expired';
    case 'cancelled':
    case 'payment_failed':
      return 'failed';
    case 'pending_payment':
    case 'awaiting_payment':
    case 'pending':
    default:
      return 'pending_payment';
  }
}

const NEXT_STEP: Record<'pending_payment' | 'confirmed' | 'expired' | 'failed', string> = {
  confirmed: 'Confirmed. Want a calendar invite or directions?',
  pending_payment: 'Still on the checkout page — let me know when you have paid.',
  expired: 'The slot expired. I can find another time.',
  failed: 'The booking did not go through. Want to try again?',
};

const responseError = (code: string, message: string, extras: Record<string, unknown> = {}) => ({
  error: { code, message, ...extras },
});

function buildAddressForDirections(b: BookingRow['businesses']): string {
  if (!b) return '';
  // Spec asks for address_line + city + county; our schema has
  // address_line / address (legacy) / city. Build from what exists,
  // strip empty parts and stray commas.
  const line = (b.address_line ?? b.address ?? '').trim();
  const parts = [line, (b.city ?? '').trim()].filter((s) => s.length > 0);
  return parts.join(', ');
}

export const _checkBookingStatusImpl: ToolHandler = async (input, _ctx: ToolContext) => {
  const parsed = checkBookingStatusInput.parse(input);

  const tokenPayload = await verifyPollingToken(parsed.polling_token);
  // Expired and tampered tokens look the same to the assistant — the slot
  // is no longer reachable via this token, time to find alternatives.
  if (!tokenPayload) {
    return responseError('INVALID_TOKEN', 'Polling token is invalid or expired.');
  }

  const rate = await checkPollingTokenRateLimit(tokenPayload.booking_id);
  if (!rate.allowed) {
    return responseError(
      'POLLING_TOO_FREQUENT',
      'Polling rate exceeded. Wait a few minutes before checking again.',
    );
  }

  const supa = supabaseAdmin();
  const { data: booking, error } = await supa
    .from('bookings')
    .select(
      `
      id, status, starts_at, ends_at, customer_id, notes,
      businesses:business_id (
        id, name, slug, address_line, address, city, phone
      ),
      services:service_id ( id, name, price_cents )
      `,
    )
    .eq('id', tokenPayload.booking_id)
    .maybeSingle<BookingRow>();

  if (error) {
    console.error('[mcp.check_booking_status] booking lookup error', { error });
    return responseError('INTERNAL_ERROR', 'Failed to fetch booking.');
  }
  if (!booking) {
    return responseError('BOOKING_NOT_FOUND', 'Booking not found.');
  }
  if (!booking.businesses || !booking.services) {
    // booking exists but joins are stale/null — surface as not-found rather
    // than emit a half-formed response.
    return responseError('BOOKING_NOT_FOUND', 'Booking not found.');
  }

  const wireStatus = toWireStatus(booking.status);

  // Non-confirmed branches: just status + next_step_for_user.
  if (wireStatus !== 'confirmed') {
    const out = {
      status: wireStatus,
      next_step_for_user: NEXT_STEP[wireStatus],
    };
    const validation = checkBookingStatusOutput.safeParse(out);
    if (!validation.success) {
      console.error('[mcp.check_booking_status] response validation failed', validation.error.format());
      return responseError('RESPONSE_VALIDATION_FAILED', 'Internal error constructing status response.');
    }
    return validation.data;
  }

  // Confirmed branch — pull customer email so the assistant can confirm
  // "we sent the receipt to <email>" with authoritative state.
  let customerEmail: string | undefined;
  if (booking.customer_id) {
    const { data: customer } = await supa
      .from('customers')
      .select('email')
      .eq('id', booking.customer_id)
      .maybeSingle<{ email: string | null }>();
    if (customer?.email) customerEmail = customer.email;
  }

  // Note: we report the SERVICE STICKER price as price_paid_eur. The actual
  // settled amount may differ (deposits, promos, partial refunds); for v1
  // sticker price is sufficient and matches what the assistant told the
  // user during hold_and_checkout. Refine in v1.1 if/when we capture
  // amount_paid on the booking row.
  const business = booking.businesses;
  const service = booking.services;

  // Date construction can throw if the row is somehow malformed (legacy
  // data, schema drift). Surface as RESPONSE_VALIDATION_FAILED rather
  // than letting the assistant see a 500.
  let startIso: string;
  let endIso: string;
  try {
    startIso = new Date(booking.starts_at).toISOString();
    endIso = new Date(booking.ends_at).toISOString();
  } catch (err) {
    console.error('[mcp.check_booking_status] malformed timestamps', { booking_id: booking.id, err });
    return responseError('RESPONSE_VALIDATION_FAILED', 'Internal error constructing status response.');
  }

  const out = {
    status: 'confirmed' as const,
    booking: {
      booking_id: booking.id,
      business_name: business.name,
      business_slug: business.slug,
      service_name: service.name,
      start_iso: startIso,
      end_iso: endIso,
      price_paid_eur: service.price_cents / 100,
      address_for_directions: buildAddressForDirections(business),
      ...(business.phone ? { business_phone: business.phone } : {}),
      // cancellation_policy intentionally omitted — column doesn't exist
      // on services in the current schema (Appendix D).
      ...(customerEmail ? { confirmation_email_sent_to: customerEmail } : {}),
    },
    next_step_for_user: NEXT_STEP.confirmed,
  };

  const validation = checkBookingStatusOutput.safeParse(out);
  if (!validation.success) {
    console.error('[mcp.check_booking_status] response validation failed', validation.error.format());
    return responseError('RESPONSE_VALIDATION_FAILED', 'Internal error constructing status response.');
  }
  return validation.data;
};

export const checkBookingStatusHandler: ToolHandler = wrapToolBoundary(
  'check_booking_status',
  () => ({
    status: 'unknown',
    booking: null,
    notes: 'OpenBook booking status is temporarily unavailable. Please try again shortly.',
  }),
  _checkBookingStatusImpl,
);
