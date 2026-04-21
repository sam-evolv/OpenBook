'use client';

import { Zap } from 'lucide-react';
import { Card } from '../Card';
import { Button } from '../Button';
import type { BookingBlock } from '@/lib/dashboard-v2/calendar-queries';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface QuietZoneNudgeProps {
  bookings: BookingBlock[];
  onCreateSale?: () => void;
}

/**
 * Picks the weekday afternoon window (13:00–17:00) with the fewest bookings
 * across the visible week. Only surfaces if the week has ≥ 5 bookings — below
 * that threshold every day looks quiet and the nudge is just noise.
 */
function findQuietestAfternoon(bookings: BookingBlock[]): { dow: number; count: number } | null {
  if (bookings.length < 5) return null;

  const counts = Array(7).fill(0);
  for (const b of bookings) {
    const d = new Date(b.starts_at);
    const hour = d.getHours();
    if (hour >= 13 && hour < 17) {
      counts[d.getDay()]++;
    }
  }

  let bestDow = -1;
  let bestCount = Infinity;
  // Skip Sunday (0) — if closed the nudge is pointless.
  for (let dow = 1; dow <= 6; dow++) {
    if (counts[dow]! < bestCount) {
      bestCount = counts[dow]!;
      bestDow = dow;
    }
  }
  if (bestDow === -1 || bestCount >= 3) return null; // already busy enough
  return { dow: bestDow, count: bestCount };
}

export function QuietZoneNudge({ bookings, onCreateSale }: QuietZoneNudgeProps) {
  const quiet = findQuietestAfternoon(bookings);
  if (!quiet) return null;

  return (
    <Card variant="gold" padding="sm">
      <div className="flex items-center gap-3">
        <Zap size={14} className="text-gold shrink-0" strokeWidth={2} />
        <div className="flex-1 text-[12.5px] leading-snug text-paper-text-2 dark:text-ink-text-2">
          <span className="font-semibold text-paper-text-1 dark:text-ink-text-1">
            {DAY_NAMES[quiet.dow]} 13:00 – 17:00 is quiet.
          </span>{' '}
          Run a flash sale to fill it?
        </div>
        <Button variant="secondary" size="sm" onClick={onCreateSale} disabled={!onCreateSale}>
          Create sale
        </Button>
      </div>
    </Card>
  );
}
