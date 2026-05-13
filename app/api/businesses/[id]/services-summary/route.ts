/**
 * GET /api/businesses/[id]/services-summary
 *
 * Returns the max active-service price for a business, used by AlertSheet
 * to scale the "Max price" slider. Public — no auth, no rate limit beyond
 * Vercel's default.
 *
 * Response: { max_price_cents: number, service_count: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUSINESS_ID = z.string().uuid();

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: raw } = await ctx.params;
  const parsed = BUSINESS_ID.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_business_id' }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('services')
    .select('price_cents')
    .eq('business_id', parsed.data)
    .eq('is_active', true);

  if (error) {
    console.error('[services-summary] failed', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }

  const prices = (data ?? []).map((s) => s.price_cents).filter((p): p is number => typeof p === 'number');
  const maxPriceCents = prices.length > 0 ? Math.max(...prices) : 10_000; // €100 fallback

  return NextResponse.json({
    max_price_cents: maxPriceCents,
    service_count: prices.length,
  });
}
