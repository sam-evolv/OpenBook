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

export async function saveMonthlyRevenueGoal(amount: number | null) {
  const { sb, businessId, error } = await requireOwnedBusinessId();
  if (error) return { ok: false as const, error };

  const value = amount === null || Number.isNaN(amount) ? null : Math.max(0, Math.round(amount));

  const { error: upErr } = await sb
    .from('businesses')
    .update({ monthly_revenue_goal: value })
    .eq('id', businessId);

  if (upErr) return { ok: false as const, error: upErr.message };
  revalidatePath('/v2/overview');
  return { ok: true as const };
}

export async function dismissInsight(id: string) {
  const { sb, businessId, error } = await requireOwnedBusinessId();
  if (error) return { ok: false as const, error };

  const { error: upErr } = await sb
    .from('ai_insights')
    .update({ dismissed: true })
    .eq('id', id)
    .eq('business_id', businessId);

  if (upErr) return { ok: false as const, error: upErr.message };
  revalidatePath('/v2/overview');
  return { ok: true as const };
}

export async function markWaitlistNotified(id: string) {
  const { sb, businessId, error } = await requireOwnedBusinessId();
  if (error) return { ok: false as const, error };

  const { error: upErr } = await sb
    .from('waitlist')
    .update({ notified_at: new Date().toISOString() })
    .eq('id', id)
    .eq('business_id', businessId);

  if (upErr) return { ok: false as const, error: upErr.message };
  revalidatePath('/v2/overview');
  return { ok: true as const };
}
