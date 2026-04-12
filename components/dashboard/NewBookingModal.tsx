'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Search, ChevronDown } from 'lucide-react'
import { mockCustomers, mockServices, mockTimeSlots } from '@/lib/mock-data'
import { cn, getDurationLabel, formatCurrency } from '@/lib/utils'

interface NewBookingModalProps {
  open: boolean
  onClose: () => void
}

export function NewBookingModal({ open, onClose }: NewBookingModalProps) {
  const [clientSearch, setClientSearch] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [selectedTime, setSelectedTime] = useState('')
  const [notes, setNotes] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)

  const filteredCustomers = mockCustomers.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  )

  const selectedCustomer = mockCustomers.find((c) => c.id === selectedCustomerId)
  const selectedService = mockServices.find((s) => s.id === selectedServiceId)
  const availableSlots = mockTimeSlots.filter((s) => s.available)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // In real app: call Supabase insert
    onClose()
    resetForm()
  }

  function resetForm() {
    setClientSearch('')
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
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-premium shadow-premium p-6 data-[state=open]:animate-slide-up focus:outline-none">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-[15px] font-semibold text-gray-900">
              New Booking
            </Dialog.Title>
            <Dialog.Close
              onClick={handleClose}
              className="flex items-center justify-center w-7 h-7 rounded-premium text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-150 ease-premium focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <X size={14} />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Client search */}
            <div className="relative">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                Client
              </label>
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={selectedCustomer ? selectedCustomer.name : clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value)
                    setSelectedCustomerId('')
                    setShowClientDropdown(true)
                  }}
                  onFocus={() => setShowClientDropdown(true)}
                  className="w-full h-9 pl-8 pr-3 text-[13px] border border-gray-200 rounded-card bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-150"
                />
              </div>

              {showClientDropdown && filteredCustomers.length > 0 && !selectedCustomerId && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-card shadow-premium z-10 max-h-40 overflow-y-auto">
                  {filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId(c.id)
                        setClientSearch(c.name)
                        setShowClientDropdown(false)
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50 transition-colors duration-100"
                    >
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-500/15 shrink-0">
                        <span className="text-[9px] font-bold text-brand-500">
                          {c.name.split(' ').map((n) => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="text-[12px] font-medium text-gray-900">{c.name}</p>
                        <p className="text-[11px] text-gray-400">{c.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Service */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                Service
              </label>
              <div className="relative">
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full h-9 pl-3 pr-8 text-[13px] border border-gray-200 rounded-card bg-white text-gray-900 appearance-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-150"
                >
                  <option value="">Select a service...</option>
                  {mockServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {getDurationLabel(s.duration)} · {formatCurrency(s.price)}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>
            </div>

            {/* Date + Time row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full h-9 px-3 text-[13px] border border-gray-200 rounded-card bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-150"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                  Time
                </label>
                <div className="relative">
                  <select
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full h-9 pl-3 pr-8 text-[13px] border border-gray-200 rounded-card bg-white text-gray-900 appearance-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-150"
                  >
                    <option value="">Pick time...</option>
                    {availableSlots.map((s) => (
                      <option key={s.time} value={s.time}>
                        {s.time}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                Notes{' '}
                <span className="normal-case font-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes for this booking..."
                rows={3}
                className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-card bg-white text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-150"
              />
            </div>

            {/* Summary pill */}
            {selectedService && (
              <div className="flex items-center gap-2 p-3 bg-brand-500/8 rounded-card border border-brand-500/20">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: selectedService.color }}
                />
                <p className="text-[12px] text-gray-700 flex-1">
                  {selectedService.name} · {getDurationLabel(selectedService.duration)}
                </p>
                <p className="text-[13px] font-semibold text-gray-900">
                  {formatCurrency(selectedService.price)}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 h-9 rounded-premium text-[13px] font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition-all duration-150 ease-premium focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={cn(
                  'flex-1 h-9 rounded-premium text-[13px] font-semibold transition-all duration-150 ease-premium focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
                  selectedCustomerId && selectedServiceId && selectedTime
                    ? 'bg-brand-500 text-black hover:bg-brand-600 active:bg-brand-700 shadow-gold'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                )}
                disabled={!selectedCustomerId || !selectedServiceId || !selectedTime}
              >
                Create Booking
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
