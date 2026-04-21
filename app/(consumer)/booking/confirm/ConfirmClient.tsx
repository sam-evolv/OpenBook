'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { BookingConfirmation } from '@/components/BookingConfirmation';

interface BookingView {
  id: string;
  businessSlug: string;
  businessName: string;
  businessCoverUrl: string | null;
  serviceName: string;
  startIso: string;
  endIso: string;
  priceLabel: string;
  durationLabel: string;
  dateLabel: string;
  timeLabel: string;
  tileColour: string;
}

export function ConfirmClient({ booking }: { booking: BookingView }) {
  const router = useRouter();

  function addToCalendar() {
    const ics = buildIcs(booking);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `openbook-${booking.id.slice(0, 8)}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <BookingConfirmation
      title="You're booked in"
      subtitle={`${booking.businessName} · ${booking.dateLabel} at ${booking.timeLabel}`}
      actions={[
        { label: 'Add to calendar', onClick: addToCalendar },
        {
          label: 'View your bookings',
          primary: true,
          onClick: () => router.push('/consumer-bookings'),
        },
      ]}
    >
      <div
        style={{
          borderRadius: 18,
          border: '0.5px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.03)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: 16,
            borderBottom: '0.5px solid rgba(255,255,255,0.06)',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: 44,
              height: 44,
              borderRadius: 12,
              overflow: 'hidden',
              flexShrink: 0,
              background: `linear-gradient(145deg, ${booking.tileColour} 0%, ${booking.tileColour}55 100%)`,
            }}
          >
            {booking.businessCoverUrl && (
              <Image
                src={booking.businessCoverUrl}
                alt={booking.businessName}
                fill
                sizes="44px"
                style={{ objectFit: 'cover' }}
              />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: 'rgba(255,255,255,0.55)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {booking.businessName}
            </p>
            <h2
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 600,
                letterSpacing: '-0.01em',
                color: 'rgba(255,255,255,0.95)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {booking.serviceName}
            </h2>
          </div>
        </div>

        <DetailRow label="Date" value={booking.dateLabel} />
        <DetailRow label="Time" value={booking.timeLabel} />
        <DetailRow label="Duration" value={booking.durationLabel} />
        <DetailRow label="Total" value={booking.priceLabel} valueColour={booking.tileColour} last />
      </div>
    </BookingConfirmation>
  );
}

function DetailRow({
  label,
  value,
  valueColour,
  last,
}: {
  label: string;
  value: string;
  valueColour?: string;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: last ? 'none' : '0.5px solid rgba(255,255,255,0.05)',
      }}
    >
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{label}</span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: '-0.01em',
          color: valueColour ?? 'rgba(255,255,255,0.95)',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function buildIcs(b: BookingView): string {
  const dtstamp = toIcsDate(new Date());
  const dtstart = toIcsDate(new Date(b.startIso));
  const dtend = toIcsDate(new Date(b.endIso));
  const uid = `${b.id}@openbook.ie`;
  const summary = icsEscape(`${b.serviceName} — ${b.businessName}`);
  const description = icsEscape(`Booking with ${b.businessName} via OpenBook.`);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//OpenBook//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

function toIcsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}
