import { notFound } from 'next/navigation';
import {
  supabaseAdmin,
  formatPrice,
  formatDuration,
  type BookingWithDetails,
} from '@/lib/supabase';
import { ConsumerHeader } from '@/components/consumer/ConsumerHeader';
import { BottomTabBar } from '@/components/consumer/BottomTabBar';
import { getTileColour } from '@/lib/tile-palette';
import { formatConfirmationDateTimeDublin } from '@/lib/dublin-time';
import { ConfirmClient } from './ConfirmClient';

export const dynamic = 'force-dynamic';

async function getBooking(id: string): Promise<BookingWithDetails | null> {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from('bookings')
    .select(
      `
      *,
      businesses (slug, name, primary_colour, cover_image_url, city, category, processed_icon_url, logo_url),
      services (name, duration_minutes, price_cents)
    `
    )
    .eq('id', id)
    .maybeSingle();
  return (data as BookingWithDetails) ?? null;
}

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; cancelled?: string; session_id?: string }>;
}) {
  const sp = await searchParams;
  if (!sp.id) notFound();
  const booking = await getBooking(sp.id);
  if (!booking) notFound();

  const tile = getTileColour(booking.businesses.primary_colour);
  const startAt = new Date(booking.starts_at);
  const endAt = new Date(booking.ends_at);
  const dateTimeLabel = formatConfirmationDateTimeDublin(startAt);

  return (
    <main className="relative min-h-[100dvh] text-white antialiased overflow-hidden">
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(800px 500px at 50% 20%, ${tile.mid}22 0%, transparent 55%),
            linear-gradient(180deg, #060606 0%, #020202 100%)
          `,
        }}
      />

      <ConsumerHeader showClose={false} />

      <ConfirmClient
        booking={{
          id: booking.id,
          status: booking.status ?? 'confirmed',
          serviceId: booking.service_id,
          businessSlug: booking.businesses.slug,
          businessName: booking.businesses.name,
          businessCategory: booking.businesses.category ?? null,
          businessLogoUrl: booking.businesses.logo_url ?? null,
          businessProcessedIconUrl: booking.businesses.processed_icon_url ?? null,
          businessCity: booking.businesses.city ?? null,
          serviceName: booking.services.name,
          startIso: startAt.toISOString(),
          endIso: endAt.toISOString(),
          priceLabel: formatPrice(booking.price_cents),
          durationLabel: formatDuration(booking.services.duration_minutes),
          dateTimeLabel,
          primaryColourHex: tile.mid,
        }}
        cancelled={sp.cancelled === '1'}
      />

      <BottomTabBar />
    </main>
  );
}
