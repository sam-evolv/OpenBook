import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/dashboard/StatCard'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { AIInsights } from '@/components/dashboard/AIInsights'
import { formatPrice, formatTime } from '@/lib/utils'
import {
  DollarSign, CalendarCheck, Users, Clock, Calendar, Copy,
} from 'lucide-react'
import { startOfDay, endOfDay, subDays, format } from 'date-fns'

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
    <div className="space-y-6">
      {/* Stat cards — 4 in a row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Revenue today"
          value={formatPrice(revenueToday)}
          icon={DollarSign}
          trend={{ value: '+12%', direction: 'up', subtext: 'vs last 7 days' }}
        />
        <StatCard
          label="Bookings today"
          value={String(todayBookings?.length ?? 0)}
          icon={CalendarCheck}
          trend={{ value: String(todayBookings?.length ?? 0), direction: 'neutral', subtext: 'today' }}
        />
        <StatCard
          label="Active clients"
          value={String(activeClients ?? 0)}
          icon={Users}
          trend={{ value: 'Last 30 days', direction: 'neutral' }}
        />
        <StatCard
          label="Upcoming"
          value={String(upcomingCount ?? 0)}
          icon={Clock}
          trend={{ value: 'Confirmed', direction: 'neutral' }}
        />
      </div>

      {/* Revenue chart + Today's schedule side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
        {/* Weekly revenue chart */}
        <RevenueChart data={weeklyRevenue} />

        {/* Today's schedule */}
        <div className="dashboard-card !p-0 overflow-hidden">
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div>
              <h2 className="text-[14px] font-semibold text-white">Today&apos;s schedule</h2>
              <p className="text-[12px] mt-0.5 text-white/40">
                {format(now, 'EEEE, d MMMM')}
              </p>
            </div>
            <span
              className="inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-semibold"
              style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}
            >
              {todayBookings?.length ?? 0}
            </span>
          </div>

          <div className="divide-y divide-white/[0.06]">
            {(todayBookings ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-5">
                <Calendar size={32} className="text-[#D4AF37] mb-3" />
                <p className="text-[14px] font-medium text-white mb-1">No bookings today</p>
                <p className="text-[13px] text-white/40 text-center mb-3">
                  Share your booking link to get started
                </p>
                <button
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#D4AF37] hover:text-[#e8c84a] transition-colors"
                >
                  <Copy size={12} />
                  Copy booking URL
                </button>
              </div>
            ) : (
              (todayBookings ?? []).map((b) => {
                const service = b.services as { name: string; colour: string } | null
                const customer = b.customers as { name: string } | null
                return (
                  <div
                    key={b.id}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.03] transition-colors cursor-pointer"
                  >
                    <div className="shrink-0">
                      <span className="text-[14px] font-bold text-white">
                        {formatTime(b.starts_at.split('T')[1]?.slice(0, 5) ?? '')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-medium text-white truncate">
                        {customer?.name ?? 'Unknown'}
                      </div>
                      <div className="text-[12px] mt-0.5 text-white/40 truncate">
                        {service?.name}
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-[13px] font-semibold text-[#D4AF37]">
                        {formatPrice(b.price_cents)}
                      </span>
                      <span
                        className="text-[11px] font-medium px-2 py-0.5 rounded-md"
                        style={{
                          background: b.status === 'confirmed'
                            ? 'rgba(16,185,129,0.15)' : 'rgba(212,175,55,0.15)',
                          color: b.status === 'confirmed'
                            ? '#10b981' : '#D4AF37',
                        }}
                      >
                        {b.status}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <AIInsights />

      {/* Flash sale history - placeholder */}
      <div>
        <h2 className="text-[14px] font-semibold text-white mb-3">Recent flash sales</h2>
        <div className="dashboard-card !p-0 overflow-hidden">
          <div
            className="hidden md:grid grid-cols-5 gap-4 px-5 py-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            {['Service', 'Discount', 'Slots', 'Revenue', 'Status'].map((h) => (
              <span key={h} className="section-label">{h}</span>
            ))}
          </div>
          <div className="divide-y divide-white/[0.06]">
            <p className="px-5 py-8 text-center text-[13px] text-white/30">
              No flash sales yet — create one to boost bookings
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
