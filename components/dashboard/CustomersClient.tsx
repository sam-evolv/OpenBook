'use client'

import { useState, useMemo } from 'react'
import { Search, X, Users, Plus } from 'lucide-react'
import { formatPrice, getInitials, formatRelativeTime } from '@/lib/utils'
import { format } from 'date-fns'

interface CustomerRow {
  id: string
  name: string
  email: string
  phone: string | null
  bookingCount: number
  totalSpend: number
  firstSeen: string
  lastVisit: string
}

// Deterministic color from name
function getAvatarColor(name: string): string {
  const colors = [
    'rgba(212,175,55,0.2)', 'rgba(59,130,246,0.2)', 'rgba(16,185,129,0.2)',
    'rgba(168,85,247,0.2)', 'rgba(236,72,153,0.2)', 'rgba(245,158,11,0.2)',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function getAvatarTextColor(name: string): string {
  const colors = [
    '#D4AF37', '#3b82f6', '#10b981',
    '#a855f7', '#ec4899', '#f59e0b',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export function CustomersClient({ customers }: { customers: CustomerRow[] }) {
  const [search, setSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null)

  const filtered = useMemo(() => {
    if (!search) return customers
    const q = search.toLowerCase()
    return customers.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    )
  }, [customers, search])

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          placeholder="Search customers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-9 pr-4 rounded-xl text-[13px] text-white placeholder:text-white/30 gold-focus-ring"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        />
      </div>

      {/* Table */}
      <div className="dashboard-card !p-0 overflow-hidden">
        {/* Header */}
        <div
          className="hidden md:grid grid-cols-[1fr_90px_110px_130px] gap-4 px-5 py-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          {['Client', 'Bookings', 'Total spend', 'Last visit'].map((h) => (
            <span key={h} className="section-label">{h}</span>
          ))}
        </div>

        <div className="divide-y divide-white/[0.06]">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users size={32} className="text-[#D4AF37] mb-3" />
              <p className="text-[14px] font-medium text-white mb-1">No customers yet</p>
              <p className="text-[13px] text-white/40">Customers will appear here after their first booking</p>
            </div>
          ) : (
            filtered.map((c) => (
              <div
                key={c.id}
                className="flex md:grid md:grid-cols-[1fr_90px_110px_130px] gap-4 px-5 py-3.5 items-center hover:bg-white/[0.03] transition-colors cursor-pointer"
                onClick={() => setSelectedCustomer(c)}
              >
                {/* Avatar + name */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                    style={{ background: getAvatarColor(c.name), color: getAvatarTextColor(c.name) }}
                  >
                    {getInitials(c.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-white truncate">{c.name}</div>
                    <div className="text-[12px] text-white/30 truncate">{c.email}</div>
                  </div>
                </div>

                {/* Bookings count */}
                <span
                  className="text-[12px] font-medium px-2 py-0.5 rounded-md w-fit"
                  style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}
                >
                  {c.bookingCount}
                </span>

                {/* Total spend */}
                <span className="text-[13px] font-semibold text-[#D4AF37]">
                  {formatPrice(c.totalSpend)}
                </span>

                {/* Last visit */}
                <span className="text-[12px] text-white/35">
                  {c.lastVisit ? formatRelativeTime(c.lastVisit) : '—'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Customer detail slide-over */}
      {selectedCustomer && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setSelectedCustomer(null)}
          />
          <div
            className="fixed right-0 top-0 bottom-0 z-50 w-[380px] overflow-y-auto animate-slide-in-right"
            style={{ background: '#111111' }}
          >
            <div
              className="flex items-center justify-between px-5 h-14"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <h2 className="text-[15px] font-semibold text-white">Customer Details</h2>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="flex items-center justify-center w-7 h-7 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.05] transition-all"
              >
                <X size={14} />
              </button>
            </div>

            {/* Profile header */}
            <div className="p-5 flex flex-col items-center text-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold mb-3"
                style={{ background: getAvatarColor(selectedCustomer.name), color: getAvatarTextColor(selectedCustomer.name) }}
              >
                {getInitials(selectedCustomer.name)}
              </div>
              <p className="text-[16px] font-semibold text-white">{selectedCustomer.name}</p>
              <p className="text-[13px] text-white/40 mt-0.5">{selectedCustomer.email}</p>
              {selectedCustomer.phone && (
                <p className="text-[13px] text-white/40">{selectedCustomer.phone}</p>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <StatPill label="Bookings" value={String(selectedCustomer.bookingCount)} />
              <StatPill label="Total spent" value={formatPrice(selectedCustomer.totalSpend)} gold />
              <StatPill label="Member since" value={selectedCustomer.firstSeen ? format(new Date(selectedCustomer.firstSeen), 'MMM yyyy') : '—'} />
            </div>

            {/* Actions */}
            <div className="p-5">
              <button
                className="w-full h-10 rounded-xl text-[13px] font-semibold transition-all btn-press flex items-center justify-center gap-2"
                style={{ background: '#D4AF37', color: '#000' }}
              >
                <Plus size={14} />
                New Booking
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function StatPill({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div
      className="rounded-xl p-3 text-center"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <p className="text-[11px] text-white/35 mb-1">{label}</p>
      <p className="text-[14px] font-semibold" style={{ color: gold ? '#D4AF37' : '#fff' }}>{value}</p>
    </div>
  )
}
