'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, getCurrentOwner } from '@/lib/supabase-server';
import { isValidTileColour } from '@/lib/tile-palette';
import {
  type BusinessAppConfig,
  getBusinessAppConfig,
  mergeBusinessAppConfig,
} from '@/lib/business-app-config';

export interface MyAppProfilePayload {
  name: string;
  tagline: string | null;
  about_long: string | null;
  city: string | null;
  primary_colour: string | null;
  appConfig: BusinessAppConfig;
}

export async function saveMyAppProfile(payload: MyAppProfilePayload) {
  const owner = await getCurrentOwner();
  if (!owner) return { ok: false as const, error: 'Not signed in' };

  const sb = createSupabaseServerClient();
  const { data: business } = await sb
    .from('businesses')
    .select('id, slug, offers')
    .eq('owner_id', owner.id)
    .eq('is_live', true)
    .maybeSingle();

  if (!business) return { ok: false as const, error: 'No live business' };

  const primary_colour =
    payload.primary_colour && isValidTileColour(payload.primary_colour)
      ? payload.primary_colour
      : null;

  const previousOffers = (business as { offers: unknown }).offers;
  const appConfig = getBusinessAppConfig({
    openbook_app_config: payload.appConfig,
  });

  const { error } = await sb
    .from('businesses')
    .update({
      name: payload.name,
      tagline: payload.tagline,
      about_long: payload.about_long,
      city: payload.city,
      primary_colour,
      offers: mergeBusinessAppConfig(previousOffers, appConfig),
    })
    .eq('id', (business as { id: string }).id);

  if (error) return { ok: false as const, error: error.message };

  const slug = (business as { slug: string | null }).slug;
  revalidatePath('/dashboard/my-app');
  revalidatePath('/dashboard/settings');
  if (slug) revalidatePath(`/business/${slug}`);
  return { ok: true as const };
}
