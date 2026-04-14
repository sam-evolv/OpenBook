import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label:    string
  value:    string
  icon:     React.ElementType
  trend?: {
    value:     string
    direction: 'up' | 'down' | 'neutral'
    subtext?:  string
  }
  loading?: boolean
}

export function StatCard({ label, value, icon: Icon, trend, loading = false }: StatCardProps) {
  if (loading) {
    return (
      <div className="dashboard-card">
        <div className="flex items-center justify-between mb-3">
          <div className="skeleton-shimmer h-3 w-20" />
          <div className="skeleton-shimmer h-4 w-4 rounded" />
        </div>
        <div className="skeleton-shimmer h-8 w-28 mb-2" />
        <div className="skeleton-shimmer h-3 w-24" />
      </div>
    )
  }

  return (
    <div
      className="group dashboard-card relative overflow-hidden transition-all duration-200"
      style={{ borderLeft: '2px solid transparent' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderLeftColor = 'rgba(212,175,55,0.4)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderLeftColor = 'transparent'
      }}
    >
      {/* Top row: label + icon */}
      <div className="flex items-center justify-between mb-3">
        <p className="section-label">{label}</p>
        <Icon size={16} className="text-white/35" />
      </div>

      {/* Value */}
      <p className="stat-value leading-tight">{value}</p>

      {/* Trend */}
      {trend && (
        <div className="flex items-center gap-1.5 mt-2">
          <div
            className={cn(
              'inline-flex items-center gap-0.5 text-[12px] font-medium',
              trend.direction === 'up' ? 'text-emerald-400' :
              trend.direction === 'down' ? 'text-red-400' :
              'text-white/30',
            )}
          >
            {trend.direction === 'up' && <TrendingUp size={12} />}
            {trend.direction === 'down' && <TrendingDown size={12} />}
            {trend.direction === 'neutral' && <Minus size={12} />}
            {trend.value}
          </div>
          {trend.subtext && (
            <span className="text-[12px] text-white/30">{trend.subtext}</span>
          )}
        </div>
      )}
    </div>
  )
}
