'use client'

import { ArrowRight } from 'lucide-react'
import { cn, formatCurrency, getDurationLabel } from '@/lib/utils'
import type { Service } from '@/lib/types'

interface ServiceCardProps {
  service: Service
  onSelect: (service: Service) => void
  selected?: boolean
}

export function ServiceCard({ service, onSelect, selected = false }: ServiceCardProps) {
  return (
    <button
      onClick={() => onSelect(service)}
      className={cn(
        'group w-full flex items-center gap-3 p-3.5 bg-white rounded-card border text-left transition-all duration-250 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        selected
          ? 'border-brand-500 shadow-gold -translate-y-0.5'
          : 'border-gray-200 hover:border-brand-500/60 hover:shadow-gold hover:-translate-y-0.5'
      )}
    >
      {/* Color dot */}
      <div
        className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
        style={{ backgroundColor: service.color }}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-gray-900 truncate">{service.name}</p>
        <p className="text-[12px] text-gray-400 mt-0.5">
          {getDurationLabel(service.duration)}
          {service.groupMax ? ` · Group up to ${service.groupMax}` : ''}
        </p>
      </div>

      {/* Price + button */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-[15px] font-bold text-gray-900">{formatCurrency(service.price)}</span>
        <div
          className={cn(
            'flex items-center gap-1 h-7 px-2.5 rounded-card text-[12px] font-semibold transition-all duration-150 ease-premium',
            selected
              ? 'bg-brand-500 text-black'
              : 'bg-gray-100 text-gray-600 group-hover:bg-brand-500 group-hover:text-black'
          )}
          style={selected ? {} : {}}
        >
          Book
          <ArrowRight size={11} />
        </div>
      </div>
    </button>
  )
}
