import { createClient } from '@/lib/supabase/server'
import { tokens } from '@/lib/types'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user!.id)
    .single()

  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, starts_at, ends_at, status, services:service_id(name, colour), customers:customer_id(name)')
    .eq('business_id', business!.id)
    .gte('starts_at', monthStart.toISOString())
    .lte('starts_at', monthEnd.toISOString())
    .neq('status', 'cancelled')
    .order('starts_at')

  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startDayOffset = monthStart.getDay()

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">{format(now, 'MMMM yyyy')}</h1>
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: tokens.surface1, border: `1px solid ${tokens.border}` }}
      >
        {/* Day headers */}
        <div className="grid grid-cols-7" style={{ borderBottom: `1px solid ${tokens.border}` }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div
              key={d}
              className="py-3 text-center text-xs font-medium"
              style={{ color: tokens.text2 }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7">
          {/* Offset cells */}
          {Array.from({ length: startDayOffset }).map((_, i) => (
            <div
              key={`offset-${i}`}
              className="min-h-24 p-2"
              style={{ borderRight: `1px solid ${tokens.border}`, borderBottom: `1px solid ${tokens.border}` }}
            />
          ))}

          {days.map((day) => {
            const dayBookings = (bookings ?? []).filter((b) =>
              isSameDay(new Date(b.starts_at), day)
            )
            const isToday = isSameDay(day, now)

            return (
              <div
                key={day.toISOString()}
                className="min-h-24 p-2 space-y-1"
                style={{
                  borderRight: `1px solid ${tokens.border}`,
                  borderBottom: `1px solid ${tokens.border}`,
                }}
              >
                <div className="flex justify-end">
                  <span
                    className="w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium"
                    style={{
                      background: isToday ? tokens.gold : 'transparent',
                      color: isToday ? '#000' : tokens.text2,
                    }}
                  >
                    {format(day, 'd')}
                  </span>
                </div>
                {dayBookings.slice(0, 3).map((b) => {
                  const service = b.services as { name: string; colour: string } | null
                  return (
                    <div
                      key={b.id}
                      className="rounded px-1.5 py-1 text-xs truncate font-medium"
                      style={{
                        background: `${service?.colour ?? tokens.gold}20`,
                        color: service?.colour ?? tokens.gold,
                      }}
                    >
                      {format(new Date(b.starts_at), 'HH:mm')} {service?.name}
                    </div>
                  )
                })}
                {dayBookings.length > 3 && (
                  <div className="text-xs" style={{ color: tokens.text3 }}>
                    +{dayBookings.length - 3} more
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
