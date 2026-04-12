import { cn, formatCurrency, getInitials } from '@/lib/utils'
import type { Booking, BookingStatus } from '@/lib/types'

interface ScheduleItemProps {
  booking: Booking
  customerName: string
  serviceName: string
  serviceColor: string
  loading?: boolean
}

const statusConfig: Record<
  BookingStatus,
  { label: string; classes: string }
> = {
  confirmed: {
    label: 'Confirmed',
    classes: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  },
  pending: {
    label: 'Pending',
    classes: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  },
  'checked-in': {
    label: 'Checked in',
    classes: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  },
  completed: {
    label: 'Completed',
    classes: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
  },
  cancelled: {
    label: 'Cancelled',
    classes: 'bg-red-50 text-red-600 ring-1 ring-red-200',
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
        <div className="w-12 h-4 bg-gray-100 rounded" />
        <div className="w-0.5 h-8 bg-gray-100 rounded-full" />
        <div className="w-7 h-7 rounded-full bg-gray-100" />
        <div className="flex-1 space-y-1">
          <div className="h-3 w-32 bg-gray-100 rounded" />
          <div className="h-3 w-24 bg-gray-100 rounded" />
        </div>
        <div className="h-4 w-12 bg-gray-100 rounded" />
        <div className="h-5 w-16 bg-gray-100 rounded-full" />
      </div>
    )
  }

  const initials = getInitials(customerName)
  const status = statusConfig[booking.status]

  return (
    <div className="group flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-card transition-colors duration-150 cursor-pointer">
      {/* Time */}
      <span className="w-12 text-[11px] font-medium text-gray-400 shrink-0">
        {booking.time}
      </span>

      {/* Color bar */}
      <div
        className="w-0.5 h-8 rounded-full shrink-0 transition-all duration-150 group-hover:h-9"
        style={{ backgroundColor: serviceColor }}
      />

      {/* Avatar */}
      <div
        className="flex items-center justify-center w-7 h-7 rounded-full shrink-0 text-white text-[10px] font-bold"
        style={{ backgroundColor: serviceColor }}
      >
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-gray-900 truncate">{customerName}</p>
        <p className="text-[11px] text-gray-400 truncate">{serviceName}</p>
      </div>

      {/* Price */}
      <span className="text-[13px] font-semibold text-gray-700 shrink-0">
        {formatCurrency(booking.price)}
      </span>

      {/* Status badge */}
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
