/**
 * Time and price formatting for the AI tab. All booking times are
 * properties of the *business location* (Europe/Dublin), never the
 * customer's local time — formatting must lock to that zone.
 */

const TZ = 'Europe/Dublin';

const longFmt = new Intl.DateTimeFormat('en-IE', {
  timeZone: TZ,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

const timeOnlyFmt = new Intl.DateTimeFormat('en-IE', {
  timeZone: TZ,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

/** "Tuesday 6 May at 3:00 PM" */
export function formatProposalTime(iso: string): string {
  const parts = longFmt.formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const weekday = get('weekday');
  const day = get('day');
  const month = get('month');
  const hour = get('hour');
  const minute = get('minute');
  const dayPeriod = (get('dayPeriod') || '').toUpperCase();
  return `${weekday} ${day} ${month} at ${hour}:${minute} ${dayPeriod}`.trim();
}

/** "3:00 PM" — used for slot chips. */
export function formatSlotTime(iso: string): string {
  return timeOnlyFmt.format(new Date(iso)).replace(/\s?(am|pm)/i, (m) =>
    m.toUpperCase()
  );
}

export function formatPrice(cents: number): string {
  if (cents === 0) return 'Free';
  const euros = cents / 100;
  return euros.toFixed(2).endsWith('.00')
    ? `€${euros.toFixed(0)}`
    : `€${euros.toFixed(2)}`;
}

/** "9:47" — mm:ss, clamped to 0. */
export function formatCountdown(msRemaining: number): string {
  const total = Math.max(0, Math.floor(msRemaining / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
