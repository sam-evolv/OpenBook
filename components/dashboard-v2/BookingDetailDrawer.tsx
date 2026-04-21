'use client';

import { useState, useTransition } from 'react';
import { MessageCircle, CalendarClock, XCircle } from 'lucide-react';
import { Drawer } from './Drawer';
import { StatusPill } from './StatusPill';
import { ContextRow } from './ContextRow';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { formatPrice, formatDuration } from '@/lib/supabase';

type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

type Status = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'gold';
const STATUS_MAP: Record<BookingStatus, { status: Status; label: string }> = {
  confirmed: { status: 'success', label: 'Confirmed' },
  pending: { status: 'warning', label: 'Pending' },
  completed: { status: 'info', label: 'Completed' },
  cancelled: { status: 'danger', label: 'Cancelled' },
};

/**
 * Neutral shape the drawer renders. Both BookingsClient and the Calendar
 * grid adapt their own typed rows into this before passing in.
 */
export interface BookingDetailData {
  id: string;
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
  price_cents: number;
  notes: string | null;
  service_name: string | null;
  service_duration_minutes: number | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  staff_name?: string | null;
  stripe_payment_intent_id?: string | null;
  /** Optional — when known, shown under the name: "Repeat · N previous bookings" or "First-time booking". */
  previous_booking_count?: number | null;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-IE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function whatsappHref(phone: string): string {
  // Strip everything but digits; wa.me requires a plain E.164-ish number.
  const digits = phone.replace(/[^0-9]/g, '');
  return `https://wa.me/${digits}`;
}

interface BookingDetailDrawerProps {
  booking: BookingDetailData | null;
  open: boolean;
  onClose: () => void;
  /**
   * When true, footer shows WhatsApp · Reschedule · Cancel actions.
   * When false (default), a "Read-only" note is shown and no mutating
   * actions are offered. Calendar sets editable; Bookings doesn't.
   */
  editable?: boolean;
  onReschedule?: () => void;
  /**
   * Async — should return ok/error. Drawer handles loading state +
   * closes itself on success. Native confirm is handled by the drawer.
   */
  onCancel?: (id: string) => Promise<{ ok: boolean; error?: string }>;
  previewMode?: boolean;
}

export function BookingDetailDrawer({
  booking,
  open,
  onClose,
  editable = false,
  onReschedule,
  onCancel,
  previewMode,
}: BookingDetailDrawerProps) {
  if (!booking) {
    return (
      <Drawer open={open} onClose={onClose} title="Booking">
        <div />
      </Drawer>
    );
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Booking"
      subtitle={booking.customer_name}
      footer={
        editable ? (
          <EditableFooter
            booking={booking}
            onReschedule={onReschedule}
            onCancel={onCancel}
            onClose={onClose}
            previewMode={previewMode}
          />
        ) : undefined
      }
    >
      <BookingBody booking={booking} editable={editable} />
    </Drawer>
  );
}

function BookingBody({
  booking,
  editable,
}: {
  booking: BookingDetailData;
  editable: boolean;
}) {
  const statusConfig = STATUS_MAP[booking.status];
  const duration = booking.service_duration_minutes
    ? formatDuration(booking.service_duration_minutes)
    : null;

  const repeatLine =
    booking.previous_booking_count == null
      ? null
      : booking.previous_booking_count === 0
        ? 'First-time booking'
        : `Repeat · ${booking.previous_booking_count} previous ${booking.previous_booking_count === 1 ? 'booking' : 'bookings'}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Avatar name={booking.customer_name} size="md" />
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-paper-text-1 dark:text-ink-text-1 truncate">
            {booking.customer_name}
          </div>
          {repeatLine && (
            <div className="text-[11.5px] text-paper-text-3 dark:text-ink-text-3 mt-0.5">
              {repeatLine}
            </div>
          )}
          {booking.customer_email && (
            <div className="text-[12px] text-paper-text-3 dark:text-ink-text-3 truncate">
              {booking.customer_email}
            </div>
          )}
          {booking.customer_phone && (
            <div className="text-[12px] text-paper-text-3 dark:text-ink-text-3 truncate">
              {booking.customer_phone}
            </div>
          )}
        </div>
        <StatusPill status={statusConfig.status} dot>
          {statusConfig.label}
        </StatusPill>
      </div>

      <section>
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.6px] text-paper-text-3 dark:text-ink-text-3 mb-2">
          Details
        </div>
        <div className="rounded-xl border border-paper-border dark:border-ink-border bg-paper-surface dark:bg-ink-surface">
          <ContextRow label="Service" value={booking.service_name ?? '—'} />
          {booking.staff_name && <ContextRow label="Coach" value={booking.staff_name} />}
          <ContextRow label="Starts" value={formatWhen(booking.starts_at)} />
          <ContextRow label="Ends" value={formatWhen(booking.ends_at)} />
          {duration && <ContextRow label="Duration" value={duration} />}
          <ContextRow label="Price" value={formatPrice(booking.price_cents)} accent />
          <ContextRow
            label="Payment"
            value={
              booking.price_cents === 0
                ? '—'
                : booking.stripe_payment_intent_id
                  ? 'Paid via Stripe'
                  : 'Not captured'
            }
          />
        </div>
      </section>

      {booking.notes && (
        <section>
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.6px] text-paper-text-3 dark:text-ink-text-3 mb-2">
            Customer notes
          </div>
          <div className="rounded-xl border border-paper-border dark:border-ink-border bg-paper-surface dark:bg-ink-surface p-4 text-[13px] text-paper-text-1 dark:text-ink-text-1 whitespace-pre-wrap leading-relaxed">
            {booking.notes}
          </div>
        </section>
      )}

      {!editable && (
        <p className="text-[11.5px] text-paper-text-3 dark:text-ink-text-3 italic">
          Read-only. Open this booking from Calendar to cancel or reschedule.
        </p>
      )}
    </div>
  );
}

function EditableFooter({
  booking,
  onReschedule,
  onCancel,
  onClose,
  previewMode,
}: {
  booking: BookingDetailData;
  onReschedule?: () => void;
  onCancel?: (id: string) => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
  previewMode?: boolean;
}) {
  const [isCancelling, startCancel] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const doCancel = () => {
    const label = booking.customer_name ? ` for ${booking.customer_name}` : '';
    const confirmed = window.confirm(
      `Cancel this booking${label}? The customer keeps the record but the slot opens up.`,
    );
    if (!confirmed) return;
    if (previewMode || !onCancel) {
      onClose();
      return;
    }
    startCancel(async () => {
      const res = await onCancel(booking.id);
      if (res.ok) {
        onClose();
      } else {
        setError(res.error ?? 'Could not cancel. Try again.');
      }
    });
  };

  const disabled = booking.status === 'cancelled' || isCancelling;

  return (
    <>
      {booking.customer_phone && (
        <a href={whatsappHref(booking.customer_phone)} target="_blank" rel="noopener noreferrer">
          <Button
            variant="secondary"
            size="md"
            icon={<MessageCircle size={13} strokeWidth={2} />}
          >
            WhatsApp
          </Button>
        </a>
      )}
      <Button
        variant="secondary"
        size="md"
        icon={<CalendarClock size={13} strokeWidth={2} />}
        onClick={onReschedule}
        disabled={disabled || !onReschedule}
      >
        Reschedule
      </Button>
      <Button
        variant="danger"
        size="md"
        icon={<XCircle size={13} strokeWidth={2} />}
        onClick={doCancel}
        disabled={disabled}
      >
        {isCancelling ? 'Cancelling…' : 'Cancel booking'}
      </Button>
      {error && (
        <div className="basis-full text-[12px] text-red-500 dark:text-red-400 text-right">
          {error}
        </div>
      )}
    </>
  );
}
