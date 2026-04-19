'use client';

import Link from 'next/link';
import { Calendar, Clock, Phone, Mail, CheckCircle2, XCircle } from 'lucide-react';

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

export function BookingsList({ bookings, activeFilter }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {/* Filter tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        {FILTERS.map((f) => {
          const active = activeFilter === f.id;
          return (
            <Link
              key={f.id}
              href={`/dashboard/bookings?filter=${f.id}`}
              className="px-3 py-2 text-[13px] font-medium transition-colors relative"
              style={{
                color: active ? '#fff' : 'rgba(255,255,255,0.5)',
              }}
            >
              {f.label}
              {active && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: '#D4AF37' }}
                />
              )}
            </Link>
          );
        })}
      </div>

      {/* List */}
      {bookings.length === 0 ? (
        <div
          className="rounded-xl p-12 text-center"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '0.5px solid rgba(255,255,255,0.06)',
          }}
        >
          <Calendar
            className="mx-auto mb-3 h-8 w-8"
            style={{ color: 'rgba(255,255,255,0.25)' }}
            strokeWidth={1.5}
          />
          <p className="text-[14px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
            No {activeFilter !== 'all' && activeFilter} bookings yet.
          </p>
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden divide-y"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '0.5px solid rgba(255,255,255,0.06)',
          }}
        >
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
    : 'Walk-in customer';

  const isPast = date.getTime() < Date.now();
  const isCancelled = booking.status === 'cancelled';

  return (
    <div className="flex items-center gap-4 p-4">
      <div
        className="flex flex-col items-center justify-center rounded-lg px-3 py-2 shrink-0"
        style={{
          background: isCancelled
            ? 'rgba(255,255,255,0.03)'
            : 'rgba(212,175,55,0.1)',
          minWidth: 56,
          opacity: isCancelled ? 0.5 : 1,
        }}
      >
        <span
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: isCancelled ? 'rgba(255,255,255,0.4)' : '#D4AF37' }}
        >
          {date.toLocaleDateString('en-IE', { month: 'short' })}
        </span>
        <span className="text-[18px] font-bold leading-none mt-0.5">
          {date.getDate()}
        </span>
        <span
          className="text-[10px] mt-0.5 tabular-nums"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          {date.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p
            className="text-[14px] font-semibold truncate"
            style={{ opacity: isCancelled ? 0.5 : 1 }}
          >
            {customerName}
          </p>
          {isCancelled && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide"
              style={{ color: 'rgba(255,100,100,0.9)', background: 'rgba(255,100,100,0.1)' }}
            >
              Cancelled
            </span>
          )}
          {!isCancelled && isPast && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide"
              style={{ color: 'rgba(100,255,150,0.9)', background: 'rgba(100,255,150,0.1)' }}
            >
              Done
            </span>
          )}
        </div>
        <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
          {booking.services?.name ?? 'Service'}
          {booking.services?.duration_minutes && ` · ${booking.services.duration_minutes} min`}
        </p>
        <div className="flex items-center gap-3 mt-1">
          {customer?.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="flex items-center gap-1 text-[11px]"
              style={{ color: 'rgba(255,255,255,0.45)' }}
            >
              <Phone className="h-3 w-3" strokeWidth={1.8} />
              {customer.phone}
            </a>
          )}
          {customer?.email && (
            <a
              href={`mailto:${customer.email}`}
              className="flex items-center gap-1 text-[11px] truncate"
              style={{ color: 'rgba(255,255,255,0.45)' }}
            >
              <Mail className="h-3 w-3" strokeWidth={1.8} />
              {customer.email}
            </a>
          )}
        </div>
      </div>

      <span
        className="text-[14px] font-semibold tabular-nums"
        style={{ color: isCancelled ? 'rgba(255,255,255,0.3)' : '#D4AF37' }}
      >
        €{((booking.price_cents ?? 0) / 100).toFixed(0)}
      </span>
    </div>
  );
}
