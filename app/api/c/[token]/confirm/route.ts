import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyHoldToken } from '@/lib/mcp/tokens';
import { sendBookingConfirmation } from '@/lib/email';
import { getPaymentMode } from '@/lib/payments/payment-mode';
import { resolveOrCreateCustomer } from '@/lib/customers/resolve';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/c/[token]/confirm
//
// Auto-confirms an in-person booking. The customer's payment will happen at
// the business on the day; this route persists their contact details, flips
// the booking to status='confirmed', marks the hold completed, and fires
// the same confirmation emails the Stripe webhook would.
//
// Required body fields: name, email, phone (E.164 or local-formatted text).
// phone is required here even though MCP customer_hints.phone is optional,
// so the assistant can still issue a hold before the user shares a phone
// number; the page collects it before submission.
//
// The whole handler is wrapped in try/catch. Any uncaught exception
// returns 503 (degraded mode), never 500.

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function logHandlerException(err: unknown): void {
  console.error('[checkout/confirm] handler exception', {
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

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const payload = await verifyHoldToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
    }

    let body: { name?: string; email?: string; phone?: string; notes?: string };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }

    const name = (body.name ?? '').trim();
    const email = (body.email ?? '').trim().toLowerCase();
    const phone = (body.phone ?? '').trim();
    const notes = (body.notes ?? '').trim();

    const missing: string[] = [];
    if (!name) missing.push('name');
    if (!email || !EMAIL_RE.test(email)) missing.push('email');
    if (!phone) missing.push('phone');
    if (missing.length > 0) {
      return NextResponse.json(
        { error: 'missing_required_fields', required: ['name', 'email', 'phone'], missing },
        { status: 400 },
      );
    }

    const sb = supabaseAdmin();

    const { data: hold, error: holdErr } = await sb
      .from('mcp_holds')
      .select('id, status, expires_at, booking_id, source_assistant')
      .eq('id', payload.hold_id)
      .maybeSingle();
    if (holdErr) {
      console.error('[checkout/confirm] hold lookup failed', holdErr);
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
      console.error('[checkout/confirm] booking lookup failed', bookErr);
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
    if (mode !== 'in_person') {
      // Defensive: this endpoint only handles in-person confirmations.
      // stripe_now bookings go through create-payment-intent and the
      // Stripe webhook.
      return NextResponse.json({ error: 'wrong_payment_mode' }, { status: 400 });
    }

    // Resolve or create the customer row. Email is the natural key.
    // resolveOrCreateCustomer tolerates 0/1/many rows for the same email
    // because the customers table has no UNIQUE(email) constraint and
    // legitimate duplicates exist from auth flows.
    let customerId: string;
    let wasCreated: boolean;
    try {
      const resolved = await resolveOrCreateCustomer(sb, {
        email,
        fullName: name,
        phone,
      });
      customerId = resolved.id;
      wasCreated = resolved.was_created;
    } catch (err) {
      const e = err as { code?: string; message?: string; details?: string; hint?: string };
      console.error('[checkout/confirm] customer_resolve_failed', {
        email_provided: !!email,
        pg_code: e?.code,
        pg_message: e?.message,
        pg_details: e?.details,
        pg_hint: e?.hint,
      });
      return unavailable();
    }

    if (!wasCreated) {
      // Best-effort enrichment of the existing row. The booking row carries
      // its own customer_phone snapshot below, so a write failure here
      // doesn't block confirmation; we just log it now instead of silently
      // discarding the error.
      const { error: enrichErr } = await sb
        .from('customers')
        .update({
          full_name: name,
          name,
          phone,
        })
        .eq('id', customerId);
      if (enrichErr) {
        console.error('[checkout/confirm] customer_enrich_failed', {
          customer_id: customerId,
          pg_code: enrichErr.code,
          pg_message: enrichErr.message,
          pg_details: enrichErr.details,
          pg_hint: enrichErr.hint,
        });
      }
    }

    // Persist customer link + payment mode + phone snapshot, and flip the
    // booking to confirmed in the same UPDATE so we don't leave a row in
    // an intermediate state if the second write fails. In-person bookings
    // never enter Stripe, so this route is the sole writer for status.
    const sourceAssistant =
      typeof hold.source_assistant === 'string' ? hold.source_assistant : null;
    const { error: bookUpdateErr } = await sb
      .from('bookings')
      .update({
        customer_id: customerId,
        customer_phone: phone,
        notes: notes || null,
        payment_mode: 'in_person',
        source_assistant: sourceAssistant,
        status: 'confirmed',
      })
      .eq('id', booking.id)
      .in('status', ['pending_payment', 'pending']);
    if (bookUpdateErr) {
      console.error('[checkout/confirm] booking update failed', bookUpdateErr);
      return unavailable();
    }

    // Mark the hold as completed so the slot stops appearing in availability
    // queries while the booking is in place. Best-effort: a failure here is
    // non-fatal because the booking is already confirmed and the hold's
    // expiry sweep will clean up the row regardless.
    await sb.from('mcp_holds').update({ status: 'completed' }).eq('id', hold.id);

    // Confirmation emails to the customer and the business owner. Same
    // helper the Stripe webhook uses on payment_intent.succeeded so the
    // copy stays consistent across payment modes. Fire-and-forget; never
    // block the response on email delivery.
    Promise.allSettled([
      sendBookingConfirmation({ bookingId: booking.id, audience: 'customer' }),
      sendBookingConfirmation({ bookingId: booking.id, audience: 'business' }),
    ]).then((results) => {
      for (const r of results) {
        if (r.status === 'rejected') {
          console.error('[checkout/confirm] email failed', { booking: booking.id, reason: r.reason });
        }
      }
    });

    return NextResponse.json({
      reference: booking.id.slice(0, 8),
      booking_id: booking.id,
      status: 'confirmed',
      payment_mode: 'in_person',
      amount_due_at_business_cents: service.price_cents,
      amount_due_at_business_eur: service.price_cents / 100,
      is_free: service.price_cents === 0,
    });
  } catch (err) {
    logHandlerException(err);
    return unavailable();
  }
}
