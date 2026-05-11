import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import { ConsumerHeader } from '@/components/consumer/ConsumerHeader';
import { BottomTabBar } from '@/components/consumer/BottomTabBar';
import {
  ConfirmSpotScreen,
  type ConfirmSpotData,
} from '@/components/consumer/ConfirmSpotScreen';

export const dynamic = 'force-dynamic';

type SaleRow = {
  id: string;
  business_id: string;
  service_id: string | null;
  slot_time: string;
  expires_at: string;
  duration_minutes: number;
  original_price_cents: number;
  sale_price_cents: number;
  discount_percent: number;
  max_bookings: number;
  bookings_taken: number;
  status: string;
  business_name: string;
  business_slug: string;
  primary_colour: string | null;
  city: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  category: string | null;
  stripe_charges_enabled: boolean | null;
  service_name: string | null;
};

async function loadSale(saleId: string): Promise<SaleRow | null> {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from('flash_sales')
    .select(
      `
      id, business_id, service_id, slot_time, expires_at, duration_minutes,
      original_price_cents, sale_price_cents, discount_percent,
      max_bookings, bookings_taken, status,
      businesses:business_id (
        name, slug, primary_colour, city, logo_url, cover_image_url,
        category, stripe_charges_enabled
      ),
      services:service_id ( name )
      `,
    )
    .eq('id', saleId)
    .maybeSingle();

  if (!data) return null;

  const businessJoin = (data as { businesses: unknown }).businesses;
  const serviceJoin = (data as { services: unknown }).services;
  const business = (Array.isArray(businessJoin)
    ? businessJoin[0]
    : businessJoin) as SaleRow | null;
  const service = (Array.isArray(serviceJoin)
    ? serviceJoin[0]
    : serviceJoin) as { name: string } | null;
  if (!business) return null;

  return {
    id: data.id as string,
    business_id: data.business_id as string,
    service_id: (data.service_id as string | null) ?? null,
    slot_time: data.slot_time as string,
    expires_at: data.expires_at as string,
    duration_minutes: data.duration_minutes as number,
    original_price_cents: data.original_price_cents as number,
    sale_price_cents: data.sale_price_cents as number,
    discount_percent: data.discount_percent as number,
    max_bookings: data.max_bookings as number,
    bookings_taken: data.bookings_taken as number,
    status: data.status as string,
    business_name: (business as unknown as { name: string }).name,
    business_slug: (business as unknown as { slug: string }).slug,
    primary_colour:
      (business as unknown as { primary_colour: string | null }).primary_colour,
    city: (business as unknown as { city: string | null }).city,
    logo_url: (business as unknown as { logo_url: string | null }).logo_url,
    cover_image_url:
      (business as unknown as { cover_image_url: string | null })
        .cover_image_url,
    category: (business as unknown as { category: string | null }).category,
    stripe_charges_enabled:
      (business as unknown as { stripe_charges_enabled: boolean | null })
        .stripe_charges_enabled,
    service_name: service?.name ?? null,
  };
}

export default async function OpenSpotConfirmPage({
  params,
}: {
  params: Promise<{ saleId: string }>;
}) {
  const { saleId } = await params;
  const sale = await loadSale(saleId);

  if (!sale) redirect('/explore');
  if (sale.status !== 'active') redirect('/explore');
  if (sale.bookings_taken >= sale.max_bookings) redirect('/explore');
  if (new Date(sale.expires_at).getTime() <= Date.now()) redirect('/explore');

  const data: ConfirmSpotData = {
    saleId: sale.id,
    businessName: sale.business_name,
    businessSlug: sale.business_slug,
    businessCity: sale.city,
    businessPrimaryColour: sale.primary_colour,
    businessLogoUrl: sale.logo_url,
    businessCoverImageUrl: sale.cover_image_url,
    stripeChargesEnabled: sale.stripe_charges_enabled === true,
    serviceName: sale.service_name ?? 'Open spot',
    durationMinutes: sale.duration_minutes,
    slotTimeIso: sale.slot_time,
    originalPriceCents: sale.original_price_cents,
    salePriceCents: sale.sale_price_cents,
    discountPercent: sale.discount_percent,
    maxBookings: sale.max_bookings,
    bookingsTaken: sale.bookings_taken,
  };

  return (
    <main className="relative min-h-[100dvh] overflow-hidden text-white antialiased">
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(800px 500px at 50% 20%, rgba(212,175,55,0.06) 0%, transparent 55%), linear-gradient(180deg, #060606 0%, #020202 100%)',
        }}
      />
      <ConsumerHeader showClose={false} />
      <ConfirmSpotScreen data={data} />
      <BottomTabBar />
    </main>
  );
}
