import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/dashboard/StatCard'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { formatPrice, formatDate, formatTime } from '@/lib/utils'
import {
  DollarSign, CalendarCheck, Users, Clock,
} from 'lucide-react'
import { tokens } from '@/lib/types'
import { startOfDay, endOfDay, startOfWeek, subDays, format } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function OverviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('owner_id', user!.id)
    .single()

  if (!business) return null

  const now = new Date()
  const todayStart = startOfDay(now).toISOString()
  const todayEnd = endOfDay(now).toISOString()

  // Today's bookings with service + customer
  const { data: todayBookings } = await supabase
    .from('bookings')
    .select(`
      id, starts_at, ends_at, status, price_cents,
      services:service_id ( name, colour ),
      customers:customer_id ( name )
    `)
    .eq('business_id', business.id)
    .gte('starts_at', todayStart)
    .lte('starts_at', todayEnd)
    .neq('status', 'cancelled')
    .order('starts_at')

  const revenueToday = (todayBookings ?? []).reduce((s, b) => s + b.price_cents, 0)

  // Weekly revenue — last 7 days
  const weeklyRevenue: number[] = []
  for (let i = 6; i >= 0; i--) {
    const d = subDays(now, i)
    const { data: dayBookings } = await supabase
      .from('bookings')
      .select('price_cents')
      .eq('business_id', business.id)
      .gte('starts_at', startOfDay(d).toISOString())
      .lte('starts_at', endOfDay(d).toISOString())
      .in('status', ['confirmed', 'completed'])
    weeklyRevenue.push((dayBookings ?? []).reduce((s, b) => s + b.price_cents, 0))
  }

  // Active clients count
  const { count: activeClients } = await supabase
    .from('bookings')
    .select('customer_id', { count: 'exact', head: true })
    .eq('business_id', business.id)
    .gte('starts_at', subDays(now, 30).toISOString())

  // Upcoming this week
  const { count: upcomingCount } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', business.id)
    .eq('status', 'confirmed')
    .gte('starts_at', now.toISOString())

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Revenue today"
          value={formatPrice(revenueToday)}
          icon={DollarSign}
          iconBg="bg-brand-500/15"
          iconColor="text-brand-500"
        />
        <StatCard
          label="Bookings today"
          value={String(todayBookings?.length ?? 0)}
          icon={CalendarCheck}
          iconBg="bg-blue-500/15"
          iconColor="text-blue-400"
        />
        <StatCard
          label="Active clients"
          value={String(activeClients ?? 0)}
          icon={Users}
          iconBg="bg-emerald-500/15"
          iconColor="text-emerald-400"
          trend={{ value: 'Last 30 days', direction: 'neutral' }}
        />
        <StatCard
          label="Upcoming"
          value={String(upcomingCount ?? 0)}
          icon={Clock}
          iconBg="bg-amber-500/15"
          iconColor="text-amber-400"
          trend={{ value: 'Confirmed bookings', direction: 'neutral' }}
        />
      </div>

      {/* Main row */}
      <div className="flex gap-6">
        {/* Today's schedule */}
        <div
          className="flex-1 min-w-0 rounded-premium"
          style={{
            background: tokens.surface1,
            border: `1px solid ${tokens.border}`,
          }}
        >
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: `1px solid ${tokens.border}` }}
          >
            <div>
              <h2 className="text-sm font-semibold text-white">Today&apos;s schedule</h2>
              <p className="text-xs mt-0.5" style={{ color: tokens.text2 }}>
                {format(now, 'EEEE, d MMMM')} · {todayBookings?.length ?? 0} bookings · {formatPrice(revenueToday)}
              </p>
            </div>
          </div>

          <div className="divide-y" style={{ borderColor: tokens.border }}>
            {(todayBookings ?? []).length === 0 && (
              <p className="px-5 py-8 text-sm text-center" style={{ color: tokens.text3 }}>
                No bookings today
              </p>
            )}
            {(todayBookings ?? []).map((b) => {
              const service = b.services as { name: string; colour: string } | null
              const customer = b.customers as { name: string } | null
              return (
                <div key={b.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div
                    className="w-1 h-10 rounded-full shrink-0"
                    style={{ background: service?.colour ?? tokens.gold }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {customer?.name ?? 'Unknown'}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: tokens.text2 }}>
                      {service?.name} · {formatTime(b.starts_at.split('T')[1]?.slice(0, 5) ?? '')}
                    </div>
                  </div>
                  <span
                    className="text-xs font-medium px-2 py-1 rounded-lg shrink-0"
                    style={{
                      background: b.status === 'confirmed' ? `${tokens.gold}15` : `${tokens.surface2}`,
                      color: b.status === 'confirmed' ? tokens.gold : tokens.text2,
                    }}
                  >
                    {b.status}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Weekly revenue chart */}
        <div className="w-72 shrink-0 space-y-4">
          <div
            className="rounded-premium p-5"
            style={{ background: tokens.surface1, border: `1px solid ${tokens.border}` }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white">Weekly revenue</h2>
                <p className="text-xs" style={{ color: tokens.text2 }}>Last 7 days</p>
              </div>
              <span className="text-lg font-bold text-white">
                {formatPrice(weeklyRevenue.reduce((a, b) => a + b, 0))}
              </span>
            </div>
            <RevenueChart data={weeklyRevenue} />
          </div>
        </div>
      </div>
    </div>
  )
}
