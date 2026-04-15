'use client'

import { useState } from 'react'
import { tokens } from '@/lib/types'
import { formatPrice } from '@/lib/utils'
import type { OnboardingData } from './OnboardingFlow'

type Pkg = OnboardingData['packages'][number]

const BLANK: Pkg = {
  name: '',
  tagline: '',
  price_cents: 10000,
  session_count: 10,
  sessions_per_month: null,
  expires_days: 365,
}

interface Props { data: OnboardingData; update: (p: Partial<OnboardingData>) => void }

export default function StepPackages({ data, update }: Props) {
  const [form, setForm] = useState<Pkg>(BLANK)
  const [adding, setAdding] = useState(false)

  function addPackage() {
    if (!form.name) return
    update({ packages: [...data.packages, form] })
    setForm(BLANK)
    setAdding(false)
  }

  function remove(i: number) {
    update({ packages: data.packages.filter((_, idx) => idx !== i) })
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-1">Create packages</h2>
      <p className="text-sm mb-8" style={{ color: tokens.text2 }}>
        Optional — skip if you only take pay-per-session bookings.
      </p>

      <div className="space-y-3 mb-4">
        {data.packages.map((p, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{ background: tokens.surface1, border: `1px solid ${tokens.border}` }}
          >
            <div>
              <div className="text-sm font-medium text-white">{p.name}</div>
              <div className="text-xs mt-0.5" style={{ color: tokens.text2 }}>
                {formatPrice(p.price_cents)}
                {p.session_count ? ` · ${p.session_count} sessions` : ' · Unlimited'}
              </div>
            </div>
            <button
              onClick={() => remove(i)}
              className="text-xs px-2 py-1 rounded-lg"
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
          <Field label="Package name">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. 10-class bundle"
              className="field"
            />
          </Field>
          <Field label="Tagline (optional)">
            <input
              type="text"
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              placeholder="Save 20% vs. single sessions"
              className="field"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Price (€)">
              <input
                type="number"
                value={form.price_cents / 100}
                onChange={(e) => setForm({ ...form, price_cents: Math.round(Number(e.target.value) * 100) })}
                className="field"
                min={0}
              />
            </Field>
            <Field label="Sessions (blank = unlimited)">
              <input
                type="number"
                value={form.session_count ?? ''}
                onChange={(e) =>
                  setForm({ ...form, session_count: e.target.value ? Number(e.target.value) : null })
                }
                className="field"
                min={1}
              />
            </Field>
          </div>
          <Field label="Expires after (days, blank = never)">
            <input
              type="number"
              value={form.expires_days ?? ''}
              onChange={(e) =>
                setForm({ ...form, expires_days: e.target.value ? Number(e.target.value) : null })
              }
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
              onClick={addPackage}
              disabled={!form.name}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-40"
              style={{ background: tokens.gold, color: '#000' }}
            >
              Add package
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full rounded-xl py-3 text-sm font-medium flex items-center justify-center gap-2"
          style={{
            background: tokens.surface1,
            border: `1px dashed ${tokens.border2}`,
            color: tokens.text2,
          }}
        >
          <span style={{ color: tokens.gold }}>+</span> Add package
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
