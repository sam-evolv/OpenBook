'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, getCurrentOwner } from '@/lib/supabase-server';

export interface HourRowInput {
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

export async function saveHours(rows: HourRowInput[]) {
  const owner = await getCurrentOwner();
  if (!owner) return { ok: false as const, error: 'Not signed in' };

  const sb = createSupabaseServerClient();
  const { data: business } = await sb
    .from('businesses')
    .select('id')
    .eq('owner_id', owner.id)
    .eq('is_live', true)
    .maybeSingle();

  if (!business) return { ok: false as const, error: 'No live business' };

  const deleteRes = await sb.from('business_hours').delete().eq('business_id', business.id);
  if (deleteRes.error) return { ok: false as const, error: deleteRes.error.message };

  const insertRows = rows.map((r) => ({
    business_id: business.id,
    day_of_week: r.day_of_week,
    open_time: r.is_closed ? null : r.open_time,
    close_time: r.is_closed ? null : r.close_time,
    is_closed: r.is_closed,
  }));

  const { error } = await sb.from('business_hours').insert(insertRows);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath('/dashboard/hours');
  return { ok: true as const };
}
