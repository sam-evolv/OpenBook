import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyHoldToken } from '@/lib/mcp/tokens';
import { getStripe } from '@/lib/stripe';
import { getPaymentMode } from '@/lib/payments/payment-mode';
import { resolveOrCreateCustomer } from '@/lib/customers/resolve';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/c/[token]/create-payment-intent
//
// Validates the hold token, resolves payment_mode, and either:
//
//   a) in_person path  - returns a shape telling the page to skip Stripe
//      and POST to /confirm. No body required, no customer write at this
//      step. Triggered for free services AND any business without
//      stripe_charges_enabled. The /confirm route does the booking write.
//
//   b) stripe_now path - existing behaviour. Resolves/creates the customer
//      row, persists customer_id + notes onto the booking, and creates a
//      Stripe PaymentIntent on the connected account. The Stripe webhook
//      remains the sole writer that flips status='confirmed' once the
//      payment_intent succeeds.
//
// The whole handler is wrapped in try/catch. Any uncaught exception
// returns 503 (degraded mode), never 500. Errors are logged with full
// detail (type, message, stack) so the previous truncated
// '[checkout/intent] customer ...' line that hid the underlying cause
// is replaced by something actionable.

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

function logHandlerException(err: unknown): void {
  console.error('[checkout/intent] handler exception', {
    error_type: err && typeof err === 'object' ? err.constructor?.name : typeof err,
    error_message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
}

function unavailable(): NextResponse {
  return NextResponse.json(
    { error: 'checkout_unavailable', message: 'Checkout is temporarily unavailable. Please try again.' },
    { status: 503 },
  );
}

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const payload = await verifyHoldToken(params.token);
    if (!payload) {
      return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
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
      return unavailable();
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
      return unavailable();
    }
    if (!booking || !booking.businesses || !booking.services) {
      return NextResponse.json({ error: 'booking_not_found' }, { status: 404 });
    }
    if (booking.status === 'confirmed') {
      return NextResponse.json({ error: 'already_confirmed' }, { status: 410 });
    }

    const business = booking.businesses;
    const service = booking.services;
    const mode = getPaymentMode(business, service);

    // In-person branch. The /confirm route handles the booking write so we
    // don't need name/email/phone here, no customer row is created until
    // the user actually submits the form. The page is expected to use
    // this response to render the in-person form (skipping Stripe Elements)
    // and POST to confirm_endpoint on submit.
    if (mode === 'in_person') {
      return NextResponse.json({
        payment_mode: 'in_person',
        payment_required_now: false,
        confirm_endpoint: `/api/c/${params.token}/confirm`,
        amount_due_at_business_cents: service.price_cents,
        amount_due_at_business_eur: service.price_cents / 100,
        is_free: service.price_cents === 0,
      });
    }

    // ── Stripe path from here on ──────────────────────────────────────────

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

    // Resolve or create the customer row. Email is the natural key. user_id
    // stays NULL on creation; the auth.users -> customers trigger backfills
    // it later if the same email signs in. resolveOrCreateCustomer tolerates
    // 0/1/many rows for the same email because the customers table has no
    // UNIQUE(email) constraint and legitimate duplicates exist from auth flows.
    let customerId: string;
    let wasCreated: boolean;
    try {
      const resolved = await resolveOrCreateCustomer(sb, {
        email,
        fullName: name,
        phone: phone || null,
      });
      customerId = resolved.id;
      wasCreated = resolved.was_created;
    } catch (err) {
      const e = err as { code?: string; message?: string; details?: string; hint?: string };
      console.error('[checkout/intent] customer_resolve_failed', {
        email_provided: !!email,
        pg_code: e?.code,
        pg_message: e?.message,
        pg_details: e?.details,
        pg_hint: e?.hint,
      });
      return unavailable();
    }

    if (!wasCreated) {
      // Best-effort enrichment for repeat anonymous customers. The booking
      // payload below carries the latest contact details, so a write
      // failure here doesn't block payment intent creation.
      const { error: enrichErr } = await sb
        .from('customers')
        .update({
          full_name: name,
          name,
          phone: phone || null,
        })
        .eq('id', customerId);
      if (enrichErr) {
        console.error('[checkout/intent] customer_enrich_failed', {
          customer_id: customerId,
          pg_code: enrichErr.code,
          pg_message: enrichErr.message,
          pg_details: enrichErr.details,
          pg_hint: enrichErr.hint,
        });
      }
    }

    // Persist customer link + notes on the booking. customer_id was nullable
    // for source='mcp' rows specifically so we could backfill at this step.
    // payment_mode is recorded here so the dashboard query and downstream
    // accounting know how this booking was paid.
    const { error: bookUpdateErr } = await sb
      .from('bookings')
      .update({
        customer_id: customerId,
        notes: notes || null,
        payment_mode: 'stripe_now',
      })
      .eq('id', booking.id);
    if (bookUpdateErr) {
      console.error('[checkout/intent] booking update failed', bookUpdateErr);
      return unavailable();
    }

    // Paid path - Stripe Connect PaymentIntent on the business's connected
    // account. transfer_data.destination matches /api/checkout/create so
    // funds settle on the connected account.
    if (!business.stripe_account_id || business.stripe_charges_enabled !== true) {
      // Defensive: getPaymentMode should have routed this to in_person
      // already. If we get here, the business state changed mid-request.
      return NextResponse.json({ error: 'payments_not_enabled' }, { status: 503 });
    }

    // Move the booking from 'pending_payment' -> 'awaiting_payment' so the
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
      return unavailable();
    }

    try {
      const stripe = getStripe();
      const intent = await stripe.paymentIntents.create({
        amount: service.price_cents,
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
        payment_mode: 'stripe_now',
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
  } catch (err) {
    logHandlerException(err);
    return unavailable();
  }
}
