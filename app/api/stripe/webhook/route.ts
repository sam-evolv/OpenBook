import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';
import { sendBookingConfirmation } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/stripe/webhook
 *
 * Receives Stripe webhook events. Verifies signatures, dedupes via
 * the stripe_events table, and applies guarded state transitions
 * to bookings. Sole writer for booking payment-state transitions.
 *
 * Always returns 2xx after processing (even for ignored event types)
 * so Stripe doesn't retry. The exception is signature verification
 * failure — that returns 400 because retrying won't fix it.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('stripe-webhook: STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 },
    );
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 },
    );
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error('stripe-webhook: signature verification failed', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 },
    );
  }

  const sb = supabaseAdmin();

  // 1. Idempotency: try to insert the event id. If a row with this id
  //    already exists, the unique-violation error code (23505) tells us
  //    we've already received this delivery — return 200 and bail.
  const { error: insertErr } = await sb
    .from('stripe_events')
    .insert({
      event_id: event.id,
      event_type: event.type,
    });

  if (insertErr) {
    if ((insertErr as { code?: string }).code === '23505') {
      console.log(`stripe-webhook: duplicate event ${event.id}, skipping`);
      return NextResponse.json({ received: true, deduped: true });
    }
    console.error('stripe-webhook: failed to record event', insertErr);
    return NextResponse.json({ error: 'Internal' }, { status: 500 });
  }

  // 2. Switch on event type. Each handler does a guarded UPDATE so
  //    out-of-order or replayed events are no-ops.
  let relatedBookingId: string | null = null;

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        relatedBookingId = (session.metadata?.booking_id as string) ?? null;

        if (!relatedBookingId) {
          console.warn(
            `stripe-webhook: ${event.id} missing booking_id metadata`,
          );
          break;
        }

        const paymentIntentId =
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? null;

        const customerEmail =
          session.customer_details?.email ?? session.customer_email ?? null;
        const customerName = session.customer_details?.name ?? null;
        const customerPhone = session.customer_details?.phone ?? null;

        // Guarded UPDATE: only confirms a booking that is currently
        // awaiting_payment. Replays / late deliveries against an
        // already-confirmed/cancelled/expired booking are no-ops.
        const { data: updatedBooking, error: bookingErr } = await sb
          .from('bookings')
          .update({
            status: 'confirmed',
            stripe_payment_intent_id: paymentIntentId,
          })
          .eq('id', relatedBookingId)
          .eq('status', 'awaiting_payment')
          .select('id, customer_id')
          .maybeSingle();

        if (bookingErr) {
          console.error('stripe-webhook: booking update failed', bookingErr);
          throw bookingErr;
        }

        if (
          updatedBooking?.customer_id &&
          (customerEmail || customerName || customerPhone)
        ) {
          // The customers table has both `full_name` and `name` columns
          // (legacy split). Mirror Stripe's name into both so all
          // existing read-paths see it.
          const customerUpdate: Record<string, string> = {};
          if (customerEmail) customerUpdate.email = customerEmail;
          if (customerName) {
            customerUpdate.full_name = customerName;
            customerUpdate.name = customerName;
          }
          if (customerPhone) customerUpdate.phone = customerPhone;

          const { error: custErr } = await sb
            .from('customers')
            .update(customerUpdate)
            .eq('id', updatedBooking.customer_id);

          if (custErr) {
            // Non-fatal: booking is already confirmed, customer
            // contact details are best-effort enrichment.
            console.error(
              'stripe-webhook: customer update failed (non-fatal)',
              custErr,
            );
          }
        }

        // Fire confirmation emails. Only when updatedBooking is non-null,
        // i.e. the guarded UPDATE actually flipped a row — replays / late
        // deliveries against an already-processed booking are silent
        // no-ops here too. Promise.allSettled + try/catch so a Resend
        // hiccup never causes a non-2xx response (which would make
        // Stripe retry the webhook and risk duplicate sends).
        if (updatedBooking?.id) {
          try {
            const results = await Promise.allSettled([
              sendBookingConfirmation({
                bookingId: updatedBooking.id,
                audience: 'customer',
              }),
              sendBookingConfirmation({
                bookingId: updatedBooking.id,
                audience: 'business',
              }),
            ]);
            for (const result of results) {
              if (result.status === 'rejected') {
                console.error('[webhook] confirmation email failed:', {
                  bookingId: updatedBooking.id,
                  eventId: event.id,
                  reason: result.reason,
                });
              }
            }
          } catch (emailErr) {
            // Belt-and-suspenders: allSettled shouldn't throw, but if
            // anything in the wrapper does (e.g. import-time issue),
            // swallow it so the webhook still returns 200.
            console.error('[webhook] email wrapper threw:', {
              bookingId: updatedBooking.id,
              eventId: event.id,
              error: emailErr,
            });
          }
        }

        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        relatedBookingId = (pi.metadata?.booking_id as string) ?? null;

        if (!relatedBookingId) break;

        await sb
          .from('bookings')
          .update({ status: 'payment_failed' })
          .eq('id', relatedBookingId)
          .eq('status', 'awaiting_payment');

        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        relatedBookingId = (session.metadata?.booking_id as string) ?? null;

        if (!relatedBookingId) break;

        await sb
          .from('bookings')
          .update({ status: 'expired' })
          .eq('id', relatedBookingId)
          .eq('status', 'awaiting_payment');

        break;
      }

      default:
        console.log(`stripe-webhook: ignoring event type ${event.type}`);
    }

    // 3. Mark the event as processed so we have an audit trail of
    //    what we actually handled vs. just received.
    await sb
      .from('stripe_events')
      .update({
        processed_at: new Date().toISOString(),
        related_booking: relatedBookingId,
      })
      .eq('event_id', event.id);

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('stripe-webhook: handler error', err);
    // Return 500 so Stripe retries. The event row is already in
    // stripe_events with processed_at=null, so we can audit later.
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }
}
