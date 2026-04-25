import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { addMinutes } from '@/lib/time';
import { hasResend } from '@/lib/integrations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/booking
 * Body: {
 *   serviceId, businessId, startAt,
 *   customer?: { name?, email?, phone? }
 * }
 *
 * Creates a booking. If customer details are supplied they are written
 * onto the customers row so the dashboard surfaces a real name instead
 * of "Guest". Without details we fall back to the cookie-bound guest
 * customer.
 *
 * Free / manual booking flow: the booking is inserted with
 * `status: 'confirmed'` regardless of whether Stripe is configured.
 * Email confirmations are best-effort — if RESEND_API_KEY isn't set we
 * log the skip and still return success.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { serviceId, businessId, startAt, customer } = body as {
      serviceId: string;
      businessId: string;
      startAt: string;
      customer?: { name?: string; email?: string; phone?: string };
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

    const start = new Date(startAt);
    const end = addMinutes(start, service.duration_minutes);

    // Re-check conflicts — someone might have booked this slot since the client fetched it
    const { data: overlaps } = await sb
      .from('bookings')
      .select('id')
      .eq('business_id', businessId)
      .in('status', ['pending', 'confirmed'])
      .lt('starts_at', end.toISOString())
      .gt('ends_at', start.toISOString())
      .limit(1);

    if (overlaps && overlaps.length > 0) {
      return NextResponse.json(
        { error: 'That slot was just booked — please pick another.' },
        { status: 409 }
      );
    }

    const cleanName = customer?.name?.trim() ?? '';
    const cleanEmail = customer?.email?.trim() ?? '';
    const cleanPhone = customer?.phone?.trim() ?? '';

    // Resolve customer (cookie-based reuse, otherwise create)
    const cookieStore = cookies();
    let customerId = cookieStore.get('ob_customer_id')?.value ?? null;

    if (customerId) {
      // Patch the existing customer row with whatever new details the
      // user just supplied so subsequent bookings show their real name.
      const patch: Record<string, string> = {};
      if (cleanName) patch.full_name = cleanName;
      if (cleanEmail) patch.email = cleanEmail;
      if (cleanPhone) patch.phone = cleanPhone;
      if (Object.keys(patch).length > 0) {
        await sb.from('customers').update(patch).eq('id', customerId);
      }
    } else {
      const { data: newCustomer, error: custErr } = await sb
        .from('customers')
        .insert({
          full_name: cleanName || 'Guest',
          email: cleanEmail || null,
          phone: cleanPhone || null,
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

    const { data: booking, error: bookErr } = await sb
      .from('bookings')
      .insert({
        business_id: businessId,
        service_id: serviceId,
        customer_id: customerId,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        status: 'confirmed',
        price_cents: service.price_cents,
        source: 'consumer',
      })
      .select('id')
      .single();

    if (bookErr || !booking) {
      return NextResponse.json(
        { error: bookErr?.message ?? 'Booking failed' },
        { status: 500 }
      );
    }

    // Best-effort email confirmation. Resend isn't wired yet — we just
    // log the skip so production logs show the booking was created and
    // intentionally not emailed. When RESEND_API_KEY is added, plug the
    // sender in here.
    if (!hasResend()) {
      console.info(
        `[booking] created ${booking.id} — email confirmation skipped (RESEND_API_KEY not configured)`,
      );
    }

    return NextResponse.json({ bookingId: booking.id });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
