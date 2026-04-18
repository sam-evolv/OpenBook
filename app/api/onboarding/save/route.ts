import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/onboarding/save
 * Body: { state, step }
 *
 * Upserts the owner's draft business row + step pointer. Idempotent.
 * Does NOT flip is_live or create services/hours — those happen in /complete.
 */
export async function POST(req: NextRequest) {
  const sb = createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const { state, step } = (await req.json()) as { state: any; step: number };

  // Upsert business row (one per owner during onboarding)
  let businessId = state.businessId as string | undefined;

  const businessPayload = {
    owner_id: user.id,
    name: state.name || 'Untitled',
    slug: state.slug,
    category: state.category,
    city: state.city,
    address_line: state.address_line || null,
    primary_colour: state.primary_colour,
    secondary_colour: state.secondary_colour || null,
    tagline: state.tagline || null,
    about_long: state.about_long || null,
    founder_name: state.founder_name || null,
    phone: state.phone || null,
    website: state.website || null,
    socials: state.socials || {},
    is_live: false, // stays hidden until /complete
  };

  if (businessId) {
    const { error } = await sb.from('businesses').update(businessPayload).eq('id', businessId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    // Slug collision check
    if (state.slug) {
      const { data: existing } = await sb
        .from('businesses')
        .select('id')
        .eq('slug', state.slug)
        .maybeSingle();
      if (existing) {
        // Append a short suffix to avoid collision
        businessPayload.slug = `${state.slug}-${Math.random().toString(36).slice(2, 6)}`;
      }
    }
    const { data, error } = await sb
      .from('businesses')
      .insert(businessPayload)
      .select('id, slug')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    businessId = data.id;
  }

  // Update owner step pointer
  await sb.from('owners').update({ onboarding_step: step }).eq('id', user.id);

  return NextResponse.json({ businessId, slug: businessPayload.slug });
}
