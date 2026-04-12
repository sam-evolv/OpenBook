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
      <div className="rounded-premium border border-white/[0.07] bg-surface p-4">
        <div className="w-8 h-8 rounded-premium bg-white/[0.06] animate-pulse mb-3" />
        <div className="h-3 w-20 bg-white/[0.06] rounded animate-pulse mb-2" />
        <div className="h-6 w-28 bg-white/[0.06] rounded animate-pulse mb-2" />
        <div className="h-3 w-16 bg-white/[0.06] rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="group rounded-premium border border-white/[0.07] bg-surface p-4 hover:border-white/[0.14] hover:-translate-y-0.5 transition-all duration-250 ease-premium">
      {/* Icon */}
      <div className={cn('flex items-center justify-center w-8 h-8 rounded-premium mb-3', iconBg)}>
        <Icon size={16} className={iconColor} />
      </div>

      {/* Label */}
      <p className="text-[11.5px] font-semibold uppercase tracking-wide text-white/40 mb-1">
        {label}
      </p>

      {/* Value */}
      <p className="text-2xl font-bold text-white leading-tight">{value}</p>

      {/* Trend */}
      {trend && (
        <div
          className={cn(
            'inline-flex items-center gap-1 mt-1.5 text-[12px] font-medium',
            trend.direction === 'up'
              ? 'text-emerald-400'
              : trend.direction === 'down'
              ? 'text-red-400'
              : 'text-white/40'
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
