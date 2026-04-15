'use client'

import { ArrowLeft } from 'lucide-react'
import { cn, getDurationLabel, formatPrice } from '@/lib/utils'
import type { Service, TimeSlot } from '@/lib/types'

interface SlotPickerProps {
  service: Service
  slots: TimeSlot[]
  selectedSlot: string | null
  onSelectSlot: (time: string) => void
  onBack: () => void
  onConfirm: () => void
}

export function SlotPicker({
  service,
  slots,
  selectedSlot,
  onSelectSlot,
  onBack,
  onConfirm,
}: SlotPickerProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-8 h-8 rounded-premium border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all duration-150 ease-premium focus-visible:ring-2 focus-visible:ring-brand-500"
          aria-label="Back to services"
        >
          <ArrowLeft size={15} />
        </button>

        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: service.colour ?? '#D4AF37' }}
          />
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-white truncate">{service.name}</p>
            <p className="text-[12px] text-white/60">
              {getDurationLabel(service.duration_minutes)} · {formatPrice(service.price_cents)}
            </p>
          </div>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50 mb-3">
          Available today — pick a time
        </p>
        <div className="grid grid-cols-4 gap-2">
          {slots.map((slot) => (
            <button
              key={slot.time}
              disabled={!slot.available}
              onClick={() => slot.available && onSelectSlot(slot.time)}
              className={cn(
                'py-2 rounded-premium text-center text-[12px] font-medium border transition-all duration-150 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                !slot.available
                  ? 'bg-white/5 border-white/10 text-white/25 line-through cursor-not-allowed'
                  : selectedSlot === slot.time
                  ? 'bg-brand-500 border-brand-500 text-black font-semibold shadow-gold'
                  : 'bg-white/8 border-white/15 text-white/80 hover:border-brand-500/70 hover:text-white hover:bg-white/12'
              )}
              aria-pressed={selectedSlot === slot.time}
              aria-disabled={!slot.available}
            >
              {slot.time}
            </button>
          ))}
        </div>
      </div>

      {selectedSlot && (
        <button
          onClick={onConfirm}
          className="w-full h-11 rounded-premium bg-brand-500 text-[14px] font-semibold text-black hover:bg-brand-600 active:bg-brand-700 transition-all duration-150 ease-premium shadow-gold focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 animate-slide-up"
        >
          Confirm booking → {selectedSlot}
        </button>
      )}
    </div>
  )
}
