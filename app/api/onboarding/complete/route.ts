import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/onboarding/complete
 * Body: { state }
 *
 * Called on Step 9 (Launch). Performs a final save (services + hours persisted
 * via /save route path), flips is_live=true on the business, and marks the
 * owner onboarding_completed.
 *
 * Idempotent: can be called multiple times safely.
 */
export async function POST(req: NextRequest) {
  const sb = createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const { state } = await req.json();
  if (!state?.businessId) {
    return NextResponse.json({ error: 'Missing businessId' }, { status: 400 });
  }

  /* Verify ownership */
  const { data: business } = await sb
    .from('businesses')
    .select('id, owner_id, slug')
    .eq('id', state.businessId)
    .maybeSingle();
  if (!business || business.owner_id !== user.id) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 403 });
  }

  /* Final save of services (belt-and-suspenders — save route should have done this) */
  if (Array.isArray(state.services) && state.services.length > 0) {
    const validServices = state.services
      .filter((s: any) => s.name?.trim())
      .map((s: any) => ({
        business_id: business.id,
        name: s.name.trim(),
        description: s.description?.trim() || null,
        duration_minutes: s.duration_minutes || 60,
        price_cents: s.price_cents ?? 0,
        is_active: true,
      }));

    if (validServices.length) {
      await sb.from('services').delete().eq('business_id', business.id);
      await sb.from('services').insert(validServices);
    }
  }

  /* Final save of hours */
  if (Array.isArray(state.hours) && state.hours.length > 0) {
    const hourRows = state.hours.map((h: any) => ({
      business_id: business.id,
      day_of_week: h.day_of_week,
      open_time: h.is_closed ? null : h.open_time ?? '09:00',
      close_time: h.is_closed ? null : h.close_time ?? '17:00',
      is_closed: !!h.is_closed,
    }));
    await sb.from('business_hours').delete().eq('business_id', business.id);
    await sb.from('business_hours').insert(hourRows);
  }

  /* Flip is_live */
  const { error: bizErr } = await sb
    .from('businesses')
    .update({ is_live: true })
    .eq('id', business.id);
  if (bizErr) return NextResponse.json({ error: bizErr.message }, { status: 500 });

  /* Mark owner onboarding complete */
  const { error: ownerErr } = await sb
    .from('owners')
    .update({ onboarding_completed: true, onboarding_step: 9 })
    .eq('id', user.id);
  if (ownerErr) console.error('[complete] owner update failed', ownerErr);

  return NextResponse.json({
    ok: true,
    slug: business.slug,
  });
}
