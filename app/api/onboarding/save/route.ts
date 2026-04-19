import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/onboarding/save
 *
 * Idempotent save. Rules:
 * 1. Refuse to save without a non-empty name OR existing businessId.
 *    Prevents empty ghost rows from being created.
 * 2. Reuse the owner's existing draft business (their most recent row) if
 *    no businessId is passed. Prevents per-keystroke row creation.
 * 3. Only generate a slug suffix if someone ELSE owns the slug — never
 *    when the current user already owns it themselves.
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

  // Guard against saving empty state. This is the bug that was creating
  // blank is_live=true rows when Step 8 mounted with no state.
  const hasName = typeof state?.name === 'string' && state.name.trim().length > 0;
  const hasBusinessId = typeof state?.businessId === 'string' && state.businessId.length > 0;

  if (!hasName && !hasBusinessId) {
    return NextResponse.json(
      { error: 'Name required to save progress' },
      { status: 400 }
    );
  }

  // Build the payload (only include fields the client actually set)
  const businessPayload: any = {
    owner_id: user.id,
    primary_colour: state.primary_colour ?? '#D4AF37',
    is_live: false, // stays hidden until /complete
    socials: state.socials ?? {},
  };

  // Only set fields we actually have values for — never clobber with undefined/empty
  if (state.name?.trim()) businessPayload.name = state.name.trim();
  if (state.category) businessPayload.category = state.category;
  if (state.city) businessPayload.city = state.city;
  if (state.address_line) businessPayload.address_line = state.address_line;
  if (state.secondary_colour) businessPayload.secondary_colour = state.secondary_colour;
  if (state.tagline) businessPayload.tagline = state.tagline;
  if (state.about_long) businessPayload.about_long = state.about_long;
  if (state.founder_name) businessPayload.founder_name = state.founder_name;
  if (state.phone) businessPayload.phone = state.phone;
  if (state.website) businessPayload.website = state.website;
  if (state.logo_url) businessPayload.logo_url = state.logo_url;
  if (state.processed_icon_url) businessPayload.processed_icon_url = state.processed_icon_url;

  // Resolve which row to update:
  // 1. If client sent a businessId, use that (subject to ownership check).
  // 2. Else find the owner's most recent draft (is_live = false) row.
  // 3. Else create a new row.
  let businessId: string | undefined = state.businessId;

  if (businessId) {
    const { data: existing } = await sb
      .from('businesses')
      .select('id, owner_id')
      .eq('id', businessId)
      .maybeSingle();

    if (!existing || existing.owner_id !== user.id) {
      businessId = undefined; // treat as missing, fall through
    }
  }

  if (!businessId) {
    const { data: draft } = await sb
      .from('businesses')
      .select('id, slug')
      .eq('owner_id', user.id)
      .eq('is_live', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (draft) {
      businessId = draft.id;
    }
  }

  // Handle slug — only set it if we have one, only suffix if someone
  // ELSE owns it.
  if (state.slug) {
    const desiredSlug = state.slug.trim().toLowerCase();

    const { data: slugOwner } = await sb
      .from('businesses')
      .select('id, owner_id')
      .eq('slug', desiredSlug)
      .maybeSingle();

    if (!slugOwner || slugOwner.id === businessId) {
      // Slug is available or we already own it — keep as requested
      businessPayload.slug = desiredSlug;
    } else if (slugOwner.owner_id === user.id) {
      // It's owned by another of the user's draft rows — claim it
      businessPayload.slug = desiredSlug;
    } else {
      // Someone else owns this slug, generate a suffix
      businessPayload.slug = `${desiredSlug}-${Math.random().toString(36).slice(2, 6)}`;
    }
  }

  // Now either UPDATE or INSERT
  if (businessId) {
    const { error } = await sb.from('businesses').update(businessPayload).eq('id', businessId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    // First save for this owner — must have at least a name (guarded above)
    // Must also have a slug for insert
    if (!businessPayload.slug) {
      businessPayload.slug = state.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    const { data, error } = await sb
      .from('businesses')
      .insert(businessPayload)
      .select('id, slug')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    businessId = data.id;
    businessPayload.slug = data.slug;
  }

  // Update owner step pointer
  await sb.from('owners').update({ onboarding_step: step }).eq('id', user.id);

  return NextResponse.json({ businessId, slug: businessPayload.slug });
}
