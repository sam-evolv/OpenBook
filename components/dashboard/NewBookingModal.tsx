'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, ChevronDown } from 'lucide-react'
import { cn, getDurationLabel, formatPrice } from '@/lib/utils'
import type { Service, Customer } from '@/lib/types'

interface NewBookingModalProps {
  open: boolean
  onClose: () => void
  services?: Service[]
  customers?: Customer[]
}

export function NewBookingModal({ open, onClose, services = [], customers = [] }: NewBookingModalProps) {
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedTime, setSelectedTime] = useState('')
  const [notes, setNotes] = useState('')

  const selectedService = services.find((s) => s.id === selectedServiceId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCustomerId || !selectedServiceId || !selectedTime) return

    await fetch('/api/bookings/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: selectedServiceId,
        customer_id: selectedCustomerId,
        starts_at: `${selectedDate}T${selectedTime}:00`,
        notes,
        source: 'dashboard',
      }),
    })

    onClose()
    resetForm()
  }

  function resetForm() {
    setSelectedCustomerId('')
    setSelectedServiceId('')
    setSelectedDate(new Date().toISOString().split('T')[0])
    setSelectedTime('')
    setNotes('')
  }

  function handleClose() {
    onClose()
    resetForm()
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-2xl p-6 data-[state=open]:animate-slide-up focus:outline-none"
          style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.14)' }}
        >
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-[15px] font-semibold text-white">
              New Booking
            </Dialog.Title>
            <Dialog.Close
              onClick={handleClose}
              className="flex items-center justify-center w-7 h-7 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all"
            >
              <X size={14} />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Client">
              <div className="relative">
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="select"
                >
                  <option value="">Select client…</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name ?? c.email ?? c.id}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
              </div>
            </Field>

            <Field label="Service">
              <div className="relative">
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="select"
                >
                  <option value="">Select service…</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {getDurationLabel(s.duration_minutes)} · {formatPrice(s.price_cents)}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Date">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="select"
                />
              </Field>
              <Field label="Time">
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="select"
                />
              </Field>
            </div>

            <Field label="Notes (optional)">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes for this booking…"
                rows={3}
                className="select resize-none"
              />
            </Field>

            {selectedService && (
              <div
                className="flex items-center gap-2 p-3 rounded-xl"
                style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)' }}
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: selectedService.colour ?? '#D4AF37' }}
                />
                <p className="text-[12px] text-white/70 flex-1">
                  {selectedService.name} · {getDurationLabel(selectedService.duration_minutes)}
                </p>
                <p className="text-[13px] font-semibold text-white">
                  {formatPrice(selectedService.price_cents)}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 h-9 rounded-xl text-[13px] font-medium text-white/60 transition-all"
                style={{ border: '1px solid rgba(255,255,255,0.14)', background: 'transparent' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={cn(
                  'flex-1 h-9 rounded-xl text-[13px] font-semibold transition-all',
                  selectedCustomerId && selectedServiceId && selectedTime
                    ? 'bg-brand-500 text-black'
                    : 'bg-white/10 text-white/40 cursor-not-allowed'
                )}
                disabled={!selectedCustomerId || !selectedServiceId || !selectedTime}
              >
                Create Booking
              </button>
            </div>
          </form>

          <style jsx>{`
            .select {
              width: 100%;
              height: 36px;
              padding: 0 12px;
              background: rgba(255,255,255,0.07);
              border: 1px solid rgba(255,255,255,0.12);
              border-radius: 12px;
              color: white;
              font-size: 13px;
              outline: none;
              appearance: none;
            }
            .select option { background: #1a1a1a; }
            .select::placeholder { color: rgba(255,255,255,0.3); }
            textarea.select { height: auto; padding: 10px 12px; }
          `}</style>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}
