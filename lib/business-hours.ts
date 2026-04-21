/**
 * Business hours utilities.
 *
 * Reads from the `business_hours` table (one row per day-of-week per
 * business) and answers:
 *   - is this business currently open?
 *   - if not, when does it next open?
 *
 * Used by:
 *   - Tile component's status dot
 *   - Booking flow's "next available slot" pre-selection
 *   - WhatsApp bot's "we're closed but I can book you for…" responses
 *
 * All times are interpreted in the business's local timezone, which we
 * assume is Europe/Dublin for now (single-country product). When we
 * expand abroad, add a `timezone` column to `businesses` and pass it in.
 */

const TIMEZONE = 'Europe/Dublin';

export interface BusinessHourRow {
  /** 0 = Sunday, 1 = Monday, … 6 = Saturday. */
  day_of_week: number;
  /** "HH:MM" in 24h format, e.g. "09:00". Null = closed all day. */
  open_time: string | null;
  close_time: string | null;
}

export type BusinessOpenStatus = 'open' | 'opens-soon' | 'closed';

export interface BusinessOpenness {
  status: BusinessOpenStatus;
  /** Human label like "Open until 8pm" or "Opens tomorrow 9am". */
  label: string;
  /** ISO datetime of next open moment, or null if open now. */
  nextOpenAt: string | null;
}

function parseHM(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${period}` : `${h12}:${m.toString().padStart(2, '0')}${period}`;
}

function nowInBusinessTz(now: Date = new Date()): {
  dayOfWeek: number;
  minuteOfDay: number;
} {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');

  const wkMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return {
    dayOfWeek: wkMap[weekday] ?? 1,
    minuteOfDay: hour * 60 + minute,
  };
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Compute openness for a business given its `business_hours` rows.
 * `closures` array (optional): list of "YYYY-MM-DD" date strings the
 * business is closed on (holidays etc).
 */
export function getBusinessOpenness(
  hours: BusinessHourRow[],
  closures: string[] = [],
  now: Date = new Date(),
): BusinessOpenness {
  const { dayOfWeek, minuteOfDay } = nowInBusinessTz(now);
  const todayHours = hours.find((h) => h.day_of_week === dayOfWeek);

  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const isClosedToday = closures.includes(todayStr);

  if (!isClosedToday && todayHours?.open_time && todayHours.close_time) {
    const openMin = parseHM(todayHours.open_time);
    const closeMin = parseHM(todayHours.close_time);
    if (minuteOfDay >= openMin && minuteOfDay < closeMin) {
      const closingSoon = closeMin - minuteOfDay <= 30;
      return {
        status: closingSoon ? 'opens-soon' : 'open',
        label: closingSoon
          ? `Closes at ${formatTime(closeMin)}`
          : `Open until ${formatTime(closeMin)}`,
        nextOpenAt: null,
      };
    }

    if (minuteOfDay < openMin) {
      const minsUntil = openMin - minuteOfDay;
      const status: BusinessOpenStatus = minsUntil <= 60 ? 'opens-soon' : 'closed';
      return {
        status,
        label: minsUntil <= 60
          ? `Opens in ${minsUntil} min`
          : `Opens at ${formatTime(openMin)}`,
        nextOpenAt: nextOpenIso(now, 0, openMin),
      };
    }
  }

  for (let offset = 1; offset <= 7; offset++) {
    const nextDow = (dayOfWeek + offset) % 7;
    const nextDayHours = hours.find((h) => h.day_of_week === nextDow);
    if (!nextDayHours?.open_time) continue;

    const targetDate = new Date(now.getTime() + offset * 86_400_000);
    const targetStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(targetDate);
    if (closures.includes(targetStr)) continue;

    const openMin = parseHM(nextDayHours.open_time);
    const dayLabel =
      offset === 1
        ? 'tomorrow'
        : offset < 7
        ? DAY_NAMES[nextDow]
        : `next ${DAY_NAMES[nextDow]}`;

    return {
      status: 'closed',
      label: `Opens ${dayLabel} ${formatTime(openMin)}`,
      nextOpenAt: nextOpenIso(now, offset, openMin),
    };
  }

  return {
    status: 'closed',
    label: 'Closed',
    nextOpenAt: null,
  };
}

function nextOpenIso(now: Date, dayOffset: number, minuteOfDay: number): string {
  const d = new Date(now);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(Math.floor(minuteOfDay / 60), minuteOfDay % 60, 0, 0);
  return d.toISOString();
}
