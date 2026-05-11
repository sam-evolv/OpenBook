import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, RateLimitError } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/open-spots/[saleId]/claim
 * Body: { payment_mode: 'stripe_now' | 'in_person' }
 *
 * Atomically claims a flash-sale spot via the `claim_flash_sale_spot` RPC.
 * Mints a guest customer on first contact (same cookie convention as
 * /api/booking). Returns the new booking id; the client island then
 * delegates to /api/checkout/create for paid mode or jumps straight to
 * /booking/confirm for in-person mode.
 */

const SALE_ID_SCHEMA = z.string().uuid();

const BODY_SCHEMA = z.object({
  payment_mode: z.enum(['stripe_now', 'in_person']),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ saleId: string }> },
) {
  try {
    const { saleId: rawSaleId } = await ctx.params;
    const saleId = SALE_ID_SCHEMA.safeParse(rawSaleId);
    if (!saleId.success) {
      return NextResponse.json({ error: 'invalid_sale_id' }, { status: 400 });
    }

    const rawBody = await req.json().catch(() => null);
    const body = BODY_SCHEMA.safeParse(rawBody);
    if (!body.success) {
      return NextResponse.json(
        { error: 'invalid_payment_mode' },
        { status: 400 },
      );
    }

    console.log('[open-spots.claim] hit', {
      saleId: saleId.data,
      payment_mode: body.data.payment_mode,
    });

    const sb = supabaseAdmin();

    const cookieStore = await cookies();
    let customerId = cookieStore.get('ob_customer_id')?.value ?? null;
    let mintedNewCustomer = false;

    if (!customerId) {
      const { data: newCustomer, error: custErr } = await sb
        .from('customers')
        .insert({ full_name: 'Guest', email: null, phone: null })
        .select('id')
        .single();

      if (custErr || !newCustomer) {
        console.error('[open-spots.claim] customer mint failed', custErr);
        return NextResponse.json({ error: 'server_error' }, { status: 500 });
      }
      customerId = newCustomer.id as string;
      mintedNewCustomer = true;
    }

    try {
      checkRateLimit(customerId);
    } catch (err) {
      if (err instanceof RateLimitError) {
        return NextResponse.json(
          { error: 'rate_limited' },
          {
            status: 429,
            headers: { 'Retry-After': String(err.retryAfterSeconds) },
          },
        );
      }
      throw err;
    }

    const { data, error } = await sb.rpc('claim_flash_sale_spot', {
      p_sale_id: saleId.data,
      p_customer_id: customerId,
      p_payment_mode: body.data.payment_mode,
    });

    if (error) {
      switch (error.code) {
        case 'P0001':
          return NextResponse.json({ error: 'sold_out' }, { status: 410 });
        case 'P0002':
          return NextResponse.json(
            { error: 'phone_required' },
            { status: 422 },
          );
        case '22023':
          return NextResponse.json(
            { error: 'invalid_payment_mode' },
            { status: 400 },
          );
        default:
          console.error('[open-spots.claim] rpc error', error);
          return NextResponse.json({ error: 'server_error' }, { status: 500 });
      }
    }

    const bookingId = typeof data === 'string' ? data : null;
    if (!bookingId) {
      console.error('[open-spots.claim] rpc returned no booking id', { data });
      return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }

    if (mintedNewCustomer) {
      cookieStore.set('ob_customer_id', customerId, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    return NextResponse.json({ booking_id: bookingId }, { status: 200 });
  } catch (err) {
    console.error('[open-spots.claim] unexpected', err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
