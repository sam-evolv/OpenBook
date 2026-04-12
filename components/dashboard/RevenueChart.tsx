'use client'

import { useState } from 'react'
import { cn, formatCurrency } from '@/lib/utils'

interface RevenueChartProps {
  data: number[]
  loading?: boolean
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const TODAY_INDEX = 6 // Sunday = last bar (matches weeklyRevenue array order)

export function RevenueChart({ data, loading = false }: RevenueChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const maxVal = Math.max(...data)
  const MAX_HEIGHT = 64 // px

  if (loading) {
    return (
      <div className="flex items-end gap-1.5 h-16 animate-pulse">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex-1 bg-gray-100 rounded-sm" style={{ height: `${(i + 1) * 9}px` }} />
        ))}
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Tooltip */}
      {hoveredIndex !== null && (
        <div
          className="absolute -top-8 text-[11px] font-semibold bg-gray-900 text-white px-2 py-1 rounded-card pointer-events-none z-10 transition-all duration-150 ease-premium"
          style={{ left: `calc(${(hoveredIndex / 6) * 100}% - 20px)` }}
        >
          {formatCurrency(data[hoveredIndex])}
        </div>
      )}

      {/* Bars */}
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
                  ? 'bg-gray-300'
                  : 'bg-gray-200',
                isHovered && !isToday && 'opacity-80'
              )}
              style={{ height: `${height}px` }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              aria-label={`${DAY_LABELS[i]}: ${formatCurrency(val)}`}
            />
          )
        })}
      </div>

      {/* Labels */}
      <div className="flex gap-1.5 mt-1.5">
        {DAY_LABELS.map((day, i) => (
          <span
            key={i}
            className={cn(
              'flex-1 text-center text-[10px] font-medium transition-colors duration-150',
              i === TODAY_INDEX ? 'text-brand-500 font-semibold' : 'text-gray-400'
            )}
          >
            {day}
          </span>
        ))}
      </div>
    </div>
  )
}
