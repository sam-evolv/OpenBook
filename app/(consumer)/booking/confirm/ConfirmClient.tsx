'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Calendar, Loader2, RefreshCcw, Share2 } from 'lucide-react';
import { ShareableConfirmationCard } from '@/components/consumer/ShareableConfirmationCard';
import { BookingShareModal } from '@/components/consumer/BookingShareModal';
import { buildBookingIcs, downloadIcs } from '@/lib/calendar';
import { haptics } from '@/lib/haptics';

interface BookingView {
  id: string;
  status: string;
  serviceId: string;
  businessSlug: string;
  businessName: string;
  businessCategory: string | null;
  businessLogoUrl: string | null;
  businessProcessedIconUrl: string | null;
  businessCity: string | null;
  serviceName: string;
  startIso: string;
  endIso: string;
  priceLabel: string;
  durationLabel: string;
  /** "Friday, 16 May · 7:30 PM" */
  dateTimeLabel: string;
  /** Hex like '#D4AF37'. */
  primaryColourHex: string;
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
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('https://app.openbook.ie');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShareUrl(window.location.origin);
    }
  }, []);

  // Mirror the success haptic the previous BookingConfirmation
  // wrapper fired — we removed that wrapper but want to keep the
  // tactile cue at the same moment in the animation (after the
  // card fades in).
  const isSuccess = booking.status === 'confirmed' || booking.status === 'completed';
  useEffect(() => {
    if (!isSuccess) return;
    const timer = window.setTimeout(() => haptics.success(), 320);
    return () => window.clearTimeout(timer);
  }, [isSuccess]);

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
    haptics.tap();
    const ics = buildBookingIcs({
      id: booking.id,
      startsAt: booking.startIso,
      endsAt: booking.endIso,
      summary: `${booking.serviceName} — ${booking.businessName}`,
      description: `Booking with ${booking.businessName} via OpenBook.`,
      location: booking.businessCity ?? undefined,
      url: `${shareUrl}/business/${booking.businessSlug}`,
    });
    downloadIcs(`openbook-${booking.id.slice(0, 8)}.ics`, ics);
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
  // The card itself is the screenshot zone; CTAs and receipt sit
  // outside that zone, below the natural iPhone fold.
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8px 16px 120px',
        gap: 24,
        maxWidth: 460,
        margin: '0 auto',
      }}
    >
      <div
        data-screenshot-zone
        style={{
          width: '100%',
          opacity: 0,
          animation: 'ob-card-fade 520ms cubic-bezier(0.2, 0.9, 0.3, 1) 80ms forwards',
        }}
      >
        <ShareableConfirmationCard
          businessName={booking.businessName}
          businessSlug={booking.businessSlug}
          businessCategory={booking.businessCategory}
          businessLogoUrl={booking.businessLogoUrl}
          businessProcessedIconUrl={booking.businessProcessedIconUrl}
          primaryColourHex={booking.primaryColourHex}
          serviceName={booking.serviceName}
          dateTimeLabel={booking.dateTimeLabel}
        />
      </div>

      <div
        style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 10,
          opacity: 0,
          animation: 'ob-card-fade 420ms cubic-bezier(0.2, 0.9, 0.3, 1) 320ms forwards',
        }}
      >
        <button
          type="button"
          onClick={addToCalendar}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '16px 18px',
            borderRadius: 14,
            border: '0.5px solid rgba(255,255,255,0.14)',
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.92)',
            fontSize: 15,
            fontWeight: 500,
            letterSpacing: '-0.01em',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <Calendar size={16} strokeWidth={2} />
          <span>Add to Calendar</span>
        </button>
        <button
          type="button"
          onClick={() => {
            haptics.tap();
            setShareOpen(true);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '16px 18px',
            borderRadius: 14,
            border: 'none',
            background: '#D4AF37',
            color: '#080808',
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: '-0.01em',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <Share2 size={16} strokeWidth={2.2} />
          <span>Share</span>
        </button>
      </div>

      <div
        style={{
          width: '100%',
          marginTop: 8,
          borderRadius: 18,
          border: '0.5px solid rgba(255,255,255,0.07)',
          background: 'rgba(255,255,255,0.02)',
          overflow: 'hidden',
          opacity: 0,
          animation: 'ob-card-fade 420ms cubic-bezier(0.2, 0.9, 0.3, 1) 480ms forwards',
        }}
      >
        <DetailRow label="Date & time" value={booking.dateTimeLabel} />
        <DetailRow label="Duration" value={booking.durationLabel} />
        {booking.businessCity && <DetailRow label="Location" value={booking.businessCity} />}
        <DetailRow
          label="Total"
          value={booking.priceLabel}
          valueColour={booking.primaryColourHex}
        />
        <DetailRow
          label="Cancellation"
          value="Free up to 24h before"
          subdued
          last
        />
      </div>

      <Link
        href={`/booking/${booking.serviceId}?business=${booking.businessSlug}`}
        prefetch={false}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginTop: -8,
          padding: '10px 18px',
          borderRadius: 999,
          border: '0.5px solid rgba(255,255,255,0.10)',
          background: 'transparent',
          color: 'rgba(255,255,255,0.78)',
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: '-0.005em',
          textDecoration: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <RefreshCcw size={14} strokeWidth={2.2} />
        <span>Book again</span>
      </Link>

      <BookingShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        bookingId={booking.id}
        shareTitle={`${booking.businessName} · ${booking.dateTimeLabel}`}
        shareText={`I'm booked in for ${booking.serviceName} at ${booking.businessName}.`}
        shareUrl={shareUrl}
        primaryColourHex={booking.primaryColourHex}
      />

      <style jsx global>{`
        @keyframes ob-card-fade {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
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
  subdued,
  last,
}: {
  label: string;
  value: string;
  valueColour?: string;
  subdued?: boolean;
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
          fontWeight: subdued ? 400 : 600,
          letterSpacing: '-0.01em',
          color:
            valueColour ??
            (subdued ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.95)'),
        }}
      >
        {value}
      </span>
    </div>
  );
}
