/**
 * Tiny .ics generator for booking confirmations. Pure function — no IO.
 * Caller wraps the string in a Blob and triggers a download. The format
 * is RFC 5545 (the parts every calendar app actually reads). Fold lines
 * are not emitted because every consumer client we care about (Apple
 * Calendar, Google Calendar, Outlook) accepts long lines, and folding
 * adds parsing fragility.
 */

export interface CalendarEvent {
  id: string;
  startsAt: Date | string;
  endsAt: Date | string;
  summary: string;
  description?: string;
  location?: string;
  url?: string;
}

export function buildBookingIcs(event: CalendarEvent): string {
  const start = typeof event.startsAt === 'string' ? new Date(event.startsAt) : event.startsAt;
  const end = typeof event.endsAt === 'string' ? new Date(event.endsAt) : event.endsAt;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//OpenBook//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@openbook.ie`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${icsEscape(event.summary)}`,
  ];
  if (event.description) lines.push(`DESCRIPTION:${icsEscape(event.description)}`);
  if (event.location) lines.push(`LOCATION:${icsEscape(event.location)}`);
  if (event.url) lines.push(`URL:${icsEscape(event.url)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

function toIcsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

export function downloadIcs(filename: string, ics: string): void {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
