'use client'

import { useState } from 'react'
import { tokens } from '@/lib/types'
import { formatPrice } from '@/lib/utils'
import type { OnboardingData } from './OnboardingFlow'

type Service = OnboardingData['services'][number]

const BLANK: Service = {
  name: '',
  duration_minutes: 60,
  price_cents: 5000,
  capacity: 1,
  colour: '#D4AF37',
}

interface Props { data: OnboardingData; update: (p: Partial<OnboardingData>) => void }

export default function StepServices({ data, update }: Props) {
  const [form, setForm] = useState<Service>(BLANK)
  const [adding, setAdding] = useState(false)

  function addService() {
    if (!form.name) return
    update({ services: [...data.services, form] })
    setForm(BLANK)
    setAdding(false)
  }

  function removeService(i: number) {
    update({ services: data.services.filter((_, idx) => idx !== i) })
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-1">Add your services</h2>
      <p className="text-sm mb-8" style={{ color: tokens.text2 }}>
        You can add more later from the dashboard.
      </p>

      <div className="space-y-3 mb-4">
        {data.services.map((s, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{ background: tokens.surface1, border: `1px solid ${tokens.border}` }}
          >
            <div>
              <div className="text-sm font-medium text-white">{s.name}</div>
              <div className="text-xs mt-0.5" style={{ color: tokens.text2 }}>
                {s.duration_minutes}min · {formatPrice(s.price_cents)}
                {s.capacity > 1 ? ` · ${s.capacity} spots` : ''}
              </div>
            </div>
            <button
              onClick={() => removeService(i)}
              className="text-xs px-2 py-1 rounded-lg transition-colors hover:bg-red-500/10"
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
            <Field label="Price (€)">
              <input
                type="number"
                value={form.price_cents / 100}
                onChange={(e) => setForm({ ...form, price_cents: Math.round(Number(e.target.value) * 100) })}
                className="field"
                min={0}
                step={0.5}
              />
            </Field>
          </div>

          <Field label="Group capacity (1 = 1-on-1)">
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
