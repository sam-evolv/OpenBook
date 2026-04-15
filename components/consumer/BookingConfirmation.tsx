'use client'

import { CheckCircle, MapPin, Clock, RefreshCw } from 'lucide-react'
import { getDurationLabel, formatPrice } from '@/lib/utils'
import type { Service, Business } from '@/lib/types'

interface BookingConfirmationProps {
  service: Service
  time: string
  business: Business
  onBookAnother: () => void
}

export function BookingConfirmation({
  service,
  time,
  business,
  onBookAnother,
}: BookingConfirmationProps) {
  return (
    <div className="flex flex-col items-center text-center space-y-5 py-6 animate-slide-up">
      <div className="relative">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/15">
          <CheckCircle size={36} className="text-emerald-400" strokeWidth={1.5} />
        </div>
        <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" />
      </div>

      <div>
        <p className="text-[22px] font-bold text-white">Booking confirmed!</p>
        <p className="text-[13px] text-white/50 mt-1">
          You&apos;re all set. A confirmation has been sent to your email.
        </p>
      </div>

      <div className="w-full bg-white/8 rounded-premium border border-white/10 p-4 text-left space-y-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: service.colour ?? '#D4AF37' }}
          />
          <p className="text-[14px] font-semibold text-white">{service.name}</p>
        </div>

        <div className="flex items-center gap-2.5 text-white/60">
          <Clock size={13} className="shrink-0" />
          <p className="text-[13px]">
            Today at {time} · {getDurationLabel(service.duration_minutes)} ·{' '}
            <span className="text-brand-500 font-semibold">{formatPrice(service.price_cents)}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 text-white/60">
          <MapPin size={13} className="shrink-0" />
          <p className="text-[13px]">{business.city ?? business.address ?? 'See confirmation email'}</p>
        </div>
      </div>

      <p className="text-[12px] text-white/40">
        Check your email for full details and a calendar invite.
      </p>

      <button
        onClick={onBookAnother}
        className="inline-flex items-center gap-2 h-10 px-5 rounded-premium border border-white/20 text-[13px] font-medium text-white/80 hover:text-white hover:bg-white/8 hover:border-white/30 transition-all duration-150 ease-premium focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <RefreshCw size={13} />
        Book another
      </button>
    </div>
  )
}
