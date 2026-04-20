import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') ?? '';
  const city = searchParams.get('city') ?? '';

  const sb = supabaseAdmin();
  let query = sb
    .from('businesses')
    .select(
      'id, slug, name, category, city, primary_colour, cover_image_url, logo_url, description, price_tier, rating, is_live'
    )
    .eq('is_live', true);

  if (q) {
    const term = q.toLowerCase();
    query = query.or(
      `name.ilike.%${term}%,category.ilike.%${term}%,description.ilike.%${term}%`
    );
  }
  if (city) query = query.ilike('city', `%${city}%`);

  const { data, error } = await query.order('name', { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ businesses: data ?? [] });
}
