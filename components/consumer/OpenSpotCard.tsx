/**
 * OpenSpotCard — the centrepiece of the Open Spots feed.
 *
 * Visual structure:
 *   ┌──────────────────────────────────────────────────┐
 *   │ ▎ Evolv Performance                Just opened   │
 *   │   PERSONAL TRAINING · 45 MIN                      │
 *   │                                                    │
 *   │   €30  €̶5̶0̶                       Today 3:00pm    │
 *   │   1.2 km away                                      │
 *   └──────────────────────────────────────────────────┘
 *
 * - Fraunces serif business name (18 / 500).
 * - Gold #D4AF37 sale price (28 / 600); zinc-400 strikethrough original.
 * - Left accent: 3px business primary_colour, full card height.
 * - No emoji, no red. Dark-mode card (#0E0E0E + white/10 border).
 */

import Link from 'next/link';
import { UrgencyBadge } from './UrgencyBadge';
import { formatEUR, formatSlotTime, type OpenSpot } from '@/lib/open-spots';

type Props = { spot: OpenSpot };

export function OpenSpotCard({ spot }: Props) {
  const spotsLeft = spot.max_bookings - spot.bookings_taken;
  const isLastSpot = spot.max_bookings > 1 && spotsLeft === 1;

  return (
    <Link
      href={`/open-spots/${spot.id}/confirm`}
      className="
        relative block overflow-hidden rounded-2xl
        bg-[#0E0E0E] border border-white/10
        px-5 py-5
        min-h-[112px]
        transition active:scale-[0.99]
      "
    >
      <span
        aria-hidden
        className="absolute left-0 top-0 h-full w-[3px] rounded-l-2xl"
        style={{ backgroundColor: spot.business_primary_colour || '#D4AF37' }}
      />

      <div className="flex items-start justify-between gap-3">
        <h3 className="font-serif text-[18px] font-medium leading-tight text-white truncate">
          {spot.business_name}
        </h3>
        <UrgencyBadge tier={spot.urgency_tier} />
      </div>

      <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-400">
        {spot.service_name} · {spot.duration_minutes} min
      </p>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-[28px] font-semibold leading-none text-[#D4AF37]">
            {formatEUR(spot.sale_price_cents)}
          </span>
          <span className="text-[16px] font-normal text-zinc-500 line-through">
            {formatEUR(spot.original_price_cents)}
          </span>
        </div>
        <span className="text-[14px] font-medium text-zinc-300 whitespace-nowrap">
          {formatSlotTime(spot.slot_time)}
        </span>
      </div>

      {isLastSpot && (
        <p className="mt-2 text-[12px] font-medium text-[#D4AF37]">Last spot</p>
      )}
    </Link>
  );
}

export function OpenSpotCardSkeleton() {
  return (
    <div
      aria-hidden
      className="
        relative overflow-hidden rounded-2xl
        bg-[#0E0E0E] border border-white/10
        px-5 py-5 min-h-[112px]
      "
    >
      <span className="absolute left-0 top-0 h-full w-[3px] rounded-l-2xl bg-white/10" />
      <div className="h-[18px] w-[55%] rounded bg-white/[0.06] animate-pulse" />
      <div className="mt-2 h-[11px] w-[40%] rounded bg-white/[0.04] animate-pulse" />
      <div className="mt-5 flex items-end justify-between">
        <div className="h-[28px] w-[80px] rounded bg-white/[0.06] animate-pulse" />
        <div className="h-[14px] w-[90px] rounded bg-white/[0.04] animate-pulse" />
      </div>
    </div>
  );
}
