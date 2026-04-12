import { cn, formatPrice, getInitials } from '@/lib/utils'
import type { Booking, BookingStatus } from '@/lib/types'
import { format } from 'date-fns'

interface ScheduleItemProps {
  booking: Booking
  customerName: string
  serviceName: string
  serviceColor: string
  loading?: boolean
}

const statusConfig: Record<string, { label: string; classes: string }> = {
  confirmed: {
    label: 'Confirmed',
    classes: 'bg-emerald-500/10 text-emerald-400',
  },
  completed: {
    label: 'Completed',
    classes: 'bg-white/10 text-white/50',
  },
  cancelled: {
    label: 'Cancelled',
    classes: 'bg-red-500/10 text-red-400',
  },
  no_show: {
    label: 'No show',
    classes: 'bg-orange-500/10 text-orange-400',
  },
}

export function ScheduleItem({
  booking,
  customerName,
  serviceName,
  serviceColor,
  loading = false,
}: ScheduleItemProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 animate-pulse">
        <div className="w-12 h-4 bg-white/10 rounded" />
        <div className="w-0.5 h-8 bg-white/10 rounded-full" />
        <div className="w-7 h-7 rounded-full bg-white/10" />
        <div className="flex-1 space-y-1">
          <div className="h-3 w-32 bg-white/10 rounded" />
          <div className="h-3 w-24 bg-white/10 rounded" />
        </div>
        <div className="h-4 w-12 bg-white/10 rounded" />
        <div className="h-5 w-16 bg-white/10 rounded-full" />
      </div>
    )
  }

  const initials = getInitials(customerName)
  const statusKey = (booking.status as BookingStatus | string) ?? 'confirmed'
  const status = statusConfig[statusKey] ?? { label: statusKey, classes: 'bg-white/10 text-white/50' }
  const timeStr = format(new Date(booking.starts_at), 'HH:mm')

  return (
    <div className="group flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.03] rounded-premium transition-colors duration-150 cursor-pointer">
      <span className="w-12 text-[11px] font-medium text-white/40 shrink-0">
        {timeStr}
      </span>

      <div
        className="w-0.5 h-8 rounded-full shrink-0 transition-all duration-150 group-hover:h-9"
        style={{ backgroundColor: serviceColor }}
      />

      <div
        className="flex items-center justify-center w-7 h-7 rounded-full shrink-0 text-white text-[10px] font-bold"
        style={{ backgroundColor: serviceColor }}
      >
        {initials}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-white truncate">{customerName}</p>
        <p className="text-[11px] text-white/40 truncate">{serviceName}</p>
      </div>

      <span className="text-[13px] font-semibold text-white shrink-0">
        {formatPrice(booking.price_cents)}
      </span>

      <span
        className={cn(
          'inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold shrink-0',
          status.classes
        )}
      >
        {status.label}
      </span>
    </div>
  )
}
