'use client'

import { useState, useMemo } from 'react'
import { Search, Download, X, MoreHorizontal, Eye, Edit, XCircle, CheckCircle } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { format, isToday, isFuture, isPast } from 'date-fns'

interface BookingRow {
  id: string
  starts_at: string
  status: string
  price_cents: number
  source: string
  service: { name: string; colour: string } | null
  customer: { name: string; email: string; phone: string | null } | null
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  confirmed:  { bg: 'rgba(16,185,129,0.15)',  color: '#10b981' },
  cancelled:  { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444' },
  completed:  { bg: 'rgba(212,175,55,0.15)',   color: '#D4AF37' },
  no_show:    { bg: 'rgba(255,255,255,0.08)',  color: 'rgba(255,255,255,0.4)' },
}

const SOURCE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  app:       { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', label: 'App' },
  whatsapp:  { bg: 'rgba(34,197,94,0.15)',  color: '#22c55e', label: 'WhatsApp' },
  dashboard: { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', label: 'Manual' },
  claude:    { bg: 'rgba(212,175,55,0.15)',  color: '#D4AF37', label: 'AI' },
}

type FilterTab = 'all' | 'today' | 'upcoming' | 'past'

export function BookingsClient({ bookings }: { bookings: BookingRow[] }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterTab>('all')
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let result = bookings

    // Search
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((b) =>
        b.customer?.name?.toLowerCase().includes(q) ||
        b.customer?.email?.toLowerCase().includes(q) ||
        b.service?.name?.toLowerCase().includes(q)
      )
    }

    // Filter
    if (filter === 'today') {
      result = result.filter((b) => isToday(new Date(b.starts_at)))
    } else if (filter === 'upcoming') {
      result = result.filter((b) => isFuture(new Date(b.starts_at)))
    } else if (filter === 'past') {
      result = result.filter((b) => isPast(new Date(b.starts_at)))
    }

    return result
  }, [bookings, search, filter])

  const filters: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'today', label: 'Today' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'past', label: 'Past' },
  ]

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Search bookings…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl text-[13px] text-white placeholder:text-white/30 gold-focus-ring"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          />
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="h-8 px-3.5 rounded-lg text-[12px] font-medium transition-all duration-150"
              style={{
                background: filter === f.key ? '#D4AF37' : 'rgba(255,255,255,0.04)',
                color: filter === f.key ? '#000' : 'rgba(255,255,255,0.5)',
                border: filter === f.key ? 'none' : '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Export */}
        <button
          className="h-8 px-3 rounded-lg text-[12px] font-medium text-white/40 hover:text-white/60 transition-colors"
          style={{ border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <Download size={13} />
        </button>
      </div>

      {/* Table */}
      <div className="dashboard-card !p-0 overflow-hidden">
        {/* Headers */}
        <div
          className="hidden md:grid grid-cols-[140px_1fr_1fr_100px_90px_80px_44px] gap-3 px-5 py-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          {['Time', 'Customer', 'Service', 'Price', 'Source', 'Status', ''].map((h) => (
            <span key={h} className="section-label">{h}</span>
          ))}
        </div>

        {/* Rows */}
        <div className="divide-y divide-white/[0.06]">
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-[14px] text-white/30">No bookings found</p>
            </div>
          ) : (
            filtered.map((b) => {
              const statusStyle = STATUS_STYLES[b.status] ?? STATUS_STYLES.confirmed
              const sourceStyle = SOURCE_STYLES[b.source] ?? SOURCE_STYLES.app

              return (
                <div
                  key={b.id}
                  className="flex md:grid md:grid-cols-[140px_1fr_1fr_100px_90px_80px_44px] gap-3 px-5 py-3 items-center hover:bg-white/[0.03] transition-colors cursor-pointer"
                  onClick={() => setSelectedBooking(b)}
                >
                  {/* Time */}
                  <div>
                    <div className="text-[13px] font-medium text-white">
                      {format(new Date(b.starts_at), 'dd MMM yyyy')}
                    </div>
                    <div className="text-[12px] text-white/35">
                      {format(new Date(b.starts_at), 'HH:mm')}
                    </div>
                  </div>

                  {/* Customer */}
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-white truncate">{b.customer?.name ?? '—'}</div>
                    <div className="text-[12px] text-white/30 truncate">{b.customer?.email}</div>
                  </div>

                  {/* Service */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: b.service?.colour ?? '#D4AF37' }}
                    />
                    <span className="text-[13px] text-white truncate">{b.service?.name ?? '—'}</span>
                  </div>

                  {/* Price */}
                  <span className="text-[13px] font-semibold text-white">
                    {formatPrice(b.price_cents)}
                  </span>

                  {/* Source */}
                  <span
                    className="text-[11px] font-medium px-2 py-0.5 rounded-md w-fit"
                    style={{ background: sourceStyle.bg, color: sourceStyle.color }}
                  >
                    {sourceStyle.label}
                  </span>

                  {/* Status */}
                  <span
                    className="text-[11px] font-medium px-2 py-0.5 rounded-md w-fit capitalize"
                    style={{ background: statusStyle.bg, color: statusStyle.color }}
                  >
                    {b.status}
                  </span>

                  {/* Actions */}
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setMenuOpen(menuOpen === b.id ? null : b.id)}
                      className="flex items-center justify-center w-8 h-8 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-all opacity-0 group-hover:opacity-100"
                      style={{ opacity: menuOpen === b.id ? 1 : undefined }}
                    >
                      <MoreHorizontal size={14} />
                    </button>
                    {menuOpen === b.id && (
                      <div
                        className="absolute right-0 top-full mt-1 w-40 rounded-xl py-1 z-20"
                        style={{
                          background: '#1a1a1a',
                          border: '1px solid rgba(255,255,255,0.08)',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                        }}
                      >
                        {[
                          { icon: Eye, label: 'View' },
                          { icon: Edit, label: 'Edit' },
                          { icon: XCircle, label: 'Cancel' },
                          { icon: CheckCircle, label: 'Mark complete' },
                        ].map((action) => (
                          <button
                            key={action.label}
                            className="flex items-center gap-2 w-full px-3 py-2 text-[13px] text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors"
                            onClick={() => setMenuOpen(null)}
                          >
                            <action.icon size={13} />
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Booking Detail Slide-over */}
      {selectedBooking && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setSelectedBooking(null)}
          />
          <div
            className="fixed right-0 top-0 bottom-0 z-50 w-[380px] overflow-y-auto animate-slide-in-right"
            style={{ background: '#111111' }}
          >
            <div
              className="flex items-center justify-between px-5 h-14"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <h2 className="text-[15px] font-semibold text-white">
                {selectedBooking.customer?.name ?? 'Booking Details'}
              </h2>
              <button
                onClick={() => setSelectedBooking(null)}
                className="flex items-center justify-center w-7 h-7 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.05] transition-all"
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <DetailRow label="Service" value={selectedBooking.service?.name ?? '—'} />
              <DetailRow label="Date" value={format(new Date(selectedBooking.starts_at), 'dd MMM yyyy')} />
              <DetailRow label="Time" value={format(new Date(selectedBooking.starts_at), 'HH:mm')} />
              <DetailRow label="Price" value={formatPrice(selectedBooking.price_cents)} gold />
              <DetailRow label="Status" value={selectedBooking.status} />
              <DetailRow label="Source" value={selectedBooking.source} />
              {selectedBooking.customer?.email && (
                <DetailRow label="Email" value={selectedBooking.customer.email} />
              )}
              {selectedBooking.customer?.phone && (
                <DetailRow label="Phone" value={selectedBooking.customer.phone} />
              )}
            </div>
            <div className="p-5 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button
                className="w-full h-10 rounded-xl text-[13px] font-semibold transition-all btn-press"
                style={{ background: '#D4AF37', color: '#000' }}
              >
                Edit Booking
              </button>
              <button
                className="w-full h-10 rounded-xl text-[13px] font-medium text-white/50 hover:text-white/70 transition-all"
                style={{ border: '1px solid rgba(255,255,255,0.06)' }}
              >
                Cancel Booking
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function DetailRow({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span className="text-[13px] text-white/40">{label}</span>
      <span
        className="text-[13px] font-medium capitalize"
        style={{ color: gold ? '#D4AF37' : '#fff' }}
      >
        {value}
      </span>
    </div>
  )
}
