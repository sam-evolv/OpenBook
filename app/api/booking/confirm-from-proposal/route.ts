import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendBookingConfirmation } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/booking/confirm-from-proposal
 *
 * Direct, deterministic confirmation path used by the consumer AI tab
 * after an OAuth round-trip resumes a proposal from localStorage.
 *
 * The agent loop is bypassed entirely here — the proposal already
 * carries the three IDs we need (business_id, service_id, slot_start),
 * and after sign-in the agent's `messages` array is empty, so asking
 * the model to call hold_and_book just makes it hallucinate UUIDs.
 *
 * Body: { business_id, service_id, slot_start }
 * Returns:
 *   { kind: 'confirmed', booking_id }                   — free path
 *   { kind: 'checkout',  booking_id, url, expires_at }  — paid path
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
    console.error('[confirm-from-proposal] auth resolve failed:', err);
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
    console.error('[confirm-from-proposal] service lookup failed:', svcError);
    return NextResponse.json({ error: 'service_lookup_failed' }, { status: 500 });
  }
  if (!svc || svc.is_active === false) {
    return NextResponse.json({ error: 'service_not_available' }, { status: 404 });
  }
  if (svc.business_id !== businessId) {
    return NextResponse.json({ error: 'business_service_mismatch' }, { status: 400 });
  }

  // Hold the slot. The RPC enforces auth via auth.uid() under the user client,
  // confirms free bookings inline, and parks paid bookings in awaiting_payment.
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
    console.error('[confirm-from-proposal] hold failed:', holdError);
    return NextResponse.json(
      { error: code, message: msg },
      { status: code === 'unauthenticated' ? 401 : 409 }
    );
  }

  const row = Array.isArray(holdData) ? holdData[0] : holdData;
  if (!row?.booking_id) {
    return NextResponse.json({ error: 'hold_failed' }, { status: 500 });
  }

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
            console.error('[confirm-from-proposal] email failed:', {
              bookingId,
              reason: result.reason,
            });
          }
        }
      });
    } catch (e) {
      console.error('[confirm-from-proposal] email dispatch threw:', e);
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
      error?: string;
    };
    if (!res.ok || !payload.checkout_url) {
      console.error(
        '[confirm-from-proposal] checkout/create failed:',
        res.status,
        payload
      );
      return NextResponse.json(
        { error: 'checkout_unavailable', detail: payload.error ?? null },
        { status: 502 }
      );
    }
    return NextResponse.json({
      kind: 'checkout',
      booking_id: row.booking_id,
      url: payload.checkout_url,
      expires_at: row.expires_at ?? null,
    });
  } catch (err: any) {
    console.error('[confirm-from-proposal] checkout fetch threw:', err);
    return NextResponse.json(
      { error: 'checkout_unavailable', message: err?.message ?? 'unknown' },
      { status: 502 }
    );
  }
}

function getOrigin(req: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  const host = req.headers.get('host') ?? 'app.openbook.ie';
  return `${proto}://${host}`;
}
