import { createClient } from '@/lib/supabase/server'
import { tokens } from '@/lib/types'
import { formatPrice } from '@/lib/utils'
import { format, startOfDay, endOfDay, addDays } from 'date-fns'
import { ScheduleItem } from '@/components/dashboard/ScheduleItem'

export const dynamic = 'force-dynamic'

export default async function SchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user!.id)
    .single()

  const today = new Date()
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(today, i - today.getDay() + 1))

  // Fetch bookings for the whole week
  const { data: weekBookings } = await supabase
    .from('bookings')
    .select(`
      id, starts_at, ends_at, status, price_cents,
      services:service_id ( name, colour ),
      customers:customer_id ( name )
    `)
    .eq('business_id', business!.id)
    .gte('starts_at', startOfDay(weekDays[0]).toISOString())
    .lte('starts_at', endOfDay(weekDays[6]).toISOString())
    .neq('status', 'cancelled')
    .order('starts_at')

  const todayStr = format(today, 'yyyy-MM-dd')
  const todayBookings = (weekBookings ?? []).filter(
    (b) => b.starts_at.startsWith(todayStr)
  )
  const todayRevenue = todayBookings.reduce((s, b) => s + b.price_cents, 0)

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Week strip */}
      <div
        className="rounded-2xl p-3"
        style={{ background: tokens.surface1, border: `1px solid ${tokens.border}` }}
      >
        <div className="flex gap-2">
          {weekDays.map((day) => {
            const dayStr = format(day, 'yyyy-MM-dd')
            const isToday = dayStr === todayStr
            const count = (weekBookings ?? []).filter((b) => b.starts_at.startsWith(dayStr)).length
            return (
              <div
                key={dayStr}
                className="relative flex-1 flex flex-col items-center py-2 px-1 rounded-xl text-center"
                style={{
                  background: isToday ? tokens.gold : 'transparent',
                }}
              >
                <span
                  className="text-[10px] font-semibold uppercase tracking-wide mb-1"
                  style={{ color: isToday ? '#000' : tokens.text3 }}
                >
                  {format(day, 'EEE')}
                </span>
                <span
                  className="text-base font-bold"
                  style={{ color: isToday ? '#000' : tokens.text1 }}
                >
                  {format(day, 'd')}
                </span>
                {count > 0 && (
                  <span
                    className="absolute bottom-1.5 w-1 h-1 rounded-full"
                    style={{ background: isToday ? '#000' : tokens.gold }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Today's schedule */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: tokens.surface1, border: `1px solid ${tokens.border}` }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${tokens.border}` }}
        >
          <div>
            <h2 className="text-sm font-semibold text-white">
              {format(today, 'EEEE, d MMMM')}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: tokens.text2 }}>
              {todayBookings.length} booking{todayBookings.length !== 1 ? 's' : ''}
              {todayBookings.length > 0 && ` · ${formatPrice(todayRevenue)}`}
            </p>
          </div>
        </div>

        {todayBookings.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm" style={{ color: tokens.text3 }}>No bookings today</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: tokens.border }}>
            {todayBookings.map((b) => {
              const service = b.services as { name: string; colour: string | null } | null
              const customer = b.customers as { name: string | null } | null
              return (
                <ScheduleItem
                  key={b.id}
                  booking={b as unknown as import('@/lib/types').Booking}
                  customerName={customer?.name ?? 'Unknown'}
                  serviceName={service?.name ?? ''}
                  serviceColor={service?.colour ?? tokens.gold}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
