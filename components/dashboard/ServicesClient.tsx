'use client'

import { useState } from 'react'
import { GripVertical, Edit2, Trash2, Plus, Dumbbell } from 'lucide-react'
import { formatPrice, getDurationLabel } from '@/lib/utils'
import type { Service } from '@/lib/types'

export function ServicesClient({ services: initialServices }: { services: Service[] }) {
  const [services] = useState(initialServices)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newService, setNewService] = useState({
    name: '', duration_minutes: 60, price_cents: 5000, description: '', capacity: 1, category: '',
  })

  return (
    <div className="space-y-4">
      {/* Service cards */}
      <div className="space-y-3">
        {services.length === 0 && !showAddForm && (
          <div className="dashboard-card flex flex-col items-center justify-center py-12">
            <Dumbbell size={32} className="text-[#D4AF37] mb-3" />
            <p className="text-[14px] font-medium text-white mb-1">No services yet</p>
            <p className="text-[13px] text-white/40 text-center">
              Add your first service to start taking bookings
            </p>
          </div>
        )}

        {services.map((s) => (
          <div
            key={s.id}
            className="group dashboard-card !p-0 overflow-hidden transition-all duration-200"
            style={{
              borderLeft: '3px solid #D4AF37',
              opacity: s.is_active ? 1 : 0.4,
            }}
          >
            <div className="flex items-center gap-4 px-5 py-4">
              {/* Drag handle */}
              <GripVertical size={14} className="text-white/20 shrink-0 cursor-grab" />

              {/* Service info */}
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold text-white">{s.name}</div>
                {s.description && (
                  <div className="text-[12px] mt-0.5 text-white/40 truncate">{s.description}</div>
                )}
              </div>

              {/* Duration badge */}
              <span
                className="text-[11px] font-medium px-2.5 py-1 rounded-md shrink-0"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
              >
                {getDurationLabel(s.duration_minutes)}
              </span>

              {/* Capacity */}
              {(s.capacity ?? 1) > 1 && (
                <span
                  className="text-[11px] font-medium px-2.5 py-1 rounded-md shrink-0"
                  style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}
                >
                  {s.capacity} spots
                </span>
              )}

              {/* Price */}
              <span className="text-[16px] font-bold text-[#D4AF37] shrink-0">
                {formatPrice(s.price_cents)}
              </span>

              {/* Toggle */}
              <button
                className="w-10 h-5 rounded-full transition-colors relative shrink-0"
                style={{ background: s.is_active ? '#D4AF37' : 'rgba(255,255,255,0.08)' }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                  style={{ left: s.is_active ? '22px' : '2px' }}
                />
              </button>

              {/* Edit / Delete — visible on hover */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="flex items-center justify-center w-7 h-7 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.05] transition-all">
                  <Edit2 size={13} />
                </button>
                <button className="flex items-center justify-center w-7 h-7 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Add service form (accordion-style) */}
        {showAddForm && (
          <div className="dashboard-card space-y-4">
            <h3 className="text-[14px] font-semibold text-white">New Service</h3>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Name" value={newService.name} onChange={(v) => setNewService((p) => ({ ...p, name: v }))} placeholder="e.g. Personal Training" />
              <FormField label="Category" value={newService.category} onChange={(v) => setNewService((p) => ({ ...p, category: v }))} placeholder="e.g. Training" />
              <FormField label="Duration (min)" value={String(newService.duration_minutes)} onChange={(v) => setNewService((p) => ({ ...p, duration_minutes: Number(v) }))} type="number" />
              <FormField label="Price (cents)" value={String(newService.price_cents)} onChange={(v) => setNewService((p) => ({ ...p, price_cents: Number(v) }))} type="number" />
              <FormField label="Capacity" value={String(newService.capacity)} onChange={(v) => setNewService((p) => ({ ...p, capacity: Number(v) }))} type="number" />
            </div>
            <FormField label="Description" value={newService.description} onChange={(v) => setNewService((p) => ({ ...p, description: v }))} placeholder="Optional description…" />
            <div className="flex items-center gap-2 pt-1">
              <button
                className="h-9 px-4 rounded-xl text-[13px] font-semibold transition-all btn-press"
                style={{ background: '#D4AF37', color: '#000' }}
              >
                Save Service
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="h-9 px-4 rounded-xl text-[13px] font-medium text-white/40 hover:text-white/60 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Add service button */}
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl transition-all duration-200 hover:bg-[rgba(212,175,55,0.06)]"
          style={{
            border: '2px dashed rgba(212,175,55,0.3)',
            color: '#D4AF37',
          }}
        >
          <Plus size={16} />
          <span className="text-[14px] font-medium">Add service</span>
        </button>
      </div>
    </div>
  )
}

function FormField({
  label, value, onChange, placeholder, type = 'text',
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="block section-label mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 px-3 rounded-lg text-[13px] text-white placeholder:text-white/30 gold-focus-ring"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      />
    </div>
  )
}
