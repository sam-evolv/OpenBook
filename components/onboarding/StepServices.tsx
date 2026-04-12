'use client'

import { useState, useEffect } from 'react'
import { tokens } from '@/lib/types'
import { formatPrice } from '@/lib/utils'
import type { OnboardingData } from './OnboardingFlow'

type Service = OnboardingData['services'][number]

const BLANK: Service = {
  name: '',
  description: '',
  duration_minutes: 60,
  price_cents: 5000,
  capacity: 1,
  colour: '#D4AF37',
}

// Exact suggestions keyed by category (must match StepBasics CATEGORIES)
const SUGGESTIONS: Record<string, Service[]> = {
  'Personal Training': [
    { name: 'Personal Training', description: '1-on-1 session tailored to your goals', duration_minutes: 60, price_cents: 6500, capacity: 1, colour: '#D4AF37' },
    { name: 'Sports Massage', description: 'Deep tissue recovery massage', duration_minutes: 60, price_cents: 8000, capacity: 1, colour: '#C9A961' },
    { name: 'Group HIIT', description: 'High-intensity interval training class', duration_minutes: 45, price_cents: 2500, capacity: 10, colour: '#B8934C' },
  ],
  'Fitness & Wellness': [
    { name: 'Personal Training', description: '1-on-1 session tailored to your goals', duration_minutes: 60, price_cents: 6500, capacity: 1, colour: '#D4AF37' },
    { name: 'Sports Massage', description: 'Deep tissue recovery massage', duration_minutes: 60, price_cents: 8000, capacity: 1, colour: '#C9A961' },
    { name: 'Group HIIT', description: 'High-intensity interval training class', duration_minutes: 45, price_cents: 2500, capacity: 10, colour: '#B8934C' },
  ],
  'Sauna & Spa': [
    { name: 'Sauna Session', description: 'Private sauna session with towel service', duration_minutes: 60, price_cents: 2500, capacity: 4, colour: '#D4AF37' },
    { name: 'Ice Bath + Sauna', description: 'Contrast therapy — cold plunge and sauna', duration_minutes: 75, price_cents: 3500, capacity: 2, colour: '#C9A961' },
    { name: 'Private Hire', description: 'Exclusive full facility hire', duration_minutes: 90, price_cents: 12000, capacity: 10, colour: '#B8934C' },
  ],
  'Yoga & Pilates': [
    { name: 'Drop-in Class', description: 'All-levels group yoga or pilates class', duration_minutes: 60, price_cents: 1500, capacity: 15, colour: '#D4AF37' },
    { name: 'Private Session', description: '1-on-1 yoga or pilates session', duration_minutes: 60, price_cents: 7000, capacity: 1, colour: '#C9A961' },
    { name: 'Sound Bath', description: 'Guided meditation with sound healing', duration_minutes: 75, price_cents: 2000, capacity: 20, colour: '#B8934C' },
  ],
  'Hair & Beauty': [
    { name: 'Wash & Blow Dry', description: 'Shampoo, condition and professional blow-dry', duration_minutes: 45, price_cents: 4000, capacity: 1, colour: '#D4AF37' },
    { name: 'Colour', description: 'Full colour treatment with toner and finish', duration_minutes: 120, price_cents: 8000, capacity: 1, colour: '#C9A961' },
    { name: 'Cut & Style', description: 'Haircut, blow-dry and finish', duration_minutes: 60, price_cents: 5500, capacity: 1, colour: '#B8934C' },
  ],
  'Nail Studio': [
    { name: 'Gel Manicure', description: 'Gel polish manicure with nail prep', duration_minutes: 45, price_cents: 4000, capacity: 1, colour: '#D4AF37' },
    { name: 'Gel Pedicure', description: 'Gel polish pedicure with foot soak', duration_minutes: 60, price_cents: 5000, capacity: 1, colour: '#C9A961' },
    { name: 'Acrylics', description: 'Full set acrylic nail extensions', duration_minutes: 90, price_cents: 7000, capacity: 1, colour: '#B8934C' },
  ],
  'Barbershop': [
    { name: 'Signature Cut', description: 'Precision cut with clippers and scissors', duration_minutes: 30, price_cents: 2800, capacity: 1, colour: '#D4AF37' },
    { name: 'Fade + Beard', description: 'Skin fade with beard shape and line-up', duration_minutes: 45, price_cents: 4000, capacity: 1, colour: '#C9A961' },
    { name: 'Hot Towel Shave', description: 'Traditional straight razor shave', duration_minutes: 30, price_cents: 3000, capacity: 1, colour: '#B8934C' },
  ],
  'Health & Therapy': [
    { name: 'Initial Assessment', description: 'Full consultation and treatment plan', duration_minutes: 60, price_cents: 8500, capacity: 1, colour: '#D4AF37' },
    { name: 'Follow-up', description: 'Follow-up treatment session', duration_minutes: 45, price_cents: 6500, capacity: 1, colour: '#C9A961' },
    { name: 'Sports Massage', description: 'Targeted sports recovery massage', duration_minutes: 60, price_cents: 7000, capacity: 1, colour: '#B8934C' },
  ],
  'Massage': [
    { name: 'Initial Assessment', description: 'Full consultation and treatment plan', duration_minutes: 60, price_cents: 8500, capacity: 1, colour: '#D4AF37' },
    { name: 'Follow-up', description: 'Follow-up treatment session', duration_minutes: 45, price_cents: 6500, capacity: 1, colour: '#C9A961' },
    { name: 'Sports Massage', description: 'Targeted sports recovery massage', duration_minutes: 60, price_cents: 7000, capacity: 1, colour: '#B8934C' },
  ],
  'Coaching': [
    { name: 'Consultation', description: '1-on-1 coaching and strategy session', duration_minutes: 60, price_cents: 8000, capacity: 1, colour: '#D4AF37' },
  ],
}

interface Props { data: OnboardingData; update: (p: Partial<OnboardingData>) => void }

export default function StepServices({ data, update }: Props) {
  const [form, setForm] = useState<Service>(BLANK)
  const [adding, setAdding] = useState(false)

  // Pre-populate with category suggestions if arriving with empty list
  useEffect(() => {
    if (data.services.length === 0 && data.category) {
      const suggestions = SUGGESTIONS[data.category]
      if (suggestions) update({ services: suggestions })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function addService() {
    if (!form.name) return
    update({ services: [...data.services, form] })
    setForm(BLANK)
    setAdding(false)
  }

  function removeService(i: number) {
    update({ services: data.services.filter((_, idx) => idx !== i) })
  }

  const hasSuggestions = !!(data.category && SUGGESTIONS[data.category])

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-1">Add your services</h2>
      <p className="text-sm mb-8" style={{ color: tokens.text2 }}>
        {hasSuggestions
          ? `Pre-loaded for ${data.category} — remove any that don't apply or add your own.`
          : 'You can add more later from the dashboard.'}
      </p>

      <div className="space-y-3 mb-4">
        {data.services.map((s, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{ background: tokens.surface1, border: `1px solid ${tokens.border}` }}
          >
            <div className="min-w-0 mr-3">
              <div className="text-sm font-medium text-white">{s.name}</div>
              <div className="text-xs mt-0.5" style={{ color: tokens.text2 }}>
                {s.duration_minutes}min · {formatPrice(s.price_cents)}
                {s.capacity > 1 ? ` · ${s.capacity} spots` : ''}
              </div>
              {s.description && (
                <div className="text-xs mt-0.5 truncate max-w-[260px]" style={{ color: tokens.text3 }}>
                  {s.description}
                </div>
              )}
            </div>
            <button
              onClick={() => removeService(i)}
              className="shrink-0 text-xs px-2 py-1 rounded-lg transition-colors hover:bg-red-500/10"
              style={{ color: tokens.text3 }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {adding ? (
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{ background: tokens.surface1, border: `1px solid ${tokens.border2}` }}
        >
          <Field label="Service name">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Deep Tissue Massage"
              className="field"
            />
          </Field>

          <Field label="Description (optional)">
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Short description shown to clients on your booking page"
              rows={2}
              className="field resize-none"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Duration (minutes)">
              <input
                type="number"
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                className="field"
                min={15}
                step={15}
              />
            </Field>
            <Field label="Price">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium select-none" style={{ color: 'rgba(255,255,255,0.4)' }}>€</span>
                <input
                  type="number"
                  value={form.price_cents / 100}
                  onChange={(e) => setForm({ ...form, price_cents: Math.round(Number(e.target.value) * 100) })}
                  className="field"
                  style={{ paddingLeft: '26px' }}
                  min={0}
                  step={0.5}
                />
              </div>
            </Field>
          </div>

          <Field label="Max persons (1 = 1-on-1)">
            <input
              type="number"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
              className="field"
              min={1}
            />
          </Field>

          <div className="flex gap-3">
            <button
              onClick={() => setAdding(false)}
              className="flex-1 rounded-xl py-2.5 text-sm font-medium"
              style={{ background: tokens.surface2, color: tokens.text2 }}
            >
              Cancel
            </button>
            <button
              onClick={addService}
              disabled={!form.name}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-40"
              style={{ background: tokens.gold, color: '#000' }}
            >
              Add service
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full rounded-xl py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2"
          style={{
            background: tokens.surface1,
            border: `1px dashed ${tokens.border2}`,
            color: tokens.text2,
          }}
        >
          <span style={{ color: tokens.gold }}>+</span> Add service
        </button>
      )}

      <style jsx>{`
        .field {
          width: 100%;
          background: ${tokens.surface2};
          border: 1px solid ${tokens.border2};
          border-radius: 12px;
          padding: 10px 14px;
          color: white;
          font-size: 14px;
          outline: none;
        }
        .field::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-2" style={{ color: tokens.text2 }}>{label}</label>
      {children}
    </div>
  )
}
