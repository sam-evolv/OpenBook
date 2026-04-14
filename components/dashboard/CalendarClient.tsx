'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import {
  startOfWeek, addWeeks, subWeeks, addDays,
  format, isSameDay, isToday as isDateToday,
} from 'date-fns'

interface CalendarBooking {
  id: string
  starts_at: string
  ends_at: string
  status: string
  service: { name: string; colour: string; duration_minutes: number } | null
  customer: { name: string } | null
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7) // 7am to 8pm
const HOUR_HEIGHT = 64 // px per hour

export function CalendarClient({
  bookings,
  primaryColour,
}: {
  bookings: CalendarBooking[]
  primaryColour: string
}) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [currentTime, setCurrentTime] = useState(new Date())
  const [hoveredSlot, setHoveredSlot] = useState<{ day: number; hour: number } | null>(null)

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  const now = currentTime
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const timeIndicatorTop = ((currentHour - 7) + currentMinute / 60) * HOUR_HEIGHT

  function getBookingsForDay(day: Date) {
    return bookings.filter((b) => isSameDay(new Date(b.starts_at), day))
  }

  function getBlockStyle(booking: CalendarBooking) {
    const start = new Date(booking.starts_at)
    const startHour = start.getHours() + start.getMinutes() / 60
    const duration = booking.service?.duration_minutes ?? 60
    const top = (startHour - 7) * HOUR_HEIGHT
    const height = (duration / 60) * HOUR_HEIGHT
    const color = booking.service?.colour ?? primaryColour

    return {
      top: `${top}px`,
      height: `${Math.max(height, 24)}px`,
      backgroundColor: `${color}40`,
      borderLeft: `3px solid ${color}`,
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentDate((d) => subWeeks(d, 1))}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.05] transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-[15px] font-semibold text-white">
            {format(weekStart, 'd MMM')} — {format(addDays(weekStart, 6), 'd MMM yyyy')}
          </h2>
          <button
            onClick={() => setCurrentDate((d) => addWeeks(d, 1))}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.05] transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <button
          onClick={() => setCurrentDate(new Date())}
          className="h-8 px-3.5 rounded-lg text-[12px] font-medium transition-all duration-150"
          style={{
            border: '1px solid rgba(212,175,55,0.3)',
            color: '#D4AF37',
            background: 'transparent',
          }}
        >
          Today
        </button>
      </div>

      {/* Calendar grid */}
      <div className="dashboard-card !p-0 overflow-hidden">
        {/* Day headers */}
        <div
          className="grid grid-cols-[60px_repeat(7,1fr)]"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="py-3" />
          {days.map((day) => {
            const today = isDateToday(day)
            return (
              <div key={day.toISOString()} className="py-3 text-center">
                <p className="text-[11px] font-medium text-white/35 uppercase">
                  {format(day, 'EEE')}
                </p>
                <p
                  className="text-[14px] font-semibold mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full"
                  style={{
                    background: today ? '#D4AF37' : 'transparent',
                    color: today ? '#000' : 'rgba(255,255,255,0.7)',
                  }}
                >
                  {format(day, 'd')}
                </p>
              </div>
            )
          })}
        </div>

        {/* Time grid */}
        <div className="relative overflow-y-auto" style={{ height: HOURS.length * HOUR_HEIGHT }}>
          <div className="grid grid-cols-[60px_repeat(7,1fr)] h-full">
            {/* Hour labels */}
            <div className="relative">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 flex items-start justify-end pr-2 -mt-2"
                  style={{ top: (hour - 7) * HOUR_HEIGHT }}
                >
                  <span className="text-[12px] text-white/25">
                    {hour.toString().padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map((day, dayIdx) => {
              const dayBookings = getBookingsForDay(day)
              const today = isDateToday(day)

              return (
                <div
                  key={day.toISOString()}
                  className="relative"
                  style={{ borderLeft: '1px solid rgba(255,255,255,0.04)' }}
                >
                  {/* Hour grid lines */}
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="absolute left-0 right-0"
                      style={{
                        top: (hour - 7) * HOUR_HEIGHT,
                        height: HOUR_HEIGHT,
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                      }}
                      onMouseEnter={() => setHoveredSlot({ day: dayIdx, hour })}
                      onMouseLeave={() => setHoveredSlot(null)}
                    >
                      {hoveredSlot?.day === dayIdx && hoveredSlot?.hour === hour && (
                        <div
                          className="absolute inset-0 flex items-center justify-center"
                          style={{ background: 'rgba(212,175,55,0.04)' }}
                        >
                          <span className="flex items-center gap-1 text-[11px] text-[#D4AF37]/50">
                            <Plus size={10} /> Add booking
                          </span>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Current time indicator */}
                  {today && currentHour >= 7 && currentHour <= 20 && (
                    <div
                      className="absolute left-0 right-0 z-10 pointer-events-none"
                      style={{ top: timeIndicatorTop }}
                    >
                      <div className="flex items-center">
                        <div
                          className="w-2 h-2 rounded-full -ml-1"
                          style={{ background: '#D4AF37' }}
                        />
                        <div
                          className="flex-1 h-[2px]"
                          style={{ background: '#D4AF37' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Booking blocks */}
                  {dayBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="absolute left-1 right-1 rounded-md px-2 py-1 cursor-pointer transition-all duration-150 hover:opacity-100 hover:scale-[1.02] z-[1]"
                      style={{
                        ...getBlockStyle(booking),
                        opacity: 0.85,
                      }}
                    >
                      <p className="text-[12px] font-bold text-white truncate">
                        {booking.customer?.name ?? 'Unknown'}
                      </p>
                      <p className="text-[11px] text-white/60 truncate">
                        {booking.service?.name}
                      </p>
                      <p className="text-[11px] text-white/50">
                        {format(new Date(booking.starts_at), 'HH:mm')}
                      </p>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
