/**
 * Date & time utilities for the booking flow.
 * No dependencies — keeps bundle small.
 */

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
  const weekday = d.toLocaleDateString('en-IE', { weekday: 'short' });
  const day = d.getDate().toString();
  return { weekday: weekday.toUpperCase(), day };
}

export function timeLabel(d: Date): string {
  return d.toLocaleTimeString('en-IE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function friendlyDate(d: Date): string {
  const today = startOfDay(new Date());
  const target = startOfDay(d);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff > 1 && diff < 7) {
    return d.toLocaleDateString('en-IE', { weekday: 'long' });
  }
  return d.toLocaleDateString('en-IE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
