import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-service-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseAdmin = () =>
  createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

export type Business = {
  id: string;
  slug: string;
  name: string;
  category: string;
  city: string;
  primary_colour: string;
  cover_image_url: string | null;
  logo_url: string | null;
  processed_icon_url: string | null;
  description: string | null;
  price_tier: number | null;
  rating: number | null;
  is_live: boolean;
  address_line?: string | null;
  phone?: string | null;
  website?: string | null;

  // Rich content (from v3 migration)
  tagline?: string | null;
  about_long?: string | null;
  gallery_urls?: string[] | null;
  team?: Array<{ name: string; role: string; photo_url?: string }> | null;
  testimonials?: Array<{ quote: string; author: string; rating?: number }> | null;
  offers?: Array<{ title: string; description: string; badge?: string }> | null;
};

export type Service = {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  is_active: boolean;
};

export type Booking = {
  id: string;
  business_id: string;
  service_id: string;
  customer_id: string | null;
  starts_at: string;
  ends_at: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  price_cents: number;
  created_at: string;
  recap_sent_at?: string | null;
};

export type BookingWithDetails = Booking & {
  businesses: Pick<
    Business,
    | 'slug'
    | 'name'
    | 'primary_colour'
    | 'cover_image_url'
    | 'city'
    | 'processed_icon_url'
    | 'logo_url'
  > & {
    category?: string | null;
  };
  services: Pick<Service, 'name' | 'duration_minutes' | 'price_cents'>;
};

export type CustomerCredit = {
  id: string;
  customer_id: string;
  business_id: string;
  amount_cents: number;
  reason: string | null;
  expires_at: string | null;
  created_at: string;
};

export function formatPrice(cents: number): string {
  const euros = cents / 100;
  return `€${euros.toFixed(euros % 1 === 0 ? 0 : 2)}`;
}

/**
 * Service / booking price label. Renders "Free" when the price is exactly
 * zero so we never show "€0" anywhere a customer reads a price. Use this
 * (not `formatPrice`) anywhere a service or booking total is shown.
 */
export function formatServicePrice(cents: number): string {
  if (cents === 0) return 'Free';
  return formatPrice(cents);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
