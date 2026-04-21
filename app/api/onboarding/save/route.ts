import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/onboarding/save
 * Body: { state, step }
 *
 * Persists business + services + hours on every save so resuming onboarding
 * (or refreshing the page) doesn't lose progress. Uses upsert patterns for
 * safety against duplicates.
 */
export async function POST(req: NextRequest) {
  const sb = createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const { state, step } = await req.json();
  if (!state) return NextResponse.json({ error: 'Missing state' }, { status: 400 });

  /* --- 1. Upsert the business row --- */
  const hasAnyContent =
    state.name?.trim() ||
    state.slug?.trim() ||
    state.tagline?.trim() ||
    state.about_long?.trim() ||
    state.logo_url ||
    state.hero_image_url ||
    (state.services?.length ?? 0) > 0;

  if (!hasAnyContent) {
    return NextResponse.json({ ok: true, skipped: 'empty-state' });
  }

  let businessId: string | null = state.businessId ?? null;

  const businessPayload: any = {
    owner_id: user.id,
    name: state.name?.trim() || null,
    category: state.category || null,
    city: state.city || null,
    address_line: state.address_line || null,
    primary_colour: state.primary_colour || 'gold',
    secondary_colour: state.secondary_colour || null,
    logo_url: state.logo_url ?? null,
    processed_icon_url: state.processed_icon_url ?? null,
    hero_image_url: state.hero_image_url ?? null,
    gallery_urls: state.gallery_urls ?? [],
    tagline: state.tagline?.trim() || null,
    about_long: state.about_long?.trim() || null,
    founder_name: state.founder_name?.trim() || null,
    phone: state.phone?.trim() || null,
    website: state.website?.trim() || null,
    socials: state.socials ?? {},
    is_live: false, // Never flip to true here; publish flow handles that
  };

  /* Slug handling: if user provided one, check for collisions */
  let finalSlug: string | null = null;
  if (state.slug?.trim()) {
    finalSlug = state.slug.trim().toLowerCase();
    /* Check if another user's business has this slug */
    if (businessId) {
      const { data: existing } = await sb
        .from('businesses')
        .select('id, owner_id')
        .eq('slug', finalSlug)
        .neq('id', businessId)
        .maybeSingle();
      if (existing && existing.owner_id !== user.id) {
        finalSlug = `${finalSlug}-${Math.random().toString(36).slice(2, 6)}`;
      }
    } else {
      const { data: existing } = await sb
        .from('businesses')
        .select('id, owner_id')
        .eq('slug', finalSlug)
        .maybeSingle();
      if (existing && existing.owner_id !== user.id) {
        finalSlug = `${finalSlug}-${Math.random().toString(36).slice(2, 6)}`;
      }
    }
    businessPayload.slug = finalSlug;
  }

  if (businessId) {
    /* Update existing */
    const { error } = await sb.from('businesses').update(businessPayload).eq('id', businessId);
    if (error) {
      console.error('[save] update failed', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    /* Try to find an existing draft for this user first */
    const { data: draft } = await sb
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .eq('is_live', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (draft) {
      businessId = draft.id;
      const { error } = await sb.from('businesses').update(businessPayload).eq('id', businessId);
      if (error) {
        console.error('[save] update-draft failed', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      /* Insert new */
      if (!businessPayload.slug) {
        businessPayload.slug = `draft-${Math.random().toString(36).slice(2, 8)}`;
      }
      if (!businessPayload.name) businessPayload.name = 'Draft';
      const { data: inserted, error } = await sb
        .from('businesses')
        .insert(businessPayload)
        .select('id, slug')
        .single();
      if (error) {
        console.error('[save] insert failed', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      businessId = inserted.id;
      finalSlug = inserted.slug;
    }
  }

  if (!businessId) {
    return NextResponse.json({ error: 'Could not resolve business ID' }, { status: 500 });
  }

  /* --- 2. Persist services --- */
  if (Array.isArray(state.services) && state.services.length > 0) {
    const validServices = state.services
      .filter((s: any) => s.name?.trim())
      .map((s: any) => ({
        business_id: businessId,
        name: s.name.trim(),
        description: s.description?.trim() || null,
        duration_minutes: s.duration_minutes || 60,
        price_cents: s.price_cents ?? 0,
        is_active: true,
      }));

    if (validServices.length) {
      /* Delete existing and re-insert: simplest correctness guarantee */
      await sb.from('services').delete().eq('business_id', businessId);
      const { error: svcErr } = await sb.from('services').insert(validServices);
      if (svcErr) {
        console.error('[save] services insert failed', svcErr);
        /* Don't fail whole save over services */
      }
    }
  }

  /* --- 3. Persist hours --- */
  if (Array.isArray(state.hours) && state.hours.length > 0) {
    const hourRows = state.hours.map((h: any) => ({
      business_id: businessId,
      day_of_week: h.day_of_week,
      open_time: h.is_closed ? null : h.open_time ?? '09:00',
      close_time: h.is_closed ? null : h.close_time ?? '17:00',
      is_closed: !!h.is_closed,
    }));
    await sb.from('business_hours').delete().eq('business_id', businessId);
    await sb.from('business_hours').insert(hourRows);
  }

  /* --- 4. Update owner onboarding_step --- */
  if (typeof step === 'number') {
    await sb.from('owners').update({ onboarding_step: step }).eq('id', user.id);
  }

  return NextResponse.json({
    ok: true,
    businessId,
    slug: finalSlug,
  });
}
