import type { OnboardingData } from './OnboardingFlow'

const CATEGORIES = [
  'Hair & Beauty', 'Fitness & Wellness', 'Health & Therapy',
  'Yoga & Pilates', 'Personal Training', 'Massage', 'Nail Studio',
  'Barbershop', 'Tattoo & Piercing', 'Coaching', 'Other',
]

interface Props { data: OnboardingData; update: (p: Partial<OnboardingData>) => void }

export default function StepBasics({ data, update }: Props) {
  return (
    <div>
      <h2 className="text-[22px] font-bold text-white mb-1">Tell us about your business</h2>
      <p className="text-[14px] text-white/40 mb-8">
        This appears on your public booking page.
      </p>

      <div className="space-y-5">
        <Field label="Business name">
          <input
            type="text"
            value={data.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="e.g. Glow Studio"
            className="onb-field"
          />
        </Field>

        <Field label="Category">
          <select
            value={data.category}
            onChange={(e) => update({ category: e.target.value })}
            className="onb-field"
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
            className="onb-field resize-none !h-auto !py-3"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="City">
            <input
              type="text"
              value={data.city}
              onChange={(e) => update({ city: e.target.value })}
              placeholder="Dublin"
              className="onb-field"
            />
          </Field>
          <Field label="Address (optional)">
            <input
              type="text"
              value={data.address}
              onChange={(e) => update({ address: e.target.value })}
              placeholder="14 Grafton St"
              className="onb-field"
            />
          </Field>
        </div>
      </div>

      <style jsx>{`
        .onb-field {
          width: 100%;
          height: 44px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 0 16px;
          color: white;
          font-size: 14px;
          outline: none;
          transition: border-color 150ms ease, box-shadow 150ms ease;
          appearance: none;
        }
        .onb-field:focus {
          border-color: rgba(212,175,55,0.4);
          box-shadow: 0 0 0 3px rgba(212,175,55,0.15);
        }
        .onb-field::placeholder { color: rgba(255,255,255,0.25); }
        .onb-field option { background: #1a1a1a; }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block section-label mb-2">{label}</label>
      {children}
    </div>
  )
}
