// Pure-function date-range parser for the optional `when` field on
// search_businesses. ISO dates are handled directly; everything else
// falls through to chrono-node, anchored to Europe/Dublin.

import * as chrono from 'chrono-node';

const DUBLIN_TZ = 'Europe/Dublin';
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type ParsedWhen = { from: Date; to: Date };

// Build a Date for a given Y/M/D + H/M in Europe/Dublin. We compute the
// timezone offset (which may be IST or GMT depending on the date) by
// formatting in en-GB and taking the difference from UTC.
function dublinDate(year: number, month: number, day: number, hour: number, minute: number): Date {
  // Construct the desired wall-clock instant in UTC, then shift by the
  // Dublin offset for that instant.
  const utc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  // Cheap Dublin-offset probe: format the UTC moment in Dublin and read back.
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: DUBLIN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date(utc));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const dublinAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
  const offset = dublinAsUtc - utc;
  return new Date(utc - offset);
}

function dayBoundsInDublin(date: Date): { from: Date; to: Date } {
  // Read the calendar Y/M/D of `date` in Dublin time, then build 00:00 / 23:59 there.
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: DUBLIN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const y = get('year');
  const m = get('month');
  const d = get('day');
  return {
    from: dublinDate(y, m, d, 0, 0),
    to: dublinDate(y, m, d, 23, 59),
  };
}

export function parseWhen(input: { when?: string; now?: Date }): ParsedWhen | null {
  const raw = input.when?.trim();
  if (!raw) return null;
  const now = input.now ?? new Date();

  // ISO date: pin to that calendar day in Dublin.
  if (ISO_DATE_RE.test(raw)) {
    const [y, m, d] = raw.split('-').map(Number);
    return {
      from: dublinDate(y, m, d, 0, 0),
      to: dublinDate(y, m, d, 23, 59),
    };
  }

  // Free text via chrono-node, anchored to `now`.
  const results = chrono.parse(raw, now, { forwardDate: true });
  if (results.length === 0) return null;

  const r = results[0];
  const startDate = r.start.date();
  if (!startDate || Number.isNaN(startDate.getTime())) return null;

  let from: Date;
  let to: Date;

  // If the user specified a meaningful time-of-day, honour it; otherwise
  // pin to a Dublin calendar day.
  const startKnown = r.start.isCertain('hour') || r.start.isCertain('minute');

  if (r.end) {
    const endDate = r.end.date();
    const endKnown = r.end.isCertain('hour') || r.end.isCertain('minute');
    if (startKnown || endKnown) {
      from = startDate;
      to = endDate;
    } else {
      from = dayBoundsInDublin(startDate).from;
      to = dayBoundsInDublin(endDate).to;
    }
  } else if (startKnown) {
    from = startDate;
    to = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
  } else {
    const bounds = dayBoundsInDublin(startDate);
    from = bounds.from;
    to = bounds.to;
  }

  return { from, to };
}
