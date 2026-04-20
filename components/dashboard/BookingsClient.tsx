'use client';

import Link from 'next/link';
import { Calendar, Phone, Mail } from 'lucide-react';

type Filter = 'upcoming' | 'past' | 'cancelled' | 'all';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'all', label: 'All' },
];

interface Props {
  bookings: any[];
  activeFilter: Filter;
}

export function BookingsClient({ bookings, activeFilter }: Props) {
  return (
    <div className="flex flex-col gap-6 dash-fade-in">
      <div>
        <h1
          className="text-[24px] font-semibold leading-none"
          style={{ color: 'var(--fg-0)', letterSpacing: '-0.02em' }}
        >
          Bookings
        </h1>
        <p className="mt-1.5 text-[13px]" style={{ color: 'var(--fg-1)' }}>
          Every booking customers have made.
        </p>
      </div>

      <div className="flex gap-1.5">
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            href={`/dashboard/bookings?filter=${f.id}`}
            className="dash-chip"
            data-active={activeFilter === f.id}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {bookings.length === 0 ? (
        <div
          className="dash-card p-12 text-center"
          style={{ background: 'var(--bg-1)' }}
        >
          <div
            className="mx-auto mb-3 h-10 w-10 rounded-full flex items-center justify-center"
            style={{ background: 'var(--bg-3)' }}
          >
            <Calendar className="h-4 w-4" style={{ color: 'var(--fg-2)' }} strokeWidth={1.6} />
          </div>
          <p className="text-[13px] font-medium" style={{ color: 'var(--fg-0)' }}>
            No {activeFilter !== 'all' && activeFilter} bookings
          </p>
          <p className="mt-1 text-[12px]" style={{ color: 'var(--fg-2)' }}>
            {activeFilter === 'upcoming'
              ? 'Share your booking link to start getting customers'
              : 'Nothing to show here yet'}
          </p>
        </div>
      ) : (
        <div
          className="dash-card overflow-hidden"
          style={{ background: 'var(--bg-1)' }}
        >
          <div
            className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 py-2 text-[11px] font-medium uppercase tracking-wider border-b"
            style={{ color: 'var(--fg-2)', borderColor: 'var(--border-1)' }}
          >
            <span>When</span>
            <span>Customer</span>
            <span>Service</span>
            <span className="text-right">Amount</span>
          </div>
          {bookings.map((b: any) => (
            <BookingRow key={b.id} booking={b} />
          ))}
        </div>
      )}
    </div>
  );
}

function BookingRow({ booking }: { booking: any }) {
  const date = new Date(booking.starts_at);
  const customer = booking.customers;
  const customerName = customer?.first_name
    ? `${customer.first_name} ${customer.last_name ?? ''}`.trim()
    : 'Walk-in';
  const isCancelled = booking.status === 'cancelled';

  return (
    <div
      className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 py-3 items-center transition-colors"
      style={{
        borderBottom: '0.5px solid var(--border-1)',
        opacity: isCancelled ? 0.5 : 1,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-2)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <div className="flex flex-col tabular-nums">
        <span className="text-[13px] font-medium" style={{ color: 'var(--fg-0)' }}>
          {date.toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })}
        </span>
        <span className="text-[11px] font-mono" style={{ color: 'var(--fg-2)' }}>
          {date.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-medium truncate" style={{ color: 'var(--fg-0)' }}>
            {customerName}
          </p>
          {isCancelled && (
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wide"
              style={{ color: 'var(--danger)', background: 'var(--danger-bg)' }}
            >
              Cancelled
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {customer?.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="flex items-center gap-1 text-[11px] font-mono"
              style={{ color: 'var(--fg-2)' }}
            >
              <Phone className="h-[11px] w-[11px]" strokeWidth={1.8} />
              {customer.phone}
            </a>
          )}
          {customer?.email && (
            <a
              href={`mailto:${customer.email}`}
              className="flex items-center gap-1 text-[11px] font-mono truncate max-w-[200px]"
              style={{ color: 'var(--fg-2)' }}
            >
              <Mail className="h-[11px] w-[11px]" strokeWidth={1.8} />
              {customer.email}
            </a>
          )}
        </div>
      </div>
      <span className="text-[12px]" style={{ color: 'var(--fg-1)' }}>
        {booking.services?.name ?? 'Service'}
      </span>
      <span className="text-[13px] font-medium tabular-nums text-right" style={{ color: 'var(--fg-0)' }}>
        €{((booking.price_cents ?? 0) / 100).toFixed(0)}
      </span>
    </div>
  );
}
