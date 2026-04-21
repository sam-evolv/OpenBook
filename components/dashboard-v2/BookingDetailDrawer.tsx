'use client';

import { Drawer } from './Drawer';
import { StatusPill } from './StatusPill';
import { ContextRow } from './ContextRow';
import { Avatar } from './Avatar';
import type { BookingRow } from './BookingsClient';
import { displayCustomerName } from '@/lib/dashboard-v2/customer';
import { formatPrice, formatDuration } from '@/lib/supabase';

type Status = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'gold';

const STATUS_MAP: Record<BookingRow['status'], { status: Status; label: string }> = {
  confirmed: { status: 'success', label: 'Confirmed' },
  pending: { status: 'warning', label: 'Pending' },
  completed: { status: 'info', label: 'Completed' },
  cancelled: { status: 'danger', label: 'Cancelled' },
};

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

export function BookingDetailDrawer({
  booking,
  open,
  onClose,
}: {
  booking: BookingRow | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!booking) {
    return (
      <Drawer open={open} onClose={onClose} title="Booking">
        <div />
      </Drawer>
    );
  }

  const customerName = displayCustomerName(booking.customers);
  const statusConfig = STATUS_MAP[booking.status];
  const duration = booking.services?.duration_minutes
    ? formatDuration(booking.services.duration_minutes)
    : null;

  return (
    <Drawer open={open} onClose={onClose} title="Booking" subtitle={customerName}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Avatar name={customerName} size="md" />
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-paper-text-1 dark:text-ink-text-1 truncate">
              {customerName}
            </div>
            {booking.customers?.email && (
              <div className="text-[12px] text-paper-text-3 dark:text-ink-text-3 truncate">
                {booking.customers.email}
              </div>
            )}
            {booking.customers?.phone && (
              <div className="text-[12px] text-paper-text-3 dark:text-ink-text-3 truncate">
                {booking.customers.phone}
              </div>
            )}
          </div>
          <div className="ml-auto">
            <StatusPill status={statusConfig.status} dot>
              {statusConfig.label}
            </StatusPill>
          </div>
        </div>

        <section>
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.6px] text-paper-text-3 dark:text-ink-text-3 mb-2">
            Service
          </div>
          <div className="rounded-xl border border-paper-border dark:border-ink-border bg-paper-surface dark:bg-ink-surface">
            <ContextRow
              label="Name"
              value={booking.services?.name ?? '—'}
            />
            {duration && <ContextRow label="Duration" value={duration} />}
            <ContextRow label="Price" value={formatPrice(booking.price_cents)} accent />
          </div>
        </section>

        <section>
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.6px] text-paper-text-3 dark:text-ink-text-3 mb-2">
            When
          </div>
          <div className="rounded-xl border border-paper-border dark:border-ink-border bg-paper-surface dark:bg-ink-surface">
            <ContextRow label="Starts" value={formatWhen(booking.starts_at)} />
            <ContextRow label="Ends" value={formatWhen(booking.ends_at)} />
          </div>
        </section>

        {booking.notes && (
          <section>
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.6px] text-paper-text-3 dark:text-ink-text-3 mb-2">
              Notes
            </div>
            <div className="rounded-xl border border-paper-border dark:border-ink-border bg-paper-surface dark:bg-ink-surface p-4 text-[13px] text-paper-text-1 dark:text-ink-text-1 whitespace-pre-wrap leading-relaxed">
              {booking.notes}
            </div>
          </section>
        )}

        <p className="text-[11.5px] text-paper-text-3 dark:text-ink-text-3 italic">
          Read-only. Cancel / reschedule actions arrive in a later phase.
        </p>
      </div>
    </Drawer>
  );
}
