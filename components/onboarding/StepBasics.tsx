import { tokens } from '@/lib/types'
import type { OnboardingData } from './OnboardingFlow'

const CATEGORIES = [
  'Personal Training', 'Fitness & Wellness', 'Sauna & Spa',
  'Yoga & Pilates', 'Massage', 'Health & Therapy',
  'Hair & Beauty', 'Nail Studio', 'Barbershop',
  'Tattoo & Piercing', 'Coaching', 'Other',
]

interface Props { data: OnboardingData; update: (p: Partial<OnboardingData>) => void }

export default function StepBasics({ data, update }: Props) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-1">Tell us about your business</h2>
      <p className="text-sm mb-8" style={{ color: tokens.text2 }}>
        This appears on your public booking page.
      </p>

      <div className="space-y-5">
        <Field label="Business name">
          <input
            type="text"
            value={data.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="e.g. Glow Studio"
            className="field"
          />
        </Field>

        <Field label="Category">
          <select
            value={data.category}
            onChange={(e) => update({ category: e.target.value })}
            className="field"
          >
            <option value="">Select a category…</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>

        <Field label="Short description">
          <textarea
            value={data.description}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="What makes you special?"
            rows={3}
            className="field resize-none"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="City">
            <input
              type="text"
              value={data.city}
              onChange={(e) => update({ city: e.target.value })}
              placeholder="Dublin"
              className="field"
            />
          </Field>
          <Field label="Address (optional)">
            <input
              type="text"
              value={data.address}
              onChange={(e) => update({ address: e.target.value })}
              placeholder="14 Grafton St"
              className="field"
            />
          </Field>
        </div>

        <Field label="Website (optional)">
          <input
            type="url"
            value={data.website ?? ''}
            onChange={(e) => update({ website: e.target.value })}
            placeholder="https://yourbusiness.com"
            className="field"
          />
        </Field>

        <Field label="Instagram (optional)">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm select-none" style={{ color: 'rgba(255,255,255,0.35)' }}>@</span>
            <input
              type="text"
              value={data.instagram_handle ?? ''}
              onChange={(e) => update({ instagram_handle: e.target.value.replace(/^@/, '') })}
              placeholder="yourbusiness"
              className="field"
              style={{ paddingLeft: '28px' }}
            />
          </div>
        </Field>
      </div>

      <style jsx>{`
        .field {
          width: 100%;
          background: ${tokens.surface2};
          border: 1px solid ${tokens.border2};
          border-radius: 12px;
          padding: 12px 16px;
          color: white;
          font-size: 14px;
          outline: none;
        }
        .field::placeholder { color: rgba(255,255,255,0.2); }
        .field option { background: #1a1a1a; }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-2" style={{ color: tokens.text2 }}>
        {label}
      </label>
      {children}
    </div>
  )
}
