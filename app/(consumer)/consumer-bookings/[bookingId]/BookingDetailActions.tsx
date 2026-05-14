'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarPlus, MessageCircle, RefreshCcw, X, Star, Phone } from 'lucide-react';
import { friendlyDate } from '@/lib/time';
import { dayPreposition, formatBookingTime } from '@/lib/format-time';

type DisplayStatus = 'confirmed' | 'cancelled' | 'completed' | 'pending';

interface Props {
  bookingId: string;
  serviceId: string;
  serviceName: string;
  startsAtIso: string;
  endsAtIso: string;
  businessName: string;
  businessSlug: string;
  businessAddress: string | null;
  phone: string | null;
  whatsappPhone: string | null;
  accentColour: string;
  displayStatus: DisplayStatus;
}

function toIcsDate(iso: string): string {
  // YYYYMMDDTHHmmssZ
  const d = new Date(iso);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function buildIcs({
  bookingId,
  serviceName,
  businessName,
  startsAtIso,
  endsAtIso,
  address,
}: {
  bookingId: string;
  serviceName: string;
  businessName: string;
  startsAtIso: string;
  endsAtIso: string;
  address: string | null;
}): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//OpenBook//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${bookingId}@openbook.ie`,
    `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
    `DTSTART:${toIcsDate(startsAtIso)}`,
    `DTEND:${toIcsDate(endsAtIso)}`,
    `SUMMARY:${serviceName} · ${businessName}`,
    address ? `LOCATION:${address.replace(/,/g, '\\,')}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  return lines.join('\r\n');
}

export function BookingDetailActions(props: Props) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const {
    bookingId,
    serviceId,
    serviceName,
    startsAtIso,
    endsAtIso,
    businessName,
    businessSlug,
    businessAddress,
    phone,
    whatsappPhone,
    accentColour,
    displayStatus,
  } = props;

  const isCancelled = displayStatus === 'cancelled';
  const isCompleted = displayStatus === 'completed';
  const canModify = !isCancelled && !isCompleted;

  function handleAddToCalendar() {
    if (isCancelled) return;
    const ics = buildIcs({
      bookingId,
      serviceName,
      businessName,
      startsAtIso,
      endsAtIso,
      address: businessAddress,
    });
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${serviceName.replace(/\s+/g, '-').toLowerCase()}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const messageHref = (() => {
    if (whatsappPhone) {
      const digits = whatsappPhone.replace(/[^\d]/g, '');
      return `https://wa.me/${digits}`;
    }
    if (phone) return `tel:${phone}`;
    return null;
  })();

  async function handleCancel() {
    setError(null);
    try {
      const res = await fetch(`/api/consumer-bookings/${bookingId}/cancel`, {
        method: 'POST',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error ?? 'Could not cancel booking');
      }
      setConfirmOpen(false);
      setToast('Booking cancelled');
      startTransition(() => {
        router.push('/consumer-bookings');
        router.refresh();
      });
    } catch (e: any) {
      setError(e?.message ?? 'Could not cancel booking');
    }
  }

  return (
    <section className="flex flex-col gap-2.5">
      <ActionButton
        onClick={handleAddToCalendar}
        disabled={isCancelled}
        icon={<CalendarPlus className="h-4 w-4" strokeWidth={2.2} />}
        label="Add to calendar"
      />

      {messageHref && (
        <ActionButton
          as="a"
          href={messageHref}
          icon={
            whatsappPhone ? (
              <MessageCircle className="h-4 w-4" strokeWidth={2.2} />
            ) : (
              <Phone className="h-4 w-4" strokeWidth={2.2} />
            )
          }
          label={whatsappPhone ? 'Message business' : 'Call business'}
          accentColour={accentColour}
          accent
        />
      )}

      {canModify && (
        <ActionButton
          as="a"
          href={`/booking/${serviceId}?reschedule=${bookingId}`}
          icon={<RefreshCcw className="h-4 w-4" strokeWidth={2.2} />}
          label="Reschedule"
        />
      )}

      {(isCompleted || isCancelled) && (
        <ActionButton
          as="a"
          href={`/booking/${serviceId}?business=${businessSlug}`}
          icon={<RefreshCcw className="h-4 w-4" strokeWidth={2.2} />}
          label="Book again"
        />
      )}

      {isCompleted && (
        <ActionButton
          as="a"
          href={`/business/${businessSlug}#review`}
          icon={<Star className="h-4 w-4" strokeWidth={2.2} />}
          label="Leave a review"
          accentColour={accentColour}
          accent
        />
      )}

      {canModify && (
        <ActionButton
          onClick={() => setConfirmOpen(true)}
          icon={<X className="h-4 w-4" strokeWidth={2.2} />}
          label="Cancel booking"
          destructive
        />
      )}

      {confirmOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => !pending && setConfirmOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl p-6 backdrop-blur-2xl"
            style={{
              background: 'rgba(20,20,20,0.92)',
              border: '0.5px solid rgba(255,255,255,0.1)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-serif text-[22px] font-semibold tracking-tight">
              Cancel this booking?
            </h2>
            <p className="mt-2 text-[14px] text-white/65 leading-relaxed">
              {serviceName} {dayPreposition(friendlyDate(new Date(startsAtIso)))}{' '}
              at {formatBookingTime(startsAtIso)}.
            </p>
            {error && (
              <p className="mt-3 text-[13px]" style={{ color: '#ff8a8a' }}>
                {error}
              </p>
            )}
            <div className="mt-5 flex flex-col gap-2.5">
              <button
                onClick={handleCancel}
                disabled={pending}
                className="h-12 rounded-full font-semibold text-[15px] active:scale-[0.98] transition-transform disabled:opacity-60"
                style={{
                  background: 'rgba(255,90,90,0.14)',
                  border: '0.5px solid rgba(255,90,90,0.35)',
                  color: '#ff8a8a',
                }}
              >
                {pending ? 'Cancelling…' : 'Cancel booking'}
              </button>
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={pending}
                className="h-12 rounded-full font-semibold text-[15px] text-white/85 active:scale-[0.98] transition-transform"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid rgba(255,255,255,0.1)',
                }}
              >
                Keep booking
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="fixed left-1/2 -translate-x-1/2 bottom-[calc(24px+env(safe-area-inset-bottom))] z-[110] px-4 py-2.5 rounded-full text-[13px] font-medium backdrop-blur-xl"
          style={{
            background: 'rgba(20,20,20,0.92)',
            border: '0.5px solid rgba(255,255,255,0.12)',
          }}
        >
          {toast}
        </div>
      )}
    </section>
  );
}

type ActionButtonProps = {
  icon: React.ReactNode;
  label: string;
  accent?: boolean;
  accentColour?: string;
  destructive?: boolean;
  disabled?: boolean;
} & (
  | { as?: 'button'; onClick: () => void; href?: never }
  | { as: 'a'; href: string; onClick?: never }
);

function ActionButton(props: ActionButtonProps) {
  const { icon, label, accent, accentColour, destructive, disabled } = props;

  const baseStyle: React.CSSProperties = destructive
    ? {
        background: 'rgba(255,90,90,0.08)',
        border: '0.5px solid rgba(255,90,90,0.25)',
        color: '#ff8a8a',
      }
    : accent && accentColour
      ? {
          background: `${accentColour}1f`,
          border: `0.5px solid ${accentColour}55`,
          color: accentColour,
        }
      : {
          background: 'rgba(255,255,255,0.04)',
          border: '0.5px solid rgba(255,255,255,0.1)',
          color: 'white',
        };

  const className =
    'h-12 w-full rounded-2xl px-4 flex items-center justify-center gap-2 text-[14px] font-semibold active:scale-[0.99] transition-all disabled:opacity-50 disabled:active:scale-100';

  if (props.as === 'a') {
    return (
      <a href={props.href} className={className} style={baseStyle}>
        {icon}
        {label}
      </a>
    );
  }
  return (
    <button
      onClick={props.onClick}
      disabled={disabled}
      className={className}
      style={baseStyle}
    >
      {icon}
      {label}
    </button>
  );
}
