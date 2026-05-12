import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, RateLimitError } from '@/lib/rate-limit';
import { fetchHomePins } from '@/lib/home-pins';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const POST_BODY = z.object({ businessId: z.string().uuid() });

const PIN_RATE_LIMIT_PER_MIN = 30;
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
};

/**
 * Resolve or mint the cookie-backed customer id. Mirrors the pattern in
 * /api/booking and /api/open-spots/[saleId]/claim so the surfaces stay
 * consistent. Returns the id plus a "newlyMinted" flag so the caller
 * knows whether to set the cookie before responding.
 */
async function resolveCustomerId(sb: ReturnType<typeof supabaseAdmin>): Promise<
  | { ok: true; customerId: string; newlyMinted: boolean }
  | { ok: false; status: number; error: string }
> {
  const cookieStore = await cookies();
  const existing = cookieStore.get('ob_customer_id')?.value ?? null;
  if (existing) return { ok: true, customerId: existing, newlyMinted: false };

  const { data: newCustomer, error: custErr } = await sb
    .from('customers')
    .insert({ full_name: 'Guest', email: null, phone: null })
    .select('id')
    .single();

  if (custErr || !newCustomer) {
    console.error('[home-pins] customer mint failed', custErr);
    return { ok: false, status: 500, error: 'server_error' };
  }

  return { ok: true, customerId: newCustomer.id as string, newlyMinted: true };
}

/**
 * POST /api/home-pins
 * Body: { businessId: string }
 *
 * Adds a business to the caller's home screen. Idempotent — pinning an
 * already-pinned business returns 200 instead of 201. Mints a guest
 * customer on first contact (same convention as /api/booking).
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => null);
    const body = POST_BODY.safeParse(rawBody);
    if (!body.success) {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }

    const sb = supabaseAdmin();

    const resolved = await resolveCustomerId(sb);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }
    const { customerId, newlyMinted } = resolved;

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

    const { data: business, error: bizErr } = await sb
      .from('businesses')
      .select('id, slug, name, category, primary_colour, logo_url, processed_icon_url, is_live')
      .eq('id', body.data.businessId)
      .maybeSingle();

    if (bizErr) {
      console.error('[home-pins] business lookup failed', bizErr);
      return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
    if (!business) {
      return NextResponse.json({ error: 'business_not_found' }, { status: 404 });
    }
    if (business.is_live !== true) {
      return NextResponse.json({ error: 'business_not_live' }, { status: 400 });
    }

    // Upsert with ignoreDuplicates returns the row only when actually
    // inserted; on conflict the .select() yields an empty array. That's
    // how we distinguish "new pin" (201) from "already pinned" (200).
    const { data: inserted, error: pinErr } = await sb
      .from('home_pins')
      .upsert(
        { customer_id: customerId, business_id: business.id },
        { onConflict: 'customer_id,business_id', ignoreDuplicates: true },
      )
      .select('business_id, pinned_at, notifications_enabled');

    if (pinErr) {
      console.error('[home-pins] upsert failed', pinErr);
      return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }

    const wasNewlyInserted = Array.isArray(inserted) && inserted.length > 0;
    const status = wasNewlyInserted ? 201 : 200;

    if (newlyMinted) {
      const cookieStore = await cookies();
      cookieStore.set('ob_customer_id', customerId, COOKIE_OPTS);
    }

    return NextResponse.json(
      {
        pinned: true,
        already_pinned: !wasNewlyInserted,
        business,
      },
      { status },
    );
  } catch (err) {
    console.error('[home-pins POST] unexpected', err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

/**
 * GET /api/home-pins
 * Returns the caller's pins ordered by pinned_at DESC, with the joined
 * business row hydrated for tile rendering. If no cookie / no customer,
 * returns an empty list — does NOT mint (mint is reserved for actions).
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const customerId = cookieStore.get('ob_customer_id')?.value;
    if (!customerId) {
      return NextResponse.json({ pins: [] }, { status: 200 });
    }

    const sb = supabaseAdmin();
    const pins = await fetchHomePins(sb, customerId);
    return NextResponse.json({ pins }, { status: 200 });
  } catch (err) {
    console.error('[home-pins GET] unexpected', err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
