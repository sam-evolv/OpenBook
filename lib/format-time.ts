/**
 * Consumer-app date formatters — single source for booking/listing labels.
 *
 * All functions render in Europe/Dublin so a Vercel function (UTC) and a
 * developer laptop (anywhere) emit identical strings. Reuses date-fns-tz
 * because we already depend on it for the share/confirmation card.
 *
 * Use these helpers anywhere a booking time renders consumer-side:
 *   - `formatBookingDateTime` — "Friday, 16 May · 17:00"
 *   - `formatBookingTime`     — "17:00"
 *   - `formatBookingDay`      — "Today" / "Tomorrow" / "Thu 14 May"
 *   - `formatBookingDayTime`  — "Today · 17:00" (list rows)
 */

import { formatInTimeZone } from 'date-fns-tz';
import { enIE } from 'date-fns/locale';

const DUBLIN = 'Europe/Dublin';

const DAY_KEY_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: DUBLIN,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function dublinDateKey(d: Date): string {
  return DAY_KEY_FMT.format(d);
}

function addUtcDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

function asDate(input: Date | string): Date {
  return typeof input === 'string' ? new Date(input) : input;
}

/** "Friday, 16 May · 17:00" — full booking datetime, 24h. */
export function formatBookingDateTime(input: Date | string): string {
  return formatInTimeZone(asDate(input), DUBLIN, "EEEE, d MMM '·' HH:mm", {
    locale: enIE,
  });
}

/** "17:00" — Dublin local, 24h. */
export function formatBookingTime(input: Date | string): string {
  return formatInTimeZone(asDate(input), DUBLIN, 'HH:mm', { locale: enIE });
}

/** "Today" / "Tomorrow" / "Thu 14 May". */
export function formatBookingDay(input: Date | string, now: Date = new Date()): string {
  const d = asDate(input);
  const todayKey = dublinDateKey(now);
  const tomorrowKey = dublinDateKey(addUtcDays(now, 1));
  const slotKey = dublinDateKey(d);
  if (slotKey === todayKey) return 'Today';
  if (slotKey === tomorrowKey) return 'Tomorrow';
  return formatInTimeZone(d, DUBLIN, 'EEE d MMM', { locale: enIE });
}

/** "Today · 17:00" / "Thu 14 May · 17:00" — booking-list row label. */
export function formatBookingDayTime(input: Date | string, now: Date = new Date()): string {
  return `${formatBookingDay(input, now)} · ${formatBookingTime(input)}`;
}

/**
 * Apply the right preposition + day phrasing for inline sentences.
 * Returns "today", "tomorrow", or "on Thu 14 May" — never "on Today",
 * which is ungrammatical. The caller writes the surrounding sentence,
 * e.g. `${serviceName} ${dayPreposition(day)} at ${time}`.
 */
export function dayPreposition(dayLabel: string): string {
  const lower = dayLabel.trim().toLowerCase();
  if (lower === 'today' || lower === 'tomorrow') return lower;
  return `on ${dayLabel}`;
}
