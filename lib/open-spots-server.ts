/**
 * Server-only fetcher for the Open Spots feed. Shared by the SSR Explore
 * page and the /api/open-spots route to keep filter behaviour identical.
 */

import 'server-only';
import { supabaseAdmin } from './supabase';
import {
  type CategoryFilter,
  type OpenSpot,
  type WhenFilter,
  computeUrgencyTier,
  matchesCategoryFilter,
  whenBounds,
} from './open-spots';

type Row = {
  id: string;
  business_id: string;
  service_id: string;
  original_price_cents: number;
  sale_price_cents: number;
  discount_percent: number;
  slot_time: string;
  duration_minutes: number;
  expires_at: string;
  max_bookings: number;
  bookings_taken: number;
  businesses: {
    name: string;
    slug: string;
    primary_colour: string;
    city: string;
    category: string;
  } | null;
  services: { name: string } | null;
};

export type FetchOpenSpotsArgs = {
  city: string | null;
  category: CategoryFilter;
  when: WhenFilter;
  limit?: number;
};

export async function fetchOpenSpots({
  city,
  category,
  when,
  limit = 50,
}: FetchOpenSpotsArgs): Promise<OpenSpot[]> {
  const sb = supabaseAdmin();
  const now = new Date();
  const { fromIso, toIso } = whenBounds(when, now);

  const { data, error } = await sb
    .from('flash_sales')
    .select(
      `
      id, business_id, service_id,
      original_price_cents, sale_price_cents, discount_percent,
      slot_time, duration_minutes, expires_at,
      max_bookings, bookings_taken,
      businesses:business_id ( name, slug, primary_colour, city, category ),
      services:service_id ( name )
      `
    )
    .eq('status', 'active')
    .gt('expires_at', now.toISOString())
    .gte('slot_time', fromIso)
    .lt('slot_time', toIso)
    .order('slot_time', { ascending: true })
    .limit(Math.max(1, Math.min(100, limit)));

  if (error || !data) return [];

  const rows = data as unknown as Row[];
  return rows
    .filter((r) => r.businesses && r.services)
    .filter((r) => r.bookings_taken < r.max_bookings)
    .filter((r) =>
      city ? (r.businesses?.city ?? '').toLowerCase() === city.toLowerCase() : true
    )
    .filter((r) => matchesCategoryFilter(r.businesses?.category, category))
    .map<OpenSpot>((r) => ({
      id: r.id,
      business_id: r.business_id,
      business_name: r.businesses!.name,
      business_slug: r.businesses!.slug,
      business_primary_colour: r.businesses!.primary_colour,
      business_city: r.businesses!.city,
      business_category: r.businesses!.category,
      service_id: r.service_id,
      service_name: r.services!.name,
      original_price_cents: r.original_price_cents,
      sale_price_cents: r.sale_price_cents,
      discount_percent: r.discount_percent,
      slot_time: r.slot_time,
      duration_minutes: r.duration_minutes,
      expires_at: r.expires_at,
      max_bookings: r.max_bookings,
      bookings_taken: r.bookings_taken,
      urgency_tier: computeUrgencyTier(r.slot_time, now),
    }))
    .sort((a, b) => {
      if (a.urgency_tier !== b.urgency_tier) return a.urgency_tier - b.urgency_tier;
      return new Date(a.slot_time).getTime() - new Date(b.slot_time).getTime();
    });
}
