import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyHoldToken } from '@/lib/mcp/tokens';
import { getStripe } from '@/lib/stripe';
import { sendBookingConfirmation } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/c/[token]/create-payment-intent
//
// Validates the hold token, resolves/creates the customer row, persists
// the customer's contact details + notes onto the booking, and either
//
//   a) free path  — flips status='confirmed' inline and fires emails (the
//      same path the existing /api/booking route uses for free bookings),
//   b) paid path  — creates a Stripe PaymentIntent on the connected account
//      and returns the client_secret. The Stripe webhook is the sole writer
//      that flips the booking to 'confirmed' once the PaymentIntent succeeds.
//
// Returns 410 Gone if the hold has already expired.

type BookingRow = {
  id: string;
  status: string | null;
  source: string | null;
  starts_at: string;
  businesses: {
    id: string;
    name: string;
    stripe_account_id: string | null;
    stripe_charges_enabled: boolean | null;
  } | null;
  services: {
    id: string;
    name: string;
    price_cents: number;
  } | null;
};

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const payload = await verifyHoldToken(params.token);
  if (!payload) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
  }

  let body: { email?: string; name?: string; phone?: string; notes?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const name = (body.name ?? '').trim();
  const phone = (body.phone ?? '').trim();
  const notes = (body.notes ?? '').trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }

  const sb = supabaseAdmin();

  // Hold must still be pending and not yet expired.
  const { data: hold, error: holdErr } = await sb
    .from('mcp_holds')
    .select('id, status, expires_at, booking_id')
    .eq('id', payload.hold_id)
    .maybeSingle();
  if (holdErr) {
    console.error('[checkout/intent] hold lookup failed', holdErr);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
  if (!hold || !hold.booking_id || hold.status !== 'pending') {
    return NextResponse.json({ error: 'hold_unavailable' }, { status: 410 });
  }
  if (new Date(hold.expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: 'hold_expired' }, { status: 410 });
  }

  const { data: booking, error: bookErr } = await sb
    .from('bookings')
    .select(
      `
      id, status, source, starts_at,
      businesses:business_id (
        id, name, stripe_account_id, stripe_charges_enabled
      ),
      services:service_id ( id, name, price_cents )
      `,
    )
    .eq('id', hold.booking_id)
    .maybeSingle<BookingRow>();
  if (bookErr) {
    console.error('[checkout/intent] booking lookup failed', bookErr);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
  if (!booking || !booking.businesses || !booking.services) {
    return NextResponse.json({ error: 'booking_not_found' }, { status: 404 });
  }
  if (booking.status === 'confirmed') {
    return NextResponse.json({ error: 'already_confirmed' }, { status: 410 });
  }

  // Resolve or create the customer row. Email is the natural key — the
  // existing schema indexes customers.email so this is cheap. user_id stays
  // NULL on creation; the auth.users → customers trigger backfills it later
  // if the same email signs in.
  const { data: existingCustomer, error: custLookupErr } = await sb
    .from('customers')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (custLookupErr) {
    console.error('[checkout/intent] customer lookup failed', custLookupErr);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }

  let customerId = existingCustomer?.id ?? null;
  if (!customerId) {
    const { data: created, error: createErr } = await sb
      .from('customers')
      .insert({
        email,
        full_name: name,
        name,
        phone: phone || null,
      })
      .select('id')
      .single();
    if (createErr || !created) {
      console.error('[checkout/intent] customer create failed', createErr);
      return NextResponse.json({ error: 'customer_create_failed' }, { status: 500 });
    }
    customerId = created.id;
  } else {
    // Best-effort enrichment for repeat anonymous customers — keep silent
    // if it fails, the booking-confirm email still has the booking-time data.
    await sb
      .from('customers')
      .update({
        full_name: name,
        name,
        phone: phone || null,
      })
      .eq('id', customerId);
  }

  // Persist customer link + notes on the booking. customer_id was nullable
  // for source='mcp' rows specifically so we could backfill at this step.
  const { error: bookUpdateErr } = await sb
    .from('bookings')
    .update({
      customer_id: customerId,
      notes: notes || null,
    })
    .eq('id', booking.id);
  if (bookUpdateErr) {
    console.error('[checkout/intent] booking update failed', bookUpdateErr);
    return NextResponse.json({ error: 'booking_update_failed' }, { status: 500 });
  }

  // Free path — flip the booking to confirmed inline + fire emails.
  // Free MCP bookings never enter Stripe at all, so the webhook never sees
  // a payment_intent for them. This must be the writer for status='confirmed'
  // on the free MCP path.
  if (booking.services.price_cents === 0) {
    const { error: confirmErr } = await sb
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', booking.id)
      .in('status', ['pending_payment', 'pending']);
    if (confirmErr) {
      console.error('[checkout/intent] free confirm failed', confirmErr);
      return NextResponse.json({ error: 'confirm_failed' }, { status: 500 });
    }
    await sb.from('mcp_holds').update({ status: 'completed' }).eq('id', hold.id);

    Promise.allSettled([
      sendBookingConfirmation({ bookingId: booking.id, audience: 'customer' }),
      sendBookingConfirmation({ bookingId: booking.id, audience: 'business' }),
    ]).then((results) => {
      for (const r of results) {
        if (r.status === 'rejected') {
          console.error('[checkout/intent] free email failed', { booking: booking.id, reason: r.reason });
        }
      }
    });

    return NextResponse.json({
      is_free: true,
      confirmed: true,
      booking_id: booking.id,
    });
  }

  // Paid path — Stripe Connect PaymentIntent on the business's connected
  // account. transfer_data.destination matches the existing /api/checkout/create
  // pattern so funds settle on the connected account.
  const business = booking.businesses;
  if (!business.stripe_account_id || business.stripe_charges_enabled !== true) {
    return NextResponse.json({ error: 'payments_not_enabled' }, { status: 503 });
  }

  // Move the booking from 'pending_payment' → 'awaiting_payment' so the
  // existing webhook's guarded UPDATE
  // (`.eq('status', 'awaiting_payment')`) flips it to 'confirmed' on
  // payment_intent.succeeded. Without this status hand-off the webhook's
  // guard would no-op and the booking would be stuck.
  const { error: statusErr } = await sb
    .from('bookings')
    .update({ status: 'awaiting_payment' })
    .eq('id', booking.id)
    .eq('status', 'pending_payment');
  if (statusErr) {
    console.error('[checkout/intent] status hand-off failed', statusErr);
    return NextResponse.json({ error: 'status_handoff_failed' }, { status: 500 });
  }

  try {
    const stripe = getStripe();
    const intent = await stripe.paymentIntents.create({
      amount: booking.services.price_cents,
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
      transfer_data: { destination: business.stripe_account_id },
      receipt_email: email,
      metadata: {
        booking_id: booking.id,
        business_id: business.id,
        hold_id: hold.id,
        source: 'mcp',
      },
    });

    return NextResponse.json({
      is_free: false,
      client_secret: intent.client_secret,
      payment_intent_id: intent.id,
    });
  } catch (err: unknown) {
    console.error('[checkout/intent] PaymentIntent create failed', err);
    // Roll the booking status back so the user (or another tab) can retry
    // without being stuck in awaiting_payment.
    await sb
      .from('bookings')
      .update({ status: 'pending_payment' })
      .eq('id', booking.id)
      .eq('status', 'awaiting_payment');
    return NextResponse.json({ error: 'payment_intent_failed' }, { status: 502 });
  }
}
