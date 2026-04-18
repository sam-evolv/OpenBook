import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
  description: string | null;
  price_tier: number | null;
  rating: number | null;
  is_live: boolean;
  address_line?: string | null;
  phone?: string | null;
  website?: string | null;
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
  start_at: string; // ISO
  end_at: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  total_cents: number;
  created_at: string;
};

export type BookingWithDetails = Booking & {
  businesses: Pick<
    Business,
    'slug' | 'name' | 'primary_colour' | 'cover_image_url' | 'city'
  >;
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

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
