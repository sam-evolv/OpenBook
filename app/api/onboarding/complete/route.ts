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
    .select('id, owner_id, slug, name')
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

  /* Seed a default staff row from the owner. Availability generation
     depends on at least one staff member existing for the business —
     without this the AI assistant says "no slots available" for every
     time and date. Idempotent: skipped if any active staff already
     exists for this business, so re-running /complete (or a future
     trigger) won't produce duplicates. */
  const { count: existingStaff } = await sb
    .from('staff')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', business.id);

  if (!existingStaff) {
    const { data: owner } = await sb
      .from('owners')
      .select('full_name, email')
      .eq('id', user.id)
      .maybeSingle();

    const ownerName =
      owner?.full_name?.trim() ||
      user.user_metadata?.full_name?.trim() ||
      user.user_metadata?.name?.trim() ||
      business.name?.trim() ||
      'Owner';
    const ownerEmail = owner?.email ?? user.email ?? null;

    const { error: staffErr } = await sb.from('staff').insert({
      business_id: business.id,
      name: ownerName,
      email: ownerEmail,
      is_active: true,
    });
    if (staffErr) {
      console.error('[complete] default staff insert failed', staffErr);
    }
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
