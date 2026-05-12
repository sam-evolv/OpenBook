import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, RateLimitError } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUSINESS_ID = z.string().uuid();
const PATCH_BODY = z.object({ notifications_enabled: z.boolean() });

const PIN_RATE_LIMIT_PER_MIN = 30;

/**
 * Returns the customer id if a cookie is present, otherwise null. Unlike
 * the POST route on /api/home-pins, DELETE and PATCH never mint a guest
 * customer — there's no row to operate on without a prior pin.
 */
async function readCustomerId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('ob_customer_id')?.value ?? null;
}

/**
 * DELETE /api/home-pins/[businessId]
 * Removes a pin. Always 204 — deleting a non-existent pin is a no-op
 * so the client can fire-and-forget without checking state.
 */
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ businessId: string }> },
) {
  try {
    const { businessId: raw } = await ctx.params;
    const parsed = BUSINESS_ID.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_business_id' }, { status: 400 });
    }

    const customerId = await readCustomerId();
    if (!customerId) return new NextResponse(null, { status: 204 });

    try {
      checkRateLimit(`home-pins:${customerId}`, PIN_RATE_LIMIT_PER_MIN);
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

    const sb = supabaseAdmin();
    const { error } = await sb
      .from('home_pins')
      .delete()
      .eq('customer_id', customerId)
      .eq('business_id', parsed.data);

    if (error) {
      console.error('[home-pins DELETE] failed', error);
      return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error('[home-pins DELETE] unexpected', err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

/**
 * PATCH /api/home-pins/[businessId]
 * Body: { notifications_enabled: boolean }
 *
 * Used by the long-press menu's Notifications toggle. Cross-PR contract:
 * the standing-alerts trigger in PR 4b filters its push-sender by
 * EXISTS (… AND notifications_enabled = true) against this column.
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ businessId: string }> },
) {
  try {
    const { businessId: raw } = await ctx.params;
    const parsed = BUSINESS_ID.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_business_id' }, { status: 400 });
    }

    const rawBody = await req.json().catch(() => null);
    const body = PATCH_BODY.safeParse(rawBody);
    if (!body.success) {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }

    const customerId = await readCustomerId();
    if (!customerId) {
      return NextResponse.json({ error: 'pin_not_found' }, { status: 404 });
    }

    try {
      checkRateLimit(`home-pins:${customerId}`, PIN_RATE_LIMIT_PER_MIN);
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

    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from('home_pins')
      .update({ notifications_enabled: body.data.notifications_enabled })
      .eq('customer_id', customerId)
      .eq('business_id', parsed.data)
      .select('notifications_enabled')
      .maybeSingle();

    if (error) {
      console.error('[home-pins PATCH] failed', error);
      return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'pin_not_found' }, { status: 404 });
    }

    return NextResponse.json(
      { notifications_enabled: data.notifications_enabled },
      { status: 200 },
    );
  } catch (err) {
    console.error('[home-pins PATCH] unexpected', err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
