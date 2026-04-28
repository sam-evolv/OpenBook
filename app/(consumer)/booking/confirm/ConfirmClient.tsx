'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { BookingConfirmation } from '@/components/BookingConfirmation';

interface BookingView {
  id: string;
  status: string;
  serviceId: string;
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

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 15;

export function ConfirmClient({
  booking,
  cancelled,
}: {
  booking: BookingView;
  cancelled: boolean;
}) {
  const router = useRouter();
  const [stuck, setStuck] = useState(false);

  // Poll while the booking is awaiting payment so the success view
  // appears as soon as the webhook flips status to 'confirmed'.
  // Capped at POLL_MAX_ATTEMPTS to avoid spinning forever if the
  // webhook never lands.
  useEffect(() => {
    if (booking.status !== 'awaiting_payment' || stuck) return;

    let attempts = 0;
    const interval = window.setInterval(() => {
      attempts += 1;
      if (attempts >= POLL_MAX_ATTEMPTS) {
        window.clearInterval(interval);
        setStuck(true);
        return;
      }
      router.refresh();
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [booking.status, stuck, router]);

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

  // Customer hit "back" from Stripe Checkout. The booking row will
  // remain in 'awaiting_payment' until the expired webhook fires —
  // surface the cancellation now rather than show a spinner.
  if (cancelled && booking.status === 'awaiting_payment') {
    return (
      <StatusPanel
        title="Payment cancelled"
        body="Your booking is no longer reserved. Pick another time and try again."
        actionLabel="Try again"
        onAction={() => router.push(`/booking/${booking.serviceId}`)}
      />
    );
  }

  if (booking.status === 'awaiting_payment') {
    if (stuck) {
      return (
        <StatusPanel
          title="Still confirming your payment..."
          body="This is taking longer than expected. Refresh to check again or contact support if it persists."
          actionLabel="Refresh"
          onAction={() => {
            setStuck(false);
            router.refresh();
          }}
        />
      );
    }
    return (
      <StatusPanel
        title="Confirming your payment..."
        body="One moment — Stripe is letting us know your payment went through."
        spinning
      />
    );
  }

  if (booking.status === 'payment_failed') {
    return (
      <StatusPanel
        title="Your payment didn't go through"
        body="Stripe declined the charge. You can try again or pick another time."
        actionLabel="Try again"
        onAction={() => router.push(`/booking/${booking.serviceId}`)}
      />
    );
  }

  if (booking.status === 'expired') {
    return (
      <StatusPanel
        title="Your booking session expired"
        body="The 15-minute payment window passed. Pick a new time and try again."
        actionLabel="Try again"
        onAction={() => router.push(`/booking/${booking.serviceId}`)}
      />
    );
  }

  if (booking.status === 'cancelled') {
    return (
      <StatusPanel
        title="This booking was cancelled"
        body="If this wasn't you, please contact the business directly."
      />
    );
  }

  // status === 'confirmed' or 'completed' — celebratory success view.
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

function StatusPanel({
  title,
  body,
  spinning,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  spinning?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        textAlign: 'center',
      }}
    >
      {spinning && (
        <div style={{ marginBottom: 32 }}>
          <Loader2
            className="animate-spin"
            style={{
              width: 48,
              height: 48,
              color: 'rgba(255,255,255,0.55)',
              strokeWidth: 1.5,
            }}
          />
        </div>
      )}

      <h1
        style={{
          margin: 0,
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: 'rgba(255,255,255,0.95)',
          maxWidth: 320,
        }}
      >
        {title}
      </h1>

      <p
        style={{
          margin: '12px 0 0 0',
          fontSize: 14,
          lineHeight: 1.5,
          color: 'rgba(255,255,255,0.55)',
          maxWidth: 320,
        }}
      >
        {body}
      </p>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            marginTop: 32,
            padding: '14px 28px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.95)',
            color: '#000',
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: '-0.01em',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
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
