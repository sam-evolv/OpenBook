'use client'

import { useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface RevenueChartProps {
  data: number[]
  dayLabels?: string[]
  loading?: boolean
}

const DEFAULT_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: '#1a1a1a',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 10,
        padding: '8px 12px',
      }}
    >
      <p style={{ color: '#ffffff', fontWeight: 700, fontSize: 13 }}>
        {formatCurrency(payload[0].value)}
      </p>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>
        {label}
      </p>
    </div>
  )
}

export function RevenueChart({ data, dayLabels, loading = false }: RevenueChartProps) {
  const [period, setPeriod] = useState<'7D' | '30D' | '90D'>('7D')
  const labels = dayLabels ?? DEFAULT_LABELS
  const total = data.reduce((a, b) => a + b, 0)

  const chartData = data.map((value, i) => ({
    day: labels[i] ?? `Day ${i + 1}`,
    revenue: value,
  }))

  if (loading) {
    return (
      <div className="dashboard-card">
        <div className="flex items-center justify-between mb-4">
          <div className="skeleton-shimmer h-4 w-32" />
          <div className="skeleton-shimmer h-6 w-20" />
        </div>
        <div className="skeleton-shimmer h-[200px] w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="dashboard-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="card-heading">Revenue this week</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[18px] font-bold text-[#D4AF37]">
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-1 mb-4">
        {(['7D', '30D', '90D'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className="h-7 px-3 rounded-md text-[12px] font-medium transition-all duration-150"
            style={{
              background: period === p ? '#D4AF37' : 'transparent',
              color: period === p ? '#000' : 'rgba(255,255,255,0.4)',
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="animate-chart-draw" style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(212,175,55,0.3)" />
                <stop offset="100%" stopColor="rgba(212,175,55,0)" />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="0"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 12 }}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 12 }}
              tickFormatter={(v: number) => `€${v}`}
            />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#D4AF37"
              strokeWidth={2}
              fill="url(#goldGradient)"
              animationDuration={800}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
