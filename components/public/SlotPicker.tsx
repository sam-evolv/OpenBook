'use client'

import { useState, useEffect } from 'react'
import type { Business, Service, TimeSlot } from '@/lib/types'
import { format, addDays, parseISO, startOfDay } from 'date-fns'

interface StaffMember { id: string; name: string; avatar_url: string | null }

interface Props {
  business: Business
  service: Service
  staff: StaffMember[]
  accent: string
}

type BookingStep = 'slots' | 'details' | 'confirm' | 'done'

export default function SlotPicker({ business, service, staff, accent }: Props) {
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  )
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null)
  const [step, setStep] = useState<BookingStep>('slots')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Generate the next 14 days for date strip
  const dateDays = Array.from({ length: 14 }, (_, i) =>
    format(addDays(new Date(), i), 'yyyy-MM-dd')
  )

  useEffect(() => {
    loadSlots(selectedDate)
  }, [selectedDate])

  async function loadSlots(date: string) {
    setLoadingSlots(true)
    setSelectedSlot(null)
    try {
      const res = await fetch(
        `/api/bookings/availability?business_id=${business.id}&service_id=${service.id}&date=${date}`
      )
      const data = await res.json()
      setSlots(data.isClosed ? [] : data.slots ?? [])
    } catch {
      setSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  async function handleBook() {
    if (!selectedSlot) return
    setBooking(true)
    setError(null)

    // Create or find customer, then create booking
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    // Upsert customer
    const customerRes = await fetch(`${supabaseUrl}/rest/v1/customers`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation,resolution=ignore-duplicates',
      },
      body: JSON.stringify({ name, email }),
    })
    const [customer] = await customerRes.json()

    if (!customer?.id) {
      setError('Could not create customer record.')
      setBooking(false)
      return
    }

    const res = await fetch('/api/bookings/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_id: business.id,
        service_id: service.id,
        customer_id: customer.id,
        staff_id: selectedStaff,
        starts_at: `${selectedDate}T${selectedSlot}:00`,
        source: 'app',
      }),
    })

    if (res.ok) {
      setStep('done')
    } else {
      const { error: msg } = await res.json()
      setError(msg ?? 'Booking failed')
    }
    setBooking(false)
  }

  if (step === 'done') {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{
          background: `${accent}10`,
          border: `1px solid ${accent}40`,
        }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: `${accent}20` }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-white mb-1">Booking confirmed!</h3>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
          {service.name} · {format(parseISO(selectedDate), 'EEEE d MMMM')} at {selectedSlot}
        </p>
        <p className="text-xs mt-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Confirmation sent to {email}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.28)' }}>
        Pick a time
      </h2>

      {/* Date strip */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {dateDays.map((d) => {
          const dayDate = parseISO(d)
          const isSelected = d === selectedDate
          return (
            <button
              key={d}
              onClick={() => setSelectedDate(d)}
              className="flex-shrink-0 flex flex-col items-center rounded-xl px-3.5 py-2.5 transition-all"
              style={{
                background: isSelected ? accent : 'rgba(255,255,255,0.07)',
                color: isSelected ? '#000' : 'rgba(255,255,255,0.55)',
                minWidth: 52,
              }}
            >
              <span className="text-xs font-medium">{format(dayDate, 'EEE')}</span>
              <span className="text-base font-bold">{format(dayDate, 'd')}</span>
            </button>
          )
        })}
      </div>

      {/* Staff picker */}
      {staff.length > 1 && (
        <div>
          <div className="text-xs font-medium mb-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Staff (optional)
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedStaff(null)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={{
                background: selectedStaff === null ? accent : 'rgba(255,255,255,0.07)',
                color: selectedStaff === null ? '#000' : 'rgba(255,255,255,0.55)',
              }}
            >
              Any
            </button>
            {staff.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedStaff(s.id)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                style={{
                  background: selectedStaff === s.id ? accent : 'rgba(255,255,255,0.07)',
                  color: selectedStaff === s.id ? '#000' : 'rgba(255,255,255,0.55)',
                }}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Slots */}
      {loadingSlots ? (
        <div className="text-center py-8 text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Loading availability…
        </div>
      ) : slots.filter((s) => s.available).length === 0 ? (
        <div className="text-center py-8 text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
          No availability on this date
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {slots.map((slot) => (
            <button
              key={slot.time}
              disabled={!slot.available}
              onClick={() => { setSelectedSlot(slot.time); setStep('details') }}
              className="rounded-xl py-2.5 text-sm font-medium transition-all disabled:opacity-30"
              style={{
                background: selectedSlot === slot.time ? accent : 'rgba(255,255,255,0.07)',
                color: selectedSlot === slot.time ? '#000' : slot.available ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)',
              }}
            >
              {slot.time}
            </button>
          ))}
        </div>
      )}

      {/* Details form */}
      {step === 'details' && selectedSlot && (
        <div className="space-y-4 pt-2">
          <div
            className="rounded-xl p-4 text-sm"
            style={{ background: `${accent}10`, border: `1px solid ${accent}30` }}
          >
            <span className="font-medium text-white">{service.name}</span>
            <span className="mx-2" style={{ color: 'rgba(255,255,255,0.4)' }}>·</span>
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>
              {format(parseISO(selectedDate), 'EEE d MMM')} at {selectedSlot}
            </span>
          </div>

          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)' }}
          />
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)' }}
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            onClick={handleBook}
            disabled={booking || !name || !email}
            className="w-full rounded-xl py-3.5 text-sm font-semibold transition-opacity disabled:opacity-40"
            style={{ background: accent, color: '#000' }}
          >
            {booking ? 'Booking…' : `Confirm booking — ${formatPrice(service.price_cents)}`}
          </button>
        </div>
      )}
    </div>
  )
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}
