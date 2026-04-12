'use client'

import { useState } from 'react'
import { ScheduleItem } from '@/components/dashboard/ScheduleItem'
import { mockBookings, getCustomerById, getServiceById } from '@/lib/mock-data'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

// Build a 7-day strip starting from Monday of the current week
function getWeekDays(referenceDate: Date) {
  const days: { date: Date; label: string; shortDay: string; isoDate: string }[] = []
  const day = referenceDate.getDay()
  const monday = new Date(referenceDate)
  monday.setDate(referenceDate.getDate() - ((day + 6) % 7))

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    days.push({
      date: d,
      label: d.toLocaleDateString('en-IE', { weekday: 'short' }),
      shortDay: d.toLocaleDateString('en-IE', { weekday: 'short' }),
      isoDate: d.toISOString().split('T')[0],
    })
  }
  return days
}

const TODAY = new Date('2026-04-12')

export default function SchedulePage() {
  const weekDays = getWeekDays(TODAY)
  const todayIso = TODAY.toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState(todayIso)

  const dayBookings = mockBookings
    .filter((b) => b.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time))

  const dayRevenue = dayBookings.reduce((sum, b) => sum + b.price, 0)

  const selectedDay = weekDays.find((d) => d.isoDate === selectedDate)
  const selectedDateObj = selectedDay ? selectedDay.date : TODAY

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Week strip */}
      <div className="bg-white rounded-premium border border-gray-100 shadow-card p-3">
        <div className="flex gap-2">
          {weekDays.map((day) => {
            const isSelected = day.isoDate === selectedDate
            const isToday = day.isoDate === todayIso
            const hasBookings = mockBookings.some((b) => b.date === day.isoDate)

            return (
              <button
                key={day.isoDate}
                onClick={() => setSelectedDate(day.isoDate)}
                className={cn(
                  'relative flex-1 flex flex-col items-center py-2 px-1 rounded-premium text-center transition-all duration-150 ease-premium focus-visible:ring-2 focus-visible:ring-brand-500',
                  isSelected
                    ? 'bg-brand-500 text-black'
                    : 'hover:bg-gray-50 text-gray-500'
                )}
              >
                <span className={cn('text-[10px] font-semibold uppercase tracking-wide mb-1', isSelected ? 'text-black/70' : 'text-gray-400')}>
                  {day.shortDay}
                </span>
                <span className={cn('text-[16px] font-bold leading-none', isSelected ? 'text-black' : 'text-gray-900')}>
                  {day.date.getDate()}
                </span>
                {/* Today dot */}
                {isToday && (
                  <span className={cn(
                    'absolute bottom-1.5 w-1 h-1 rounded-full',
                    isSelected ? 'bg-black/30' : 'bg-brand-500'
                  )} />
                )}
                {/* Has bookings dot */}
                {hasBookings && !isToday && !isSelected && (
                  <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-gray-300" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Day panel */}
      <div className="bg-white rounded-premium border border-gray-100 shadow-card">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
          <div>
            <h2 className="text-[14px] font-semibold text-gray-900">
              {selectedDateObj.toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h2>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {dayBookings.length} booking{dayBookings.length !== 1 ? 's' : ''}{' '}
              {dayBookings.length > 0 && `· ${formatCurrency(dayRevenue)}`}
            </p>
          </div>
        </div>

        {dayBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <span className="text-gray-400 text-lg">—</span>
            </div>
            <p className="text-[13px] font-medium text-gray-500">No bookings</p>
            <p className="text-[12px] text-gray-400 mt-1">Nothing scheduled for this day</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 py-1">
            {dayBookings.map((booking) => {
              const customer = getCustomerById(booking.customerId)
              const service = getServiceById(booking.serviceId)
              if (!customer || !service) return null
              return (
                <ScheduleItem
                  key={booking.id}
                  booking={booking}
                  customerName={customer.name}
                  serviceName={service.name}
                  serviceColor={service.color}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
