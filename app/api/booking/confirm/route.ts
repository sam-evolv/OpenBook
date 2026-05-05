import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendBookingConfirmation } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/booking/confirm
 *
 * The single, deterministic confirmation path for the consumer AI tab.
 * The agent loop never calls hold_and_book — that tool was removed from
 * the model's surface after repeated UUID hallucinations. Instead, the
 * UI POSTs (business_id, service_id, slot_start) here directly from the
 * proposal card, and this endpoint runs the hold + free/paid branch.
 *
 * Body: { business_id, service_id, slot_start }
 * Returns:
 *   { kind: 'confirmed', booking_id }                   — free path
 *   { kind: 'checkout',  booking_id, url, expires_at }  — paid path
 *   401 { error: 'unauthenticated' }                    — UI shows AuthGate
 */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const businessId: string | undefined = body?.business_id;
  const serviceId: string | undefined = body?.service_id;
  const slotStart: string | undefined = body?.slot_start;

  if (!businessId || !serviceId || !slotStart) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  // Auth — must have a Supabase session and a customers row.
  const userClient = createSupabaseServerClient();
  let customerId: string | null = null;
  try {
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (user) {
      const { data } = await userClient.rpc('auth_customer_id');
      if (typeof data === 'string') customerId = data;
    }
  } catch (err) {
    console.error('[ai/confirm] auth resolve failed:', err);
  }
  if (!customerId) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const admin = supabaseAdmin();

  // Defense: confirm the service belongs to the claimed business and is active.
  // The hold RPC only takes service_id, so a tampered business_id wouldn't
  // change which row gets booked — but mismatch is a strong signal something
  // is wrong and we should reject loudly rather than silently re-bind.
  const { data: svc, error: svcError } = await admin
    .from('services')
    .select('id, business_id, price_cents, is_active')
    .eq('id', serviceId)
    .maybeSingle();
  if (svcError) {
    console.error('[ai/confirm] service lookup failed:', svcError);
    return NextResponse.json({ error: 'service_lookup_failed' }, { status: 500 });
  }
  if (!svc || svc.is_active === false) {
    return NextResponse.json({ error: 'service_not_available' }, { status: 404 });
  }
  if (svc.business_id !== businessId) {
    return NextResponse.json({ error: 'business_service_mismatch' }, { status: 400 });
  }

  // Stripe readiness pre-check for paid services. Without this, the RPC
  // happily creates an `awaiting_payment` booking and /api/checkout/create
  // then refuses (no checkout_url) — leaving an orphaned hold that blocks
  // the slot for 10 minutes and a 502 with no actionable detail.
  const isPaidService = (svc.price_cents ?? 0) > 0;
  if (isPaidService) {
    const { data: business, error: businessError } = await admin
      .from('businesses')
      .select('id, stripe_account_id, stripe_charges_enabled')
      .eq('id', businessId)
      .maybeSingle();
    if (businessError) {
      console.error('[ai/confirm] business lookup failed:', businessError);
      return NextResponse.json({ error: 'business_lookup_failed' }, { status: 500 });
    }
    const businessReady =
      Boolean(business?.stripe_account_id) &&
      business?.stripe_charges_enabled === true;
    if (!businessReady) {
      console.warn('[ai/confirm] payments not enabled for business:', {
        business_id: businessId,
        service_id: serviceId,
        has_stripe_account: Boolean(business?.stripe_account_id),
        charges_enabled: business?.stripe_charges_enabled ?? null,
        service_price_cents: svc.price_cents,
      });
      return NextResponse.json(
        {
          error: 'payments_not_enabled',
          message:
            "This business hasn't finished setting up online payments yet — please contact them directly.",
        },
        { status: 503 },
      );
    }
  }

  // Hold the slot. The RPC enforces auth via auth.uid() under the user client,
  // confirms free bookings inline, and parks paid bookings in awaiting_payment.
  console.log('[ai/confirm] hold_slot_for_ai inputs', {
    business_id: businessId,
    service_id: serviceId,
    slot_start: slotStart,
    customer_id: customerId,
  });
  const { data: holdData, error: holdError } = await userClient.rpc(
    'hold_slot_for_ai',
    { p_service_id: serviceId, p_slot_start: slotStart }
  );

  if (holdError) {
    const msg = holdError.message ?? '';
    let code = 'hold_failed';
    if (msg.includes('slot_unavailable')) code = 'slot_unavailable';
    else if (msg.includes('insufficient_privilege')) code = 'unauthenticated';
    else if (msg.includes('service_not_available')) code = 'service_not_available';
    // PostgrestError fields aren't always JSON-serialised by default — pull
    // every diagnostic the Postgres driver gives us so the actual cause
    // shows up in Vercel logs instead of "[object Object]".
    console.error('[ai/confirm] hold failed:', {
      classified_code: code,
      pg_code: holdError.code ?? null,
      message: holdError.message ?? null,
      details: holdError.details ?? null,
      hint: holdError.hint ?? null,
      business_id: businessId,
      service_id: serviceId,
      slot_start: slotStart,
      customer_id: customerId,
    });
    return NextResponse.json(
      { error: code, message: msg },
      { status: code === 'unauthenticated' ? 401 : 409 }
    );
  }

  const row = Array.isArray(holdData) ? holdData[0] : holdData;
  if (!row?.booking_id) {
    return NextResponse.json({ error: 'hold_failed' }, { status: 500 });
  }

  console.log('[ai/confirm] hold ok:', {
    booking_id: row.booking_id,
    requires_payment: row.requires_payment,
    expires_at: row.expires_at,
    price_cents: row.price_cents,
  });

  // Free path — already confirmed inside the RPC. Mirror lib/ai/tools.ts:
  // fire confirmation emails Promise.allSettled fire-and-forget so a Resend
  // hiccup never fails the booking.
  if (!row.requires_payment) {
    try {
      const bookingId = row.booking_id;
      Promise.allSettled([
        sendBookingConfirmation({ bookingId, audience: 'customer' }),
        sendBookingConfirmation({ bookingId, audience: 'business' }),
      ]).then((results) => {
        for (const result of results) {
          if (result.status === 'rejected') {
            console.error('[ai/confirm] email failed:', {
              bookingId,
              reason: result.reason,
            });
          }
        }
      });
    } catch (e) {
      console.error('[ai/confirm] email dispatch threw:', e);
    }

    return NextResponse.json({ kind: 'confirmed', booking_id: row.booking_id });
  }

  // Paid path — call /api/checkout/create internally with the user's cookies
  // so the existing Stripe Connect logic owns the session creation. Same
  // pattern as the agent's hold_and_book dispatch.
  const origin = getOrigin(req);
  try {
    const res = await fetch(`${origin}/api/checkout/create`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: req.headers.get('cookie') ?? '',
      },
      body: JSON.stringify({ bookingId: row.booking_id }),
    });
    const payload = (await res.json().catch(() => ({}))) as {
      checkout_url?: string;
      requires_payment?: boolean;
      error?: string;
    };
    if (!res.ok || !payload.checkout_url) {
      console.error('[ai/confirm] checkout/create returned no url:', {
        status: res.status,
        payload,
        booking_id: row.booking_id,
        business_id: businessId,
        service_id: serviceId,
      });
      await rollbackOrphanedHold(row.booking_id);
      return NextResponse.json(
        { error: 'checkout_unavailable', detail: payload.error ?? null },
        { status: 502 }
      );
    }
    console.log('[ai/confirm] checkout ok:', {
      booking_id: row.booking_id,
      has_url: Boolean(payload.checkout_url),
    });
    return NextResponse.json({
      kind: 'checkout',
      booking_id: row.booking_id,
      url: payload.checkout_url,
      expires_at: row.expires_at ?? null,
    });
  } catch (err: any) {
    console.error('[ai/confirm] checkout fetch threw:', {
      booking_id: row.booking_id,
      business_id: businessId,
      service_id: serviceId,
      message: err?.message ?? 'unknown',
      stack: err?.stack ?? null,
    });
    await rollbackOrphanedHold(row.booking_id);
    return NextResponse.json(
      { error: 'checkout_unavailable', message: err?.message ?? 'unknown' },
      { status: 502 }
    );
  }
}

/**
 * If checkout creation fails after the hold succeeded, the booking row is
 * stuck in `awaiting_payment` until the 10-minute sweeper picks it up,
 * blocking the slot for everyone else. Cancel it eagerly so the slot is
 * freed immediately.
 */
async function rollbackOrphanedHold(bookingId: string) {
  try {
    const { error } = await supabaseAdmin()
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: 'system',
      })
      .eq('id', bookingId)
      .eq('status', 'awaiting_payment');
    if (error) {
      console.error('[ai/confirm] orphan-hold rollback failed:', {
        booking_id: bookingId,
        message: error.message,
        code: error.code ?? null,
      });
    } else {
      console.log('[ai/confirm] orphan hold cancelled:', { booking_id: bookingId });
    }
  } catch (err: any) {
    console.error('[ai/confirm] orphan-hold rollback threw:', {
      booking_id: bookingId,
      message: err?.message ?? 'unknown',
    });
  }
}

function getOrigin(req: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  const host = req.headers.get('host') ?? 'app.openbook.ie';
  return `${proto}://${host}`;
}
