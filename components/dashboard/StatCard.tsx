import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string
  icon: React.ElementType
  iconBg: string
  iconColor: string
  trend?: {
    value: string
    direction: 'up' | 'down' | 'neutral'
  }
  loading?: boolean
}

export function StatCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  trend,
  loading = false,
}: StatCardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-premium border border-gray-100 p-4 shadow-card">
        <div className="w-8 h-8 rounded-premium bg-gray-100 animate-pulse mb-3" />
        <div className="h-3 w-20 bg-gray-100 rounded animate-pulse mb-2" />
        <div className="h-6 w-28 bg-gray-100 rounded animate-pulse mb-2" />
        <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="group bg-white rounded-premium border border-gray-100 p-4 shadow-card hover:shadow-premium hover:-translate-y-0.5 transition-all duration-250 ease-premium">
      {/* Icon */}
      <div
        className={cn('flex items-center justify-center w-8 h-8 rounded-premium mb-3', iconBg)}
      >
        <Icon size={16} className={iconColor} />
      </div>

      {/* Label */}
      <p className="text-[11.5px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
        {label}
      </p>

      {/* Value */}
      <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>

      {/* Trend */}
      {trend && (
        <div
          className={cn(
            'inline-flex items-center gap-1 mt-1.5 text-[12px] font-medium',
            trend.direction === 'up'
              ? 'text-emerald-600'
              : trend.direction === 'down'
              ? 'text-red-500'
              : 'text-gray-400'
          )}
        >
          {trend.direction === 'up' ? (
            <TrendingUp size={12} />
          ) : trend.direction === 'down' ? (
            <TrendingDown size={12} />
          ) : null}
          {trend.value}
        </div>
      )}
    </div>
  )
}
