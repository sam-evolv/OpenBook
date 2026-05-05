import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getStripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface BookingRow {
  id: string;
  status: string | null;
  price_cents: number;
  starts_at: string;
  businesses: {
    id: string;
    name: string;
    slug: string;
    stripe_account_id: string | null;
    stripe_charges_enabled: boolean | null;
  } | null;
  services: {
    id: string;
    name: string;
    price_cents: number;
  } | null;
}

/**
 * POST /api/checkout/create
 * Body: { bookingId: string }
 *
 * Decides whether the booking needs payment and, if so, creates a
 * Stripe Checkout Session (destination charge to the connected
 * business). Returns the hosted Checkout URL or a no-op response
 * for cash/free flows.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as { bookingId?: unknown } | null;
    const bookingId = body?.bookingId;
    if (typeof bookingId !== 'string' || bookingId.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid bookingId' }, { status: 400 });
    }

    const sb = supabaseAdmin();
    const { data: booking } = await sb
      .from('bookings')
      .select(
        `
        id, status, price_cents, starts_at,
        businesses:business_id (
          id, name, slug,
          stripe_account_id, stripe_charges_enabled
        ),
        services:service_id (
          id, name, price_cents
        )
        `,
      )
      .eq('id', bookingId)
      .maybeSingle<BookingRow>();

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const business = booking.businesses;
    const service = booking.services;
    if (!business || !service) {
      return NextResponse.json({ error: 'Booking is missing business or service' }, { status: 409 });
    }

    // Confirmed bookings (legacy / free / cash flows) need no payment.
    if (booking.status === 'confirmed') {
      return NextResponse.json({
        requires_payment: false,
        checkout_url: null,
        booking_id: booking.id,
      });
    }

    // We only create a session for bookings explicitly awaiting payment.
    if (booking.status !== 'awaiting_payment') {
      return NextResponse.json(
        { error: 'Booking not in payable state' },
        { status: 409 },
      );
    }

    const requiresPayment =
      Boolean(business.stripe_account_id) &&
      business.stripe_charges_enabled === true &&
      service.price_cents > 0;

    console.log('[checkout/create] gating:', {
      booking_id: booking.id,
      booking_status: booking.status,
      price_cents: booking.price_cents,
      has_stripe_account: Boolean(business.stripe_account_id),
      charges_enabled: business.stripe_charges_enabled,
      requires_payment: requiresPayment,
    });

    if (!requiresPayment) {
      return NextResponse.json({
        requires_payment: false,
        checkout_url: null,
        booking_id: booking.id,
      });
    }

    const stripe = getStripe();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.openbook.ie';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            unit_amount: booking.price_cents,
            product_data: { name: service.name },
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        transfer_data: { destination: business.stripe_account_id! },
        metadata: {
          booking_id: booking.id,
          business_id: business.id,
        },
      },
      metadata: {
        booking_id: booking.id,
        business_id: business.id,
      },
      // Stripe enforces a 30-minute minimum on Checkout Session expires_at.
      // We align it with the booking's 30-minute hold so the two windows
      // close together and the user can't pay against an already-expired hold.
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      success_url: `${appUrl}/booking/confirm?id=${booking.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/booking/confirm?id=${booking.id}&cancelled=1`,
    });

    console.log('[checkout/create] stripe session created:', {
      booking_id: booking.id,
      session_id: session.id,
      has_url: Boolean(session.url),
    });

    return NextResponse.json({
      requires_payment: true,
      checkout_url: session.url,
      booking_id: booking.id,
    });
  } catch (err: any) {
    console.error('checkout/create:', err);
    return NextResponse.json(
      { error: err?.message ?? 'Unknown error' },
      { status: 500 },
    );
  }
}
