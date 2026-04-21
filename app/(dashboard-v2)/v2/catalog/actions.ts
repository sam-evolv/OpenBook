'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, getCurrentOwner } from '@/lib/supabase-server';

export interface ServiceInput {
  id?: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  is_active: boolean;
}

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

export async function saveService(input: ServiceInput) {
  const { sb, businessId, error } = await requireOwnedBusinessId();
  if (error) return { ok: false as const, error };

  const name = input.name.trim();
  if (!name) return { ok: false as const, error: 'Name is required' };

  const payload = {
    business_id: businessId,
    name,
    description: input.description?.trim() || null,
    duration_minutes: Math.max(5, Math.round(input.duration_minutes)),
    price_cents: Math.max(0, Math.round(input.price_cents)),
    is_active: input.is_active,
  };

  if (input.id) {
    const { error: upErr } = await sb
      .from('services')
      .update(payload)
      .eq('id', input.id)
      .eq('business_id', businessId);
    if (upErr) return { ok: false as const, error: upErr.message };
  } else {
    const { error: insErr } = await sb.from('services').insert(payload);
    if (insErr) return { ok: false as const, error: insErr.message };
  }

  revalidatePath('/v2/catalog');
  return { ok: true as const };
}

export async function deleteService(id: string) {
  const { sb, businessId, error } = await requireOwnedBusinessId();
  if (error) return { ok: false as const, error };

  const { error: delErr } = await sb
    .from('services')
    .delete()
    .eq('id', id)
    .eq('business_id', businessId);

  if (delErr) return { ok: false as const, error: delErr.message };

  revalidatePath('/v2/catalog');
  return { ok: true as const };
}
