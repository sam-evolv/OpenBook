'use client'

import { Plus, Pencil } from 'lucide-react'
import { mockServices } from '@/lib/mock-data'
import { formatCurrency, getDurationLabel } from '@/lib/utils'

export default function ServicesPage() {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex justify-end">
        <button className="inline-flex items-center gap-1.5 h-9 px-4 rounded-premium bg-brand-500 text-[13px] font-semibold text-black hover:bg-brand-600 active:bg-brand-700 transition-all duration-150 ease-premium shadow-gold focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
          <Plus size={14} strokeWidth={2.5} />
          Add Service
        </button>
      </div>

      {/* Services list */}
      <div className="bg-white rounded-premium border border-gray-100 shadow-card overflow-hidden">
        <div className="divide-y divide-gray-50">
          {mockServices.map((service) => (
            <div
              key={service.id}
              className="group flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50 transition-colors duration-150"
            >
              {/* Color dot */}
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: service.color }}
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-gray-900">{service.name}</p>
                <p className="text-[11px] text-gray-400">
                  {getDurationLabel(service.duration)}
                  {service.groupMax ? ` · Group up to ${service.groupMax}` : ' · 1-on-1'}
                </p>
              </div>

              {/* Price */}
              <span className="text-[15px] font-bold text-gray-900">
                {formatCurrency(service.price)}
              </span>

              {/* Edit */}
              <button
                className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-7 h-7 rounded-card text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500"
                aria-label={`Edit ${service.name}`}
              >
                <Pencil size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
