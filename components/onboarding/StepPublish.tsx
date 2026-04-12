import { tokens } from '@/lib/types'
import { slugify, formatPrice, getDurationLabel } from '@/lib/utils'
import type { OnboardingData } from './OnboardingFlow'

interface Props {
  data: OnboardingData
  update: (p: Partial<OnboardingData>) => void
  onPublish: () => void
  saving: boolean
}

export default function StepPublish({ data, onPublish, saving }: Props) {
  const slug = slugify(data.name)

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-1">Ready to go live?</h2>
      <p className="text-sm mb-8" style={{ color: tokens.text2 }}>
        Review your setup, then publish your booking page.
      </p>

      <div className="space-y-4">
        {/* Summary card */}
        <div
          className="rounded-2xl p-5 space-y-3"
          style={{ background: tokens.surface1, border: `1px solid ${tokens.border}` }}
        >
          <Row label="Business" value={data.name} />
          <Row label="Category" value={data.category} />
          <Row label="City" value={data.city || '—'} />
          <Row label="Services" value={`${data.services.length} service${data.services.length !== 1 ? 's' : ''}`} />
          <Row label="Packages" value={`${data.packages.length} package${data.packages.length !== 1 ? 's' : ''}`} />
          <Row
            label="Booking URL"
            value={
              <span style={{ color: tokens.gold }}>
                openbook.ai/{slug}
              </span>
            }
          />
        </div>

        {/* Services preview */}
        {data.services.length > 0 && (
          <div
            className="rounded-2xl p-5"
            style={{ background: tokens.surface1, border: `1px solid ${tokens.border}` }}
          >
            <div className="text-xs font-medium mb-3" style={{ color: tokens.text2 }}>Services</div>
            <div className="space-y-2">
              {data.services.map((s, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-white">{s.name}</span>
                  <span style={{ color: tokens.text2 }}>
                    {getDurationLabel(s.duration_minutes)} · {formatPrice(s.price_cents)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onPublish}
          disabled={saving || !data.name || !data.category}
          className="w-full rounded-xl py-3.5 text-sm font-semibold transition-opacity disabled:opacity-40"
          style={{ background: tokens.gold, color: '#000' }}
        >
          {saving ? 'Publishing…' : 'Publish booking page'}
        </button>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs" style={{ color: tokens.text2 }}>{label}</span>
      <span className="text-sm text-white font-medium">{value}</span>
    </div>
  )
}
