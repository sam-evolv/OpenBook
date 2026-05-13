/**
 * Europe/Dublin time formatters for consumer-facing UI.
 *
 * All functions compute against the Dublin timezone, not the host's local
 * time, so the same `Date` instant renders identically on Vercel (UTC) and
 * a developer laptop (anywhere). Pure functions, no side effects.
 */

const DUBLIN = 'Europe/Dublin';

const DAY_KEY_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: DUBLIN,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const WEEKDAY_FMT = new Intl.DateTimeFormat('en-IE', {
  timeZone: DUBLIN,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

// Use en-US for the time formatter so we get uppercase "PM" rather than
// the lowercase "p.m." the en-IE locale emits on current ICU builds. The
// timezone is still Dublin, so the rendered hour is correct.
const TIME_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: DUBLIN,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

const FULL_DATE_FMT = new Intl.DateTimeFormat('en-IE', {
  timeZone: DUBLIN,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function dublinDateKey(d: Date): string {
  return DAY_KEY_FMT.format(d);
}

function addUtcDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

/**
 * "Today" / "Tomorrow" / "Tue 12 May" — computed by comparing the Dublin
 * calendar date of `slot` against today/tomorrow in Dublin. Robust across
 * DST transitions because the calendar-date keys come from Intl with the
 * Dublin timezone, not from arithmetic on local-time fields.
 */
export function formatDayLabel(slot: Date, now: Date = new Date()): string {
  const todayKey = dublinDateKey(now);
  const tomorrowKey = dublinDateKey(addUtcDays(now, 1));
  const slotKey = dublinDateKey(slot);
  if (slotKey === todayKey) return 'Today';
  if (slotKey === tomorrowKey) return 'Tomorrow';
  return WEEKDAY_FMT.format(slot);
}

/** "3:00 PM – 3:45 PM" in Dublin. */
export function formatTimeRange(start: Date, durationMinutes: number): string {
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return `${TIME_FMT.format(start)} – ${TIME_FMT.format(end)}`;
}

/** "12 May 2026" in Dublin. */
export function formatFullDate(d: Date): string {
  return FULL_DATE_FMT.format(d);
}

const SHORT_WEEKDAY_FMT = new Intl.DateTimeFormat('en-IE', {
  timeZone: DUBLIN,
  weekday: 'short',
});

const SHORT_HOUR_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: DUBLIN,
  hour: 'numeric',
  hour12: true,
});

const SHORT_HOUR_MINUTE_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: DUBLIN,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

/**
 * Push-payload-friendly slot label, e.g. "Tue 6pm" for an on-the-hour
 * slot or "Tue 6:30pm" otherwise. Always Dublin time.
 */
export function formatShortSlotDublin(d: Date): string {
  const weekday = SHORT_WEEKDAY_FMT.format(d);
  const minutesInDublin = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: DUBLIN,
      minute: '2-digit',
    }).format(d),
  );
  const time = (minutesInDublin === 0 ? SHORT_HOUR_FMT : SHORT_HOUR_MINUTE_FMT)
    .format(d)
    .replace(' ', '')
    .toLowerCase();
  return `${weekday} ${time}`;
}

/**
 * Push-payload-friendly booking time, e.g. "Tomorrow at 6:30pm" or
 * "Friday at 9am" depending on how far out the booking sits. Always
 * Dublin time.
 */
export function formatBookingTimeDublin(d: Date, now: Date = new Date()): string {
  const time = SHORT_HOUR_MINUTE_FMT.format(d).replace(' ', '').toLowerCase();
  const dayLabel = formatDayLabel(d, now);
  return `${dayLabel} at ${time}`;
}
