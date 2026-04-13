import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label:    string
  value:    string
  icon:     React.ElementType
  iconBg:   string
  iconColor: string
  trend?: {
    value:     string
    direction: 'up' | 'down' | 'neutral'
  }
  loading?: boolean
}

export function StatCard({
  label, value, icon: Icon, iconBg, iconColor, trend, loading = false,
}: StatCardProps) {
  if (loading) {
    return (
      <div
        className="rounded-premium p-4"
        style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="w-8 h-8 rounded-premium mb-3 animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="h-2.5 w-20 rounded mb-2 animate-pulse"     style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="h-6 w-28 rounded mb-2 animate-pulse"        style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="h-2.5 w-16 rounded animate-pulse"           style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>
    )
  }

  return (
    <div
      className="group rounded-premium p-4 hover:-translate-y-0.5 transition-all duration-200"
      style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Icon */}
      <div className={cn('flex items-center justify-center w-8 h-8 rounded-premium mb-3', iconBg)}>
        <Icon size={16} className={iconColor} />
      </div>

      {/* Label */}
      <p
        className="text-[11px] font-semibold uppercase tracking-wide mb-1"
        style={{ color: 'rgba(255,255,255,0.45)', letterSpacing: '0.07em' }}
      >
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
              : 'text-white/30',
          )}
        >
          {trend.direction === 'up'   ? <TrendingUp   size={12} /> :
           trend.direction === 'down' ? <TrendingDown  size={12} /> : null}
          {trend.value}
        </div>
      )}
    </div>
  )
}
