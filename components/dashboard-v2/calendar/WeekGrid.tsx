'use client';

import { useMemo } from 'react';
import { Users } from 'lucide-react';
import { Card } from '../Card';
import { colourForStaff } from '@/lib/dashboard-v2/staff-colours';
import { TILE_PALETTE_MAP } from '@/lib/tile-palette';
import type {
  BookingBlock,
  BusinessHourRow,
  ClosureRow,
  StaffRow,
} from '@/lib/dashboard-v2/calendar-queries';
import { formatPrice } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const HOUR_PX = 56;
const DAY_START_HOUR = 7;
const DAY_END_HOUR = 19;
const HOURS_PER_DAY = DAY_END_HOUR - DAY_START_HOUR;

export type GridMode = 'day' | 'week';

export interface WeekGridProps {
  mode: GridMode;
  weekStart: string; // ISO of Monday 00:00
  bookings: BookingBlock[];
  staff: StaffRow[];
  hours: BusinessHourRow[];
  closures: ClosureRow[];
  /** When 'all', blocks are coloured by their staff_id; otherwise uniform. */
  staffFilter: string | 'all';
  /** When set, highlights the day at that index (0=Mon..6=Sun). */
  todayIndex: number | null;
  /** Optional: called when the user clicks an empty hour cell. */
  onEmptyClick?: (date: Date) => void;
  /** Optional: called when the user clicks a booking block. */
  onBookingClick?: (booking: BookingBlock) => void;
}

function dayDate(weekStart: string, offset: number): Date {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + offset);
  return d;
}

function dayLabel(date: Date): { weekday: string; day: number } {
  return {
    weekday: date.toLocaleDateString('en-IE', { weekday: 'short' }),
    day: date.getDate(),
  };
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function minutesFromDayStart(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes() - DAY_START_HOUR * 60;
}

function parseHM(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

interface DayPayload {
  date: Date;
  key: string;
  dayOfWeek: number;
  hour: BusinessHourRow | null;
  closure: ClosureRow | null;
  bookings: BookingBlock[];
}

export function WeekGrid({
  mode,
  weekStart,
  bookings,
  staff,
  hours,
  closures,
  staffFilter,
  todayIndex,
  onEmptyClick,
  onBookingClick,
}: WeekGridProps) {
  const staffById = useMemo(() => {
    const m = new Map<string, StaffRow>();
    for (const s of staff) m.set(s.id, s);
    return m;
  }, [staff]);

  const days: DayPayload[] = useMemo(() => {
    const range: DayPayload[] = [];
    const offsets = mode === 'day' ? [todayIndex ?? 0] : [0, 1, 2, 3, 4, 5, 6];
    for (const i of offsets) {
      const date = dayDate(weekStart, i);
      const key = dateKey(date);
      const dayOfWeek = date.getDay(); // 0 Sun..6 Sat
      const hour = hours.find((h) => h.day_of_week === dayOfWeek) ?? null;
      const closure = closures.find((c) => c.date === key) ?? null;
      const dayBookings = bookings.filter((b) => dateKey(new Date(b.starts_at)) === key);
      range.push({ date, key, dayOfWeek, hour, closure, bookings: dayBookings });
    }
    return range;
  }, [bookings, closures, hours, mode, todayIndex, weekStart]);

  const columns = mode === 'day' ? 1 : 7;
  const gridTemplate = `64px repeat(${columns}, minmax(0, 1fr))`;

  return (
    <Card padding="none" className="overflow-hidden">
      <div
        className="grid border-b border-paper-border dark:border-ink-border"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        <div />
        {days.map((d, i) => {
          const label = dayLabel(d.date);
          const isToday = todayIndex !== null && i + (mode === 'day' ? (todayIndex ?? 0) : 0) === todayIndex;
          const isHighlighted = mode === 'week' ? i === todayIndex : true;
          return (
            <div
              key={d.key}
              className={cn(
                'px-2 py-3 border-l border-paper-border dark:border-ink-border',
                isHighlighted && isToday && 'bg-gold-soft',
              )}
            >
              <div className="text-[10.5px] uppercase tracking-[0.4px] font-medium text-paper-text-3 dark:text-ink-text-3">
                {label.weekday}
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <div
                  className={cn(
                    'text-[17px] font-semibold tabular-nums tracking-tight',
                    isHighlighted && isToday
                      ? 'text-gold'
                      : 'text-paper-text-1 dark:text-ink-text-1',
                  )}
                >
                  {label.day}
                </div>
                {d.bookings.length > 0 && (
                  <div className="text-[10.5px] tabular-nums text-paper-text-3 dark:text-ink-text-3">
                    {d.bookings.length}
                  </div>
                )}
                {d.closure && (
                  <div
                    className="ml-auto text-[9.5px] uppercase tracking-[0.3px] text-amber-600 dark:text-amber-400 font-semibold"
                    title={d.closure.name ?? 'Closed'}
                  >
                    Closed
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="relative grid"
        style={{
          gridTemplateColumns: gridTemplate,
          minHeight: HOURS_PER_DAY * HOUR_PX,
        }}
      >
        <div>
          {Array.from({ length: HOURS_PER_DAY }).map((_, i) => (
            <div
              key={i}
              className="px-2 pt-1 text-[10.5px] tabular-nums text-paper-text-3 dark:text-ink-text-3 border-t border-paper-border dark:border-ink-border"
              style={{ height: HOUR_PX }}
            >
              {String(DAY_START_HOUR + i).padStart(2, '0')}:00
            </div>
          ))}
        </div>
        {days.map((d) => (
          <DayColumn
            key={d.key}
            day={d}
            staffById={staffById}
            staffFilter={staffFilter}
            isToday={
              todayIndex !== null &&
              dateKey(dayDate(weekStart, todayIndex)) === d.key
            }
            onEmptyClick={onEmptyClick}
            onBookingClick={onBookingClick}
          />
        ))}
      </div>
    </Card>
  );
}

function DayColumn({
  day,
  staffById,
  staffFilter,
  isToday,
  onEmptyClick,
  onBookingClick,
}: {
  day: DayPayload;
  staffById: Map<string, StaffRow>;
  staffFilter: string | 'all';
  isToday: boolean;
  onEmptyClick?: (date: Date) => void;
  onBookingClick?: (booking: BookingBlock) => void;
}) {
  const closed = day.closure !== null || day.hour?.is_closed === true;
  const openWindow = day.hour?.open_time
    ? {
        open: parseHM(day.hour.open_time),
        close: parseHM(day.hour.close_time ?? '23:59'),
      }
    : null;

  return (
    <div
      className={cn(
        'relative border-l border-paper-border dark:border-ink-border',
        isToday && 'bg-gold-soft/30',
        closed && 'bg-paper-surface2/40 dark:bg-ink-surface2/40',
      )}
    >
      {!closed &&
        Array.from({ length: HOURS_PER_DAY }).map((_, i) => {
          const hourOfDay = DAY_START_HOUR + i;
          const minutes = hourOfDay * 60;
          const insideOpen =
            !openWindow || (minutes >= openWindow.open && minutes < openWindow.close);
          return (
            <button
              key={i}
              type="button"
              disabled={!insideOpen}
              onClick={() => {
                if (!onEmptyClick) return;
                const d = new Date(day.date);
                d.setHours(hourOfDay, 0, 0, 0);
                onEmptyClick(d);
              }}
              className={cn(
                'block w-full border-t border-paper-border dark:border-ink-border transition-colors',
                insideOpen
                  ? 'hover:bg-paper-surface2 dark:hover:bg-ink-surface2 cursor-pointer'
                  : 'bg-paper-surface2/40 dark:bg-ink-surface2/40 cursor-not-allowed',
              )}
              style={{ height: HOUR_PX }}
              aria-label={`${hourOfDay}:00`}
            />
          );
        })}
      {closed && (
        <div
          className="flex items-center justify-center border-t border-paper-border dark:border-ink-border"
          style={{ height: HOURS_PER_DAY * HOUR_PX }}
        >
          <div className="text-[11px] italic text-paper-text-3 dark:text-ink-text-3">
            {day.closure?.name ?? 'Closed'}
          </div>
        </div>
      )}
      {!closed &&
        day.bookings.map((b) => (
          <BookingCell
            key={b.id}
            booking={b}
            staff={b.staff_id ? staffById.get(b.staff_id) ?? null : null}
            staffFilter={staffFilter}
            onClick={() => onBookingClick?.(b)}
          />
        ))}
    </div>
  );
}

function BookingCell({
  booking,
  staff,
  staffFilter,
  onClick,
}: {
  booking: BookingBlock;
  staff: StaffRow | null;
  staffFilter: string | 'all';
  onClick: () => void;
}) {
  const startMinutes = minutesFromDayStart(booking.starts_at);
  const endMinutes = minutesFromDayStart(booking.ends_at);
  const topPx = (startMinutes / 60) * HOUR_PX;
  const heightPx = Math.max(24, ((endMinutes - startMinutes) / 60) * HOUR_PX - 3);

  const tokens = staff
    ? TILE_PALETTE_MAP[colourForStaff(staff)]
    : TILE_PALETTE_MAP['gold'];
  const tint = `${tokens.mid}22`;
  const border = tokens.mid;

  const isPending = booking.status === 'pending';
  const borderColour = isPending ? '#D97706' : border;
  const tintColour = isPending ? 'rgba(217, 119, 6, 0.13)' : tint;

  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute left-1 right-1 rounded-md px-2 py-1.5 text-left overflow-hidden hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold transition-all"
      style={{
        top: topPx + 1,
        height: heightPx,
        background: tintColour,
        borderLeft: `3px solid ${borderColour}`,
        color: 'inherit',
      }}
    >
      <div className="flex items-center gap-1 mb-0.5">
        <div className="text-[11.5px] font-semibold leading-tight text-paper-text-1 dark:text-ink-text-1 truncate">
          {booking.customer.display_name.split(' ')[0]}
        </div>
      </div>
      <div className="flex items-center justify-between gap-1 text-[10.5px] leading-tight text-paper-text-2 dark:text-ink-text-2">
        <span className="truncate">
          {booking.service.name ?? '—'} · {booking.price_cents === 0 ? 'Free' : formatPrice(booking.price_cents)}
        </span>
        {staff && staffFilter === 'all' && (
          <span
            className="h-3 w-3 rounded-full flex items-center justify-center text-[8px] font-bold text-black shrink-0"
            style={{ background: tokens.mid }}
            aria-hidden
          >
            {staff.name[0]?.toUpperCase()}
          </span>
        )}
      </div>
    </button>
  );
}

// Re-export for the skeleton.
export { HOUR_PX, HOURS_PER_DAY };
