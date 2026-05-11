/**
 * SlotCard — the three-row card showing when and where the booking is.
 *
 *   Tue 12 May · 12 May 2026
 *   3:00 PM – 3:45 PM
 *   📍 Evolv Performance, Dublin
 *
 * Day label collapses to "Today" / "Tomorrow" via lib/dublin-time so the
 * copy matches the rest of the consumer surface and stays correct across
 * DST transitions. Pure server component.
 */

import { MapPin } from 'lucide-react';
import {
  formatDayLabel,
  formatFullDate,
  formatTimeRange,
} from '@/lib/dublin-time';

type Props = {
  slotTimeIso: string;
  durationMinutes: number;
  businessName: string;
  city: string | null;
};

export function SlotCard({
  slotTimeIso,
  durationMinutes,
  businessName,
  city,
}: Props) {
  const start = new Date(slotTimeIso);
  const dayLabel = formatDayLabel(start);
  const fullDate = formatFullDate(start);
  const timeRange = formatTimeRange(start, durationMinutes);
  const locationLine = [businessName, city].filter(Boolean).join(', ');

  return (
    <div className="rounded-xl border border-white/10 bg-[#0E0E0E] p-5">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-[18px] font-medium text-white">
            {dayLabel}
          </span>
          <span aria-hidden className="text-zinc-600">
            ·
          </span>
          <span className="text-[13px] text-zinc-500">{fullDate}</span>
        </div>
        <div className="text-[20px] font-medium text-zinc-100">
          {timeRange}
        </div>
        <div className="flex items-center gap-1.5 text-[13px] text-zinc-500">
          <MapPin className="h-[14px] w-[14px]" aria-hidden />
          <span>{locationLine}</span>
        </div>
      </div>
    </div>
  );
}
