import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { addMinutes } from '@/lib/time';
import { sendBookingConfirmation } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/booking
 * Body: { serviceId, businessId, startAt }
 *
 * Creates a booking. If no customer session exists, generates a guest
 * customer row and sets ob_customer_id cookie. Validates the slot is
 * still free before inserting.
 *
 * Status decision:
 *   - Connect-ready business + paid service → status='awaiting_payment'
 *     and the client must complete Stripe Checkout. The webhook flips
 *     it to 'confirmed' on payment success.
 *   - Otherwise (no Connect, charges disabled, or free service) →
 *     status='confirmed' immediately (the cash/free fallback).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { serviceId, businessId, startAt } = body as {
      serviceId: string;
      businessId: string;
      startAt: string;
    };

    if (!serviceId || !businessId || !startAt) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const sb = supabaseAdmin();

    const { data: service } = await sb
      .from('services')
      .select('id, duration_minutes, price_cents, is_active')
      .eq('id', serviceId)
      .maybeSingle();

    if (!service || !service.is_active) {
      return NextResponse.json({ error: 'Service not available' }, { status: 404 });
    }

    const { data: business } = await sb
      .from('businesses')
      .select('id, stripe_account_id, stripe_charges_enabled')
      .eq('id', businessId)
      .maybeSingle();

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const start = new Date(startAt);
    const end = addMinutes(start, service.duration_minutes);

    // Re-check conflicts. 'awaiting_payment' is in the IN-list so an
    // in-flight Checkout holds the slot for the 15-min Stripe expiry.
    const { data: overlaps } = await sb
      .from('bookings')
      .select('id')
      .eq('business_id', businessId)
      .in('status', ['pending', 'confirmed', 'awaiting_payment'])
      .lt('starts_at', end.toISOString())
      .gt('ends_at', start.toISOString())
      .limit(1);

    if (overlaps && overlaps.length > 0) {
      return NextResponse.json(
        { error: 'That slot was just booked — please pick another.' },
        { status: 409 }
      );
    }

    // Resolve customer (guest flow if no session)
    const cookieStore = cookies();
    let customerId = cookieStore.get('ob_customer_id')?.value ?? null;

    if (!customerId) {
      const { data: newCustomer, error: custErr } = await sb
        .from('customers')
        .insert({
          full_name: 'Guest',
          email: null,
          phone: null,
        })
        .select('id')
        .single();

      if (custErr || !newCustomer) {
        return NextResponse.json(
          { error: 'Could not create customer record' },
          { status: 500 }
        );
      }
      customerId = newCustomer.id as string;
      cookieStore.set('ob_customer_id', customerId, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    const requiresPayment =
      Boolean(business.stripe_account_id) &&
      business.stripe_charges_enabled === true &&
      service.price_cents > 0;

    const status: 'awaiting_payment' | 'confirmed' = requiresPayment
      ? 'awaiting_payment'
      : 'confirmed';

    const { data: booking, error: bookErr } = await sb
      .from('bookings')
      .insert({
        business_id: businessId,
        service_id: serviceId,
        customer_id: customerId,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        status,
        price_cents: service.price_cents,
      })
      .select('id')
      .single();

    if (bookErr || !booking) {
      return NextResponse.json(
        { error: bookErr?.message ?? 'Booking failed' },
        { status: 500 }
      );
    }

    // Cash/free path: booking is already confirmed, fire the customer +
    // business emails. Paid path bookings (status='awaiting_payment') are
    // owned by the Stripe webhook — it sends emails when the session
    // completes and the customer record is enriched with Stripe details.
    //
    // Promise.allSettled so one failed email doesn't abort the other, and
    // a Resend hiccup must NEVER fail the user's booking — the row is
    // already in the DB.
    if (status === 'confirmed') {
      const results = await Promise.allSettled([
        sendBookingConfirmation({ bookingId: booking.id, audience: 'customer' }),
        sendBookingConfirmation({ bookingId: booking.id, audience: 'business' }),
      ]);
      for (const result of results) {
        if (result.status === 'rejected') {
          console.error('[booking] confirmation email failed:', {
            bookingId: booking.id,
            reason: result.reason,
          });
        }
      }
    }

    return NextResponse.json({
      bookingId: booking.id,
      requires_payment: requiresPayment,
      status,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
