'use client'

import { useState } from 'react'
import { cn, formatCurrency } from '@/lib/utils'

interface RevenueChartProps {
  data: number[]
  loading?: boolean
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const TODAY_INDEX = 6

export function RevenueChart({ data, loading = false }: RevenueChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const maxVal = Math.max(...data, 1)
  const MAX_HEIGHT = 64

  if (loading) {
    return (
      <div className="flex items-end gap-1.5 h-16 animate-pulse">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex-1 bg-white/[0.06] rounded-sm" style={{ height: `${(i + 1) * 9}px` }} />
        ))}
      </div>
    )
  }

  return (
    <div className="relative">
      {hoveredIndex !== null && (
        <div
          className="absolute -top-8 text-[11px] font-semibold bg-surface border border-white/[0.14] text-white px-2 py-1 rounded-card pointer-events-none z-10 transition-all duration-150 ease-premium"
          style={{ left: `calc(${(hoveredIndex / 6) * 100}% - 20px)` }}
        >
          {formatCurrency(data[hoveredIndex])}
        </div>
      )}

      <div className="flex items-end gap-1.5 h-16">
        {data.map((val, i) => {
          const height = Math.max(4, Math.round((val / maxVal) * MAX_HEIGHT))
          const isToday = i === TODAY_INDEX
          const isHovered = hoveredIndex === i

          return (
            <button
              key={i}
              className={cn(
                'flex-1 rounded-sm transition-all duration-250 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                isToday
                  ? 'bg-brand-500'
                  : isHovered
                  ? 'bg-white/20'
                  : 'bg-white/[0.08]'
              )}
              style={{ height: `${height}px` }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              aria-label={`${DAY_LABELS[i]}: ${formatCurrency(val)}`}
            />
          )
        })}
      </div>

      <div className="flex gap-1.5 mt-1.5">
        {DAY_LABELS.map((day, i) => (
          <span
            key={i}
            className={cn(
              'flex-1 text-center text-[10px] font-medium transition-colors duration-150',
              i === TODAY_INDEX ? 'text-brand-500 font-semibold' : 'text-white/30'
            )}
          >
            {day}
          </span>
        ))}
      </div>
    </div>
  )
}
