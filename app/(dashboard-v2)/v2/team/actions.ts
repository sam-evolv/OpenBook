'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, getCurrentOwner } from '@/lib/supabase-server';
import { STAFF_COLOUR_PALETTE } from '@/lib/dashboard-v2/staff-colours';

async function requireOwnedBusinessId() {
  const owner = await getCurrentOwner();
  if (!owner) return { sb: null, businessId: null, error: 'Not signed in' as const };
  const sb = createSupabaseServerClient();
  const { data } = await sb
    .from('businesses')
    .select('id')
    .eq('owner_id', owner.id)
    .eq('is_live', true)
    .maybeSingle();
  if (!data) return { sb, businessId: null, error: 'No live business' as const };
  return { sb, businessId: (data as { id: string }).id, error: null };
}

export interface StaffInput {
  id?: string;
  name: string;
  title: string | null;
  bio: string | null;
  email: string | null;
  instagram_handle: string | null;
  specialties: string[];
  /** Palette slug from STAFF_COLOUR_PALETTE, or null for hash fallback. */
  colour: string | null;
  is_active: boolean;
}

function validateColour(colour: string | null): string | null {
  if (!colour) return null;
  return (STAFF_COLOUR_PALETTE as readonly string[]).includes(colour) ? colour : null;
}

export async function saveStaff(input: StaffInput) {
  const { sb, businessId, error } = await requireOwnedBusinessId();
  if (error) return { ok: false as const, error };

  const name = input.name.trim();
  if (!name) return { ok: false as const, error: 'Name is required' };

  const payload = {
    business_id: businessId,
    name,
    title: input.title?.trim() || null,
    bio: input.bio?.trim() || null,
    email: input.email?.trim() || null,
    instagram_handle: input.instagram_handle?.trim() || null,
    specialties: input.specialties.map((s) => s.trim()).filter(Boolean),
    colour: validateColour(input.colour),
    is_active: input.is_active,
  };

  if (input.id) {
    const { error: upErr } = await sb
      .from('staff')
      .update(payload)
      .eq('id', input.id)
      .eq('business_id', businessId);
    if (upErr) return { ok: false as const, error: upErr.message };
  } else {
    const { error: insErr } = await sb.from('staff').insert(payload);
    if (insErr) return { ok: false as const, error: insErr.message };
  }

  revalidatePath('/v2/team');
  revalidatePath('/v2/calendar');
  return { ok: true as const };
}

/**
 * Soft-deactivate — keeps bookings.staff_id foreign-key intact and
 * preserves utilisation history. Hard delete is out of scope for v1.
 */
export async function deactivateStaff(id: string) {
  const { sb, businessId, error } = await requireOwnedBusinessId();
  if (error) return { ok: false as const, error };

  const { error: upErr } = await sb
    .from('staff')
    .update({ is_active: false })
    .eq('id', id)
    .eq('business_id', businessId);

  if (upErr) return { ok: false as const, error: upErr.message };
  revalidatePath('/v2/team');
  revalidatePath('/v2/calendar');
  return { ok: true as const };
}
