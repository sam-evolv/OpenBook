'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, ArrowRight } from 'lucide-react';
import { type BookingWithDetails, formatPrice } from '@/lib/supabase';
import { friendlyDate, timeLabel } from '@/lib/time';
import { getTileColour } from '@/lib/tile-palette';

export function BookingsList({
  bookings,
}: {
  bookings: BookingWithDetails[];
}) {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const now = Date.now();

  const { upcoming, past } = useMemo(() => {
    const up: BookingWithDetails[] = [];
    const pa: BookingWithDetails[] = [];
    for (const b of bookings) {
      if (new Date(b.ends_at).getTime() >= now && b.status !== 'cancelled') {
        up.push(b);
      } else {
        pa.push(b);
      }
    }
    up.sort(
      (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    );
    pa.sort(
      (a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()
    );
    return { upcoming: up, past: pa };
  }, [bookings, now]);

  const list = tab === 'upcoming' ? upcoming : past;

  return (
    <>
      <div className="inline-flex p-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
        {(['upcoming', 'past'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`
              h-9 px-5 rounded-full text-[13px] font-semibold capitalize
              transition-all
              ${
                tab === t
                  ? 'bg-[#D4AF37] text-black'
                  : 'text-white/60 hover:text-white/90'
              }
            `}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {list.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <div className="flex flex-col gap-2.5">
            {list.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function BookingCard({ booking }: { booking: BookingWithDetails }) {
  const colour = getTileColour(booking.businesses.primary_colour).mid;
  const start = new Date(booking.starts_at);
  const isPast = Date.now() > new Date(booking.ends_at).getTime();

  return (
    <Link
      href={`/business/${booking.businesses.slug}`}
      className="
        flex items-center gap-3 p-3 rounded-2xl
        bg-white/[0.03] border border-white/[0.06]
        hover:border-white/[0.14] active:scale-[0.99]
        transition-all
      "
    >
      <div
        className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0"
        style={{
          background: `linear-gradient(145deg, ${colour} 0%, ${colour}55 100%)`,
        }}
      >
        {booking.businesses.cover_image_url && (
          <Image
            src={booking.businesses.cover_image_url}
            alt={booking.businesses.name}
            fill
            sizes="56px"
            className="object-cover"
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-white/55 truncate">
          {booking.businesses.name}
        </p>
        <h3 className="text-[15px] font-semibold tracking-tight truncate">
          {booking.services.name}
        </h3>
        <div className="mt-1 flex items-center gap-1.5 text-[12px]">
          <Calendar
            className="w-[12px] h-[12px]"
            style={{ color: colour }}
            strokeWidth={2.2}
          />
          <span className={isPast ? 'text-white/45' : 'text-white/75'}>
            {friendlyDate(start)} · {timeLabel(start)}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1">
        <span
          className="text-[13px] font-semibold"
          style={{ color: colour }}
        >
          {formatPrice(booking.price_cents)}
        </span>
        <ArrowRight className="w-4 h-4 text-white/30" strokeWidth={2} />
      </div>
    </Link>
  );
}

function EmptyState({ tab }: { tab: 'upcoming' | 'past' }) {
  return (
    <div
      className="
        flex flex-col items-center justify-center
        py-16 px-6 rounded-2xl
        bg-white/[0.02] border border-dashed border-white/[0.08]
        text-center
      "
    >
      <Calendar className="w-8 h-8 text-white/25 mb-3" strokeWidth={1.5} />
      <p className="text-[15px] font-medium text-white/70">
        No {tab} bookings
      </p>
      <p className="mt-1 text-[13px] text-white/45 max-w-[220px]">
        {tab === 'upcoming'
          ? 'Book something in Explore and it will show up here.'
          : 'Past appointments will appear here.'}
      </p>
      {tab === 'upcoming' && (
        <Link
          href="/explore"
          className="
            mt-5 inline-flex items-center h-10 px-5 rounded-full
            bg-[#D4AF37] text-black text-[13px] font-semibold
            active:scale-95 transition
          "
        >
          Explore businesses
        </Link>
      )}
    </div>
  );
}
