'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, getCurrentOwner } from '@/lib/supabase-server';

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

/**
 * Toggle a customer's favourite state for this business. Writes to the
 * `customer_businesses` pivot (creates the row on first toggle).
 */
export async function toggleCustomerFavourite(
  customerId: string,
  nextValue: boolean,
) {
  const { sb, businessId, error } = await requireOwnedBusinessId();
  if (error) return { ok: false as const, error };

  // Upsert the pivot row. If it doesn't exist, insert; else update.
  const { data: existing } = await sb
    .from('customer_businesses')
    .select('id')
    .eq('business_id', businessId)
    .eq('customer_id', customerId)
    .maybeSingle();

  if (existing) {
    const { error: upErr } = await sb
      .from('customer_businesses')
      .update({ is_favourite: nextValue })
      .eq('id', (existing as { id: string }).id);
    if (upErr) return { ok: false as const, error: upErr.message };
  } else {
    const { error: insErr } = await sb.from('customer_businesses').insert({
      business_id: businessId,
      customer_id: customerId,
      is_favourite: nextValue,
    });
    if (insErr) return { ok: false as const, error: insErr.message };
  }

  revalidatePath('/dashboard/customers');
  return { ok: true as const };
}

export async function saveCustomerNotes(customerId: string, notes: string) {
  const { sb, businessId, error } = await requireOwnedBusinessId();
  if (error) return { ok: false as const, error };

  // Belt-and-braces: only update if the customer has booked with this
  // business. Otherwise we'd let any owner edit any customer's notes.
  const { data: linkage } = await sb
    .from('bookings')
    .select('customer_id')
    .eq('business_id', businessId)
    .eq('customer_id', customerId)
    .limit(1)
    .maybeSingle();

  if (!linkage) return { ok: false as const, error: 'Customer not linked to this business' };

  const { error: upErr } = await sb
    .from('customers')
    .update({ notes: notes.trim() || null })
    .eq('id', customerId);

  if (upErr) return { ok: false as const, error: upErr.message };
  revalidatePath('/dashboard/customers');
  return { ok: true as const };
}
