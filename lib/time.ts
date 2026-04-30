/**
 * Date & time utilities for the booking flow.
 * No dependencies — keeps bundle small.
 *
 * All *display* helpers below format in Europe/Dublin. Booking times
 * are properties of the business location (Ireland), not the
 * customer's runtime — and the Vercel server runs in UTC, so without
 * an explicit timeZone the rendered strings are an hour off during BST.
 */

const DUBLIN_TZ = 'Europe/Dublin';

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addMinutes(d: Date, mins: number): Date {
  return new Date(d.getTime() + mins * 60000);
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function dayLabel(d: Date): { weekday: string; day: string } {
  const weekday = d.toLocaleDateString('en-IE', {
    timeZone: DUBLIN_TZ,
    weekday: 'short',
  });
  const day = d.toLocaleDateString('en-IE', {
    timeZone: DUBLIN_TZ,
    day: 'numeric',
  });
  return { weekday: weekday.toUpperCase(), day };
}

export function timeLabel(d: Date): string {
  return d.toLocaleTimeString('en-IE', {
    timeZone: DUBLIN_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** YYYY-MM-DD in Europe/Dublin — used for day-diff calendar comparison. */
function dublinDateKey(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: DUBLIN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function friendlyDate(d: Date): string {
  const todayKey = dublinDateKey(new Date());
  const targetKey = dublinDateKey(d);
  const diff = Math.round(
    (Date.parse(targetKey) - Date.parse(todayKey)) / 86400000
  );
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff > 1 && diff < 7) {
    return d.toLocaleDateString('en-IE', {
      timeZone: DUBLIN_TZ,
      weekday: 'long',
    });
  }
  return d.toLocaleDateString('en-IE', {
    timeZone: DUBLIN_TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
