import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyHoldToken } from '@/lib/mcp/tokens';
import { getStripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/c/[token]/finalise
//
// THIS ENDPOINT DOES NOT WRITE TO bookings. It is a UX accelerator only.
//
// Architecture: the existing Stripe webhook
// (app/api/webhooks/stripe/route.ts) is the SOLE writer for
// booking.status transitions and confirmation-email dispatch — for
// both Checkout Session and PaymentIntent flows. The webhook handles
// idempotency via the `stripe_events` table and remains the source of
// truth.
//
// This route exists so the client doesn't have to wait an unknown
// amount of time for the webhook to land before showing the confirmed
// state. Behaviour:
//
//   1. Read { payment_intent_id } from the body (free bookings don't call
//      finalise — create-payment-intent confirms them inline and the
//      client jumps straight to confirmed).
//   2. Verify the PaymentIntent with Stripe and confirm it succeeded
//      AND that its metadata.booking_id matches the booking we expect
//      from the token (defense against a stray client tying a different
//      payment to this hold).
//   3. Poll the bookings row for status='confirmed' up to 6 times at
//      500ms intervals (~3s total). The webhook is typically faster
//      than 500ms in practice; this gives it headroom on a cold edge
//      worker without making the request feel sluggish.
//   4. If confirmed within the window → return { confirmed: true,
//      booking: { ... } }.
//   5. If still 'awaiting_payment' after 3s → return { confirmed: false,
//      pending: true } and the client polls again on a longer interval.
//   6. If pi.status !== 'succeeded' → { confirmed: false, payment_failed:
//      true } so the client renders the decline state.
//
// Idempotency: the webhook's `.eq('status', 'awaiting_payment')` guard
// makes replays no-ops, and this route never UPDATEs anything — so even
// if both arrive concurrently the row converges to one state.

const POLL_ATTEMPTS = 6;
const POLL_INTERVAL_MS = 500;

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const payload = await verifyHoldToken(params.token);
  if (!payload) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
  }

  let body: { payment_intent_id?: string | null };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const paymentIntentId = body.payment_intent_id ?? null;

  // PI verification. We need this even though the client has just seen
  // succeeded() — a malicious client could lie about the PI's success
  // state to flip the UI without us catching the desync.
  if (paymentIntentId) {
    try {
      const pi = await getStripe().paymentIntents.retrieve(paymentIntentId);
      if (pi.metadata?.booking_id !== payload.booking_id) {
        // PI doesn't belong to this hold's booking. Refuse before we read
        // anything from the DB.
        return NextResponse.json({ error: 'mismatched_payment_intent' }, { status: 400 });
      }
      if (pi.status !== 'succeeded') {
        return NextResponse.json({
          confirmed: false,
          payment_failed: pi.status === 'requires_payment_method' || pi.status === 'canceled',
          status: pi.status,
        });
      }
    } catch (err) {
      console.error('[checkout/finalise] PI retrieve failed', err);
      return NextResponse.json({ error: 'payment_intent_lookup_failed' }, { status: 502 });
    }
  }

  // Poll the booking row. The webhook will set status='confirmed'.
  const sb = supabaseAdmin();
  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
    const { data: row, error } = await sb
      .from('bookings')
      .select('id, status, starts_at, ends_at')
      .eq('id', payload.booking_id)
      .maybeSingle();
    if (error) {
      console.error('[checkout/finalise] booking poll failed', error);
      return NextResponse.json({ error: 'internal' }, { status: 500 });
    }
    if (!row) {
      return NextResponse.json({ error: 'booking_not_found' }, { status: 404 });
    }
    if (row.status === 'confirmed') {
      return NextResponse.json({
        confirmed: true,
        booking_id: row.id,
        booking: {
          id: row.id,
          status: row.status,
          starts_at: row.starts_at,
          ends_at: row.ends_at,
        },
      });
    }
    if (row.status === 'cancelled' || row.status === 'expired' || row.status === 'payment_failed') {
      return NextResponse.json({
        confirmed: false,
        payment_failed: row.status === 'payment_failed',
        status: row.status,
      });
    }
    if (attempt < POLL_ATTEMPTS - 1) {
      await new Promise<void>((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
  }

  // Webhook hasn't landed yet — tell the client to poll again.
  return NextResponse.json({ confirmed: false, pending: true });
}
