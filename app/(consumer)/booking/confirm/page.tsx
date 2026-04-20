import Link from 'next/link';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import {
  supabaseAdmin,
  formatPrice,
  formatDuration,
  type BookingWithDetails,
} from '@/lib/supabase';
import { ConsumerHeader } from '@/components/consumer/ConsumerHeader';
import { BottomTabBar } from '@/components/consumer/BottomTabBar';
import { ConfirmationHero } from './ConfirmationHero';

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
  searchParams: { id?: string };
}) {
  if (!searchParams.id) notFound();
  const booking = await getBooking(searchParams.id);
  if (!booking) notFound();

  const colour = booking.businesses.primary_colour || '#D4AF37';
  const startAt = new Date(booking.starts_at);
  const dateStr = startAt.toLocaleDateString('en-IE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const timeStr = startAt.toLocaleTimeString('en-IE', {
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

      <div className="pb-36">
        <ConfirmationHero colour={colour} />

        <div className="px-5 mt-2 text-center">
          <h1 className="text-[26px] font-bold tracking-tight leading-tight">
            You're booked.
          </h1>
          <p className="mt-2 text-[15px] text-white/55 leading-snug">
            A confirmation has been sent to your email.
          </p>
        </div>

        {/* Booking card */}
        <div className="mt-8 px-5">
          <div
            className="
              relative rounded-[24px] overflow-hidden
              border border-white/[0.08]
              bg-white/[0.03]
            "
          >
            <div className="flex items-center gap-3 p-4 border-b border-white/[0.06]">
              <div
                className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0"
                style={{
                  background: `linear-gradient(145deg, ${colour} 0%, ${colour}55 100%)`,
                }}
              >
                {booking.businesses.cover_image_url && (
                  <Image
                    src={booking.businesses.cover_image_url}
                    alt={booking.businesses.name}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-white/55 truncate">
                  {booking.businesses.name}
                </p>
                <h2 className="text-[16px] font-semibold tracking-tight truncate">
                  {booking.services.name}
                </h2>
              </div>
            </div>

            <DetailRow label="Date" value={dateStr} />
            <DetailRow label="Time" value={timeStr} />
            <DetailRow
              label="Duration"
              value={formatDuration(booking.services.duration_minutes)}
            />
            <DetailRow
              label="Total"
              value={formatPrice(booking.price_cents)}
              valueColour={colour}
              last
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 px-5 flex flex-col gap-2.5">
          <Link
            href="/consumer-bookings"
            className="
              w-full h-12 rounded-full text-[14px] font-semibold
              flex items-center justify-center
              bg-white/[0.05] border border-white/[0.08]
              hover:border-white/20 active:scale-[0.98] transition
            "
          >
            View my bookings
          </Link>
          <Link
            href={`/business/${booking.businesses.slug}`}
            className="
              w-full h-12 rounded-full text-[14px] font-medium text-white/55
              flex items-center justify-center
              active:scale-[0.98] transition
            "
          >
            Back to {booking.businesses.name}
          </Link>
        </div>
      </div>

      <BottomTabBar />
    </main>
  );
}

function DetailRow({
  label,
  value,
  valueColour,
  last,
}: {
  label: string;
  value: string;
  valueColour?: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-3.5 ${
        last ? '' : 'border-b border-white/[0.05]'
      }`}
    >
      <span className="text-[13px] text-white/50">{label}</span>
      <span
        className="text-[14px] font-semibold tracking-tight"
        style={valueColour ? { color: valueColour } : undefined}
      >
        {value}
      </span>
    </div>
  );
}
