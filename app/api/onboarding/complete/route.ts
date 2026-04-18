import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/onboarding/complete
 * Body: { state: OnboardingState }
 *
 * The single "publish" action:
 * 1. Upserts services
 * 2. Upserts business_hours (7 rows)
 * 3. Flips business to is_live = true
 * 4. Marks owner.onboarding_completed
 */
export async function POST(req: NextRequest) {
  const sb = createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const { state } = await req.json();
  if (!state?.businessId) {
    return NextResponse.json({ error: 'No business to publish' }, { status: 400 });
  }

  // Verify ownership
  const { data: business } = await sb
    .from('businesses')
    .select('id, owner_id')
    .eq('id', state.businessId)
    .maybeSingle();

  if (!business || business.owner_id !== user.id) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  // 1. Services — clear existing + insert new
  await sb.from('services').delete().eq('business_id', state.businessId);
  const services = (state.services ?? [])
    .filter((s: any) => s.name?.trim())
    .map((s: any) => ({
      business_id: state.businessId,
      name: s.name.trim(),
      description: s.description || null,
      duration_minutes: s.duration_minutes || 60,
      price_cents: s.price_cents || 0,
      is_active: true,
    }));
  if (services.length) {
    const { error: svcErr } = await sb.from('services').insert(services);
    if (svcErr) {
      return NextResponse.json({ error: `Services: ${svcErr.message}` }, { status: 500 });
    }
  }

  // 2. Hours — upsert 7 rows keyed by (business_id, day_of_week)
  await sb.from('business_hours').delete().eq('business_id', state.businessId);
  const hoursRows = (state.hours ?? []).map((h: any) => ({
    business_id: state.businessId,
    day_of_week: h.day_of_week,
    open_time: h.is_closed ? null : h.open_time,
    close_time: h.is_closed ? null : h.close_time,
    is_closed: !!h.is_closed,
  }));
  if (hoursRows.length) {
    const { error: hrsErr } = await sb.from('business_hours').insert(hoursRows);
    if (hrsErr) {
      return NextResponse.json({ error: `Hours: ${hrsErr.message}` }, { status: 500 });
    }
  }

  // 3. Flip business live + update meta
  const { error: bizErr } = await sb
    .from('businesses')
    .update({
      is_live: true,
      name: state.name,
      tagline: state.tagline || null,
      about_long: state.about_long || null,
      founder_name: state.founder_name || null,
      phone: state.phone || null,
      website: state.website || null,
      address_line: state.address_line || null,
      primary_colour: state.primary_colour,
      secondary_colour: state.secondary_colour || null,
      socials: state.socials || {},
      logo_url: state.logo_url,
      processed_icon_url: state.processed_icon_url,
    })
    .eq('id', state.businessId);

  if (bizErr) {
    return NextResponse.json({ error: bizErr.message }, { status: 500 });
  }

  // 4. Mark owner complete
  await sb
    .from('owners')
    .update({
      onboarding_completed: true,
      onboarding_step: 7,
    })
    .eq('id', user.id);

  return NextResponse.json({ ok: true });
}
