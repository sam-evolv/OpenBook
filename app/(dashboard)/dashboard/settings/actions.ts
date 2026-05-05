'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, getCurrentOwner } from '@/lib/supabase-server';
import { isValidTileColour } from '@/lib/tile-palette';

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
  primary_colour: string | null;
  logo_url: string | null;
  processed_icon_url: string | null;
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

  const primary_colour =
    payload.primary_colour && isValidTileColour(payload.primary_colour)
      ? payload.primary_colour
      : null;

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
      primary_colour,
      logo_url: payload.logo_url,
      processed_icon_url: payload.processed_icon_url,
      socials: payload.socials,
      automations: payload.automations,
    })
    .eq('id', (business as { id: string }).id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath('/dashboard/settings');
  return { ok: true as const };
}
