import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/dashboard/StatCard'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { formatPrice, formatTime } from '@/lib/utils'
import {
  DollarSign, CalendarCheck, Users, Clock, Zap,
} from 'lucide-react'
import { tokens } from '@/lib/types'
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

  // Flash sale history — last 30 days
  const { data: flashSales } = await supabase
    .from('flash_sales')
    .select(`
      id, created_at, sale_price_cents, original_price_cents,
      discount_percent, bookings_taken, max_bookings, status, expires_at,
      services:service_id ( name )
    `)
    .eq('business_id', business.id)
    .gte('created_at', subDays(now, 30).toISOString())
    .order('created_at', { ascending: false })
    .limit(10)

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

      {/* ── Flash Sale History ── */}
      <div
        className="rounded-premium"
        style={{ background: tokens.surface1, border: `1px solid ${tokens.border}` }}
      >
        <div
          className="flex items-center gap-2.5 px-5 py-4"
          style={{ borderBottom: `1px solid ${tokens.border}` }}
        >
          <Zap size={15} fill={tokens.gold} color={tokens.gold} />
          <div>
            <h2 className="text-sm font-semibold text-white">Flash Sales</h2>
            <p className="text-xs mt-0.5" style={{ color: tokens.text2 }}>
              Last 30 days · {flashSales?.length ?? 0} campaigns
            </p>
          </div>
        </div>

        {(!flashSales || flashSales.length === 0) ? (
          <div className="px-5 py-10 text-center">
            <Zap size={28} className="mx-auto mb-3 opacity-20" color={tokens.gold} />
            <p className="text-sm" style={{ color: tokens.text3 }}>No flash sales yet</p>
            <p className="text-xs mt-1" style={{ color: tokens.text3 }}>
              Use the ⚡ Flash Sale button above to push your first offer.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `1px solid ${tokens.border}` }}>
                  {['Service', 'Discount', 'Slots filled', 'Revenue', 'Sent'].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide"
                      style={{ color: tokens.text3 }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: tokens.border }}>
                {flashSales.map((sale) => {
                  const service      = sale.services as { name: string } | null
                  const revenue      = sale.bookings_taken * sale.sale_price_cents
                  const isActive     = sale.status === 'active' && new Date(sale.expires_at) > now
                  const fillRate     = sale.max_bookings > 0
                    ? Math.round((sale.bookings_taken / sale.max_bookings) * 100)
                    : 0

                  return (
                    <tr key={sale.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          {isActive && (
                            <span
                              className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                              style={{ background: `${tokens.gold}18`, color: tokens.gold }}
                            >
                              ⚡ Live
                            </span>
                          )}
                          <span className="text-sm font-medium text-white">
                            {service?.name ?? '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className="text-sm font-bold"
                          style={{ color: tokens.gold }}
                        >
                          {sale.discount_percent}% off
                        </span>
                        <p className="text-xs mt-0.5" style={{ color: tokens.text3 }}>
                          {formatPrice(sale.sale_price_cents)} vs {formatPrice(sale.original_price_cents)}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-1.5 w-16 rounded-full overflow-hidden"
                            style={{ background: 'rgba(255,255,255,0.08)' }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width:      `${fillRate}%`,
                                background: fillRate === 100 ? '#10b981' : tokens.gold,
                              }}
                            />
                          </div>
                          <span className="text-sm text-white">
                            {sale.bookings_taken}/{sale.max_bookings}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-semibold text-white">
                          {revenue > 0 ? formatPrice(revenue) : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm" style={{ color: tokens.text2 }}>
                          {format(new Date(sale.created_at!), 'dd MMM, HH:mm')}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
