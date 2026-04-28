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
import { ConfirmClient } from './ConfirmClient';

export const dynamic = 'force-dynamic';

async function getBooking(id: string): Promise<BookingWithDetails | null> {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from('bookings')
    .select(
      `
      *,
      businesses (slug, name, primary_colour, cover_image_url, city),
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
  searchParams: { id?: string; cancelled?: string; session_id?: string };
}) {
  if (!searchParams.id) notFound();
  const booking = await getBooking(searchParams.id);
  if (!booking) notFound();

  const colour = getTileColour(booking.businesses.primary_colour).mid;
  const startAt = new Date(booking.starts_at);
  const endAt = new Date(booking.ends_at);
  const dateLabel = startAt.toLocaleDateString('en-IE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const timeLabel = startAt.toLocaleTimeString('en-IE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <main className="relative min-h-[100dvh] text-white antialiased overflow-hidden">
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(800px 500px at 50% 20%, ${colour}22 0%, transparent 55%),
            linear-gradient(180deg, #060606 0%, #020202 100%)
          `,
        }}
      />

      <ConsumerHeader showClose={false} domain="openbook.ie" />

      <ConfirmClient
        booking={{
          id: booking.id,
          status: booking.status ?? 'confirmed',
          serviceId: booking.service_id,
          businessSlug: booking.businesses.slug,
          businessName: booking.businesses.name,
          businessCoverUrl: booking.businesses.cover_image_url ?? null,
          serviceName: booking.services.name,
          startIso: startAt.toISOString(),
          endIso: endAt.toISOString(),
          priceLabel: formatPrice(booking.price_cents),
          durationLabel: formatDuration(booking.services.duration_minutes),
          dateLabel,
          timeLabel,
          tileColour: colour,
        }}
        cancelled={searchParams.cancelled === '1'}
      />

      <BottomTabBar />
    </main>
  );
}
