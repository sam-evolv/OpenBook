'use client'

import { useState } from 'react'
import { mockBookings, getCustomerById, getServiceById } from '@/lib/mock-data'
import { formatCurrency, getInitials, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { BookingStatus } from '@/lib/types'

const TABS: { label: string; value: BookingStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Pending', value: 'pending' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
]

const statusConfig: Record<BookingStatus, { label: string; classes: string }> = {
  confirmed: { label: 'Confirmed', classes: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  pending: { label: 'Pending', classes: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  'checked-in': { label: 'Checked in', classes: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
  completed: { label: 'Completed', classes: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200' },
  cancelled: { label: 'Cancelled', classes: 'bg-red-50 text-red-600 ring-1 ring-red-200' },
}

export default function BookingsPage() {
  const [activeTab, setActiveTab] = useState<BookingStatus | 'all'>('all')

  const filtered = mockBookings
    .filter((b) => activeTab === 'all' || b.status === activeTab)
    .sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date)
      if (dateCompare !== 0) return dateCompare
      return a.time.localeCompare(b.time)
    })

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-premium border border-gray-100 shadow-card p-1.5 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              'px-3.5 py-1.5 rounded-card text-[12px] font-medium transition-all duration-150 ease-premium focus-visible:ring-2 focus-visible:ring-brand-500',
              activeTab === tab.value
                ? 'bg-brand-500 text-black shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            )}
          >
            {tab.label}
            {tab.value !== 'all' && (
              <span className={cn(
                'ml-1.5 text-[10px] font-semibold',
                activeTab === tab.value ? 'text-black/60' : 'text-gray-400'
              )}>
                {mockBookings.filter((b) => b.status === tab.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-premium border border-gray-100 shadow-card overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[128px_1fr_1fr_80px_100px] items-center gap-3 px-4 py-2.5 border-b border-gray-100">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Date & Time</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Client</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Service</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 text-right">Price</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 text-right">Status</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[13px] text-gray-400">No bookings found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((booking) => {
              const customer = getCustomerById(booking.customerId)
              const service = getServiceById(booking.serviceId)
              if (!customer || !service) return null
              const status = statusConfig[booking.status]
              const initials = getInitials(customer.name)

              return (
                <div
                  key={booking.id}
                  className="grid grid-cols-[128px_1fr_1fr_80px_100px] items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors duration-150 group"
                >
                  {/* Date + time */}
                  <div>
                    <p className="text-[12px] font-medium text-gray-700">
                      {formatDate(booking.date)}
                    </p>
                    <p className="text-[11px] text-gray-400">{booking.time}</p>
                  </div>

                  {/* Client */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="flex items-center justify-center w-7 h-7 rounded-full text-white text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: service.color }}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-gray-900 truncate">{customer.name}</p>
                      <p className="text-[11px] text-gray-400 truncate">{customer.email}</p>
                    </div>
                  </div>

                  {/* Service */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: service.color }}
                    />
                    <span className="text-[13px] text-gray-700 truncate">{service.name}</span>
                  </div>

                  {/* Price */}
                  <span className="text-[13px] font-semibold text-gray-900 text-right">
                    {formatCurrency(booking.price)}
                  </span>

                  {/* Status */}
                  <div className="flex justify-end">
                    <span className={cn(
                      'inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold',
                      status.classes
                    )}>
                      {status.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
