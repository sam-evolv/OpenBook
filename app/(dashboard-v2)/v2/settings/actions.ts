'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, getCurrentOwner } from '@/lib/supabase-server';

export type Automations = {
  auto_reviews?: boolean;
  auto_waitlist_fill?: boolean;
  auto_reminders?: boolean;
  win_back_offers?: boolean;
  smart_rescheduling?: boolean;
  low_stock_alerts?: boolean;
  membership_renewal_nudges?: boolean;
  class_fill_notifications?: boolean;
};

export interface SettingsPayload {
  name: string;
  tagline: string | null;
  about_long: string | null;
  founder_name: string | null;
  phone: string | null;
  website: string | null;
  address_line: string | null;
  city: string | null;
  socials: {
    instagram?: string | null;
    tiktok?: string | null;
    facebook?: string | null;
  };
  automations: Automations;
}

export async function saveSettings(payload: SettingsPayload) {
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

  const { error } = await sb
    .from('businesses')
    .update({
      name: payload.name,
      tagline: payload.tagline,
      about_long: payload.about_long,
      founder_name: payload.founder_name,
      phone: payload.phone,
      website: payload.website,
      address_line: payload.address_line,
      city: payload.city,
      socials: payload.socials,
      automations: payload.automations,
    })
    .eq('id', (business as { id: string }).id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath('/v2/settings');
  return { ok: true as const };
}
