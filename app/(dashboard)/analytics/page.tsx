import { createClient } from '@/lib/supabase/server'
import { tokens } from '@/lib/types'
import { formatPrice } from '@/lib/utils'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user!.id)
    .single()

  const now = new Date()

  // Last 6 months revenue
  const monthlyData = await Promise.all(
    Array.from({ length: 6 }, async (_, i) => {
      const date = subMonths(now, 5 - i)
      const { data } = await supabase
        .from('bookings')
        .select('price_cents')
        .eq('business_id', business!.id)
        .in('status', ['confirmed', 'completed'])
        .gte('starts_at', startOfMonth(date).toISOString())
        .lte('starts_at', endOfMonth(date).toISOString())
      const revenue = (data ?? []).reduce((s, b) => s + b.price_cents, 0)
      return { month: format(date, 'MMM'), revenue, count: data?.length ?? 0 }
    })
  )

  const totalRevenue = monthlyData.reduce((s, m) => s + m.revenue, 0)
  const totalBookings = monthlyData.reduce((s, m) => s + m.count, 0)
  const maxRevenue = Math.max(...monthlyData.map((m) => m.revenue), 1)

  // Top services
  const { data: topServices } = await supabase
    .from('bookings')
    .select('service_id, price_cents, services:service_id(name, colour)')
    .eq('business_id', business!.id)
    .in('status', ['confirmed', 'completed'])
    .gte('starts_at', startOfMonth(subMonths(now, 5)).toISOString())

  const serviceMap = new Map<string, { name: string; colour: string; revenue: number; count: number }>()
  for (const b of topServices ?? []) {
    const s = b.services as { name: string; colour: string } | null
    if (!s || !b.service_id) continue
    const existing = serviceMap.get(b.service_id) ?? { name: s.name, colour: s.colour, revenue: 0, count: 0 }
    serviceMap.set(b.service_id, {
      ...existing,
      revenue: existing.revenue + b.price_cents,
      count: existing.count + 1,
    })
  }
  const topServicesList = Array.from(serviceMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-xl font-bold text-white">Analytics</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <div
          className="rounded-2xl p-5"
          style={{ background: tokens.surface1, border: `1px solid ${tokens.border}` }}
        >
          <div className="text-xs font-medium mb-1" style={{ color: tokens.text2 }}>
            6-month revenue
          </div>
          <div className="text-2xl font-bold text-white">{formatPrice(totalRevenue)}</div>
        </div>
        <div
          className="rounded-2xl p-5"
          style={{ background: tokens.surface1, border: `1px solid ${tokens.border}` }}
        >
          <div className="text-xs font-medium mb-1" style={{ color: tokens.text2 }}>
            Total bookings
          </div>
          <div className="text-2xl font-bold text-white">{totalBookings}</div>
        </div>
      </div>

      {/* Bar chart */}
      <div
        className="rounded-2xl p-6"
        style={{ background: tokens.surface1, border: `1px solid ${tokens.border}` }}
      >
        <h2 className="text-sm font-semibold text-white mb-6">Monthly revenue</h2>
        <div className="flex items-end gap-3 h-40">
          {monthlyData.map((m) => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
              <div className="text-xs font-medium text-white">
                {m.revenue > 0 && formatPrice(m.revenue)}
              </div>
              <div
                className="w-full rounded-t-lg transition-all"
                style={{
                  height: `${Math.max((m.revenue / maxRevenue) * 100, 4)}%`,
                  background: tokens.gold,
                  opacity: m.revenue > 0 ? 1 : 0.15,
                }}
              />
              <div className="text-xs" style={{ color: tokens.text2 }}>{m.month}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top services */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: tokens.surface1, border: `1px solid ${tokens.border}` }}
      >
        <div
          className="px-5 py-4"
          style={{ borderBottom: `1px solid ${tokens.border}` }}
        >
          <h2 className="text-sm font-semibold text-white">Top services</h2>
        </div>
        <div className="divide-y" style={{ borderColor: tokens.border }}>
          {topServicesList.map((s) => (
            <div key={s.name} className="flex items-center gap-4 px-5 py-3.5">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: s.colour }}
              />
              <span className="flex-1 text-sm text-white">{s.name}</span>
              <span className="text-xs" style={{ color: tokens.text2 }}>{s.count} bookings</span>
              <span className="text-sm font-semibold text-white">{formatPrice(s.revenue)}</span>
            </div>
          ))}
          {topServicesList.length === 0 && (
            <p className="py-8 text-center text-sm" style={{ color: tokens.text3 }}>
              No data yet
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
