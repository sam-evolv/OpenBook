import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/dashboard/settings
 * Body: { businessId, patch }
 *
 * Allows updating a whitelist of business fields.
 */
const ALLOWED_FIELDS = new Set([
  'name',
  'tagline',
  'about_long',
  'founder_name',
  'phone',
  'website',
  'address_line',
  'city',
  'primary_colour',
  'secondary_colour',
  'socials',
]);

export async function PATCH(req: NextRequest) {
  const sb = createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const { businessId, patch } = await req.json();
  if (!businessId || !patch) {
    return NextResponse.json({ error: 'Missing data' }, { status: 400 });
  }

  const { data: business } = await sb
    .from('businesses')
    .select('id, owner_id')
    .eq('id', businessId)
    .maybeSingle();
  if (!business || business.owner_id !== user.id) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 403 });
  }

  // Whitelist fields
  const safePatch: any = {};
  for (const key of Object.keys(patch)) {
    if (ALLOWED_FIELDS.has(key)) {
      safePatch[key] = patch[key];
    }
  }

  if (Object.keys(safePatch).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { error } = await sb.from('businesses').update(safePatch).eq('id', businessId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
