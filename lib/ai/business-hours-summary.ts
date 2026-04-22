/**
 * Compact business-hours summariser for AI prompts.
 *
 * Takes the raw `business_hours` rows and produces a single short
 * string like `"Mon-Fri 9:00-18:00, Sat 10:00-16:00, Sun closed"`.
 * Groups consecutive days with identical open/close times into a
 * range, prints single-day rows as-is.
 *
 * The AI brain already has a longer per-day listing; this version is
 * scoped to the suggest-reply prompt, which wants a short availability
 * hint without flooding the context.
 */

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

interface HoursRow {
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean | null;
  is_open: boolean | null;
}

function trimHM(t: string | null): string {
  if (!t) return '—';
  // Supabase returns time as "HH:mm:ss" — lop the seconds.
  return t.length >= 5 ? t.slice(0, 5) : t;
}

function isEffectivelyClosed(row: HoursRow): boolean {
  if (row.is_closed === true) return true;
  if (row.is_open === false) return true;
  if (!row.open_time || !row.close_time) return true;
  return false;
}

function signatureOf(row: HoursRow): string {
  if (isEffectivelyClosed(row)) return 'closed';
  return `${trimHM(row.open_time)}-${trimHM(row.close_time)}`;
}

export function summariseBusinessHours(rows: HoursRow[] | null | undefined): string {
  if (!rows || rows.length === 0) return 'Hours not set';

  // Sort by day_of_week; Monday-first feels more natural than Sunday-first
  // in an IE business context, so shift day 0 (Sunday) to the end.
  const ordered = [...rows].sort((a, b) => {
    const ma = a.day_of_week === 0 ? 7 : a.day_of_week;
    const mb = b.day_of_week === 0 ? 7 : b.day_of_week;
    return ma - mb;
  });

  const groups: Array<{ start: number; end: number; sig: string }> = [];
  for (const row of ordered) {
    const sig = signatureOf(row);
    const last = groups[groups.length - 1];
    if (last && last.sig === sig && row.day_of_week === (last.end + 1) % 7) {
      last.end = row.day_of_week;
    } else {
      groups.push({ start: row.day_of_week, end: row.day_of_week, sig });
    }
  }

  return groups
    .map((g) => {
      const startName = DAY_NAMES[g.start];
      const endName = DAY_NAMES[g.end];
      const label = g.start === g.end ? startName : `${startName}-${endName}`;
      return `${label} ${g.sig}`;
    })
    .join(', ');
}
