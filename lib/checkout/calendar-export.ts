// Inline .ics generator for the success state's "Add to Calendar" button.
// No external dependency — the .ics format is plain text. We emit the
// minimum that mainstream calendars (Apple Calendar, Google Calendar,
// Outlook) parse reliably.

type IcsInput = {
  uid: string;
  title: string;
  startIso: string;
  endIso: string;
  location?: string | null;
  description?: string | null;
};

function toIcsTimestamp(iso: string): string {
  // 20260508T093000Z — UTC, no separators.
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

export function buildIcsString(input: IcsInput): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//OpenBook//Checkout//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${input.uid}@openbook.ie`,
    `DTSTAMP:${toIcsTimestamp(new Date().toISOString())}`,
    `DTSTART:${toIcsTimestamp(input.startIso)}`,
    `DTEND:${toIcsTimestamp(input.endIso)}`,
    `SUMMARY:${escapeText(input.title)}`,
  ];
  if (input.location) lines.push(`LOCATION:${escapeText(input.location)}`);
  lines.push(`DESCRIPTION:${escapeText(input.description ?? 'Booked via OpenBook')}`);
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

// Triggers a client-side download of the .ics for the given booking.
// Safe to call only in the browser — guards against SSR/SSG.
export function downloadIcs(input: IcsInput, filename = 'openbook-booking.ics') {
  if (typeof window === 'undefined') return;
  const blob = new Blob([buildIcsString(input)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
