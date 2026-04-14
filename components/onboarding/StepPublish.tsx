import { slugify, formatPrice, getDurationLabel } from '@/lib/utils'
import { Rocket } from 'lucide-react'
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
      <h2 className="text-[22px] font-bold text-white mb-1">Ready to go live?</h2>
      <p className="text-[14px] text-white/40 mb-8">
        Review your setup, then publish your booking page.
      </p>

      <div className="space-y-4">
        {/* Summary card */}
        <div
          className="rounded-2xl p-5 space-y-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <Row label="Business" value={data.name} />
          <Row label="Category" value={data.category} />
          <Row label="City" value={data.city || '—'} />
          <Row label="Services" value={`${data.services.length} service${data.services.length !== 1 ? 's' : ''}`} />
          <Row label="Packages" value={`${data.packages.length} package${data.packages.length !== 1 ? 's' : ''}`} />
          <Row
            label="Booking URL"
            value={
              <span className="text-[#D4AF37]">
                openbook.ai/{slug}
              </span>
            }
          />
        </div>

        {/* Services preview */}
        {data.services.length > 0 && (
          <div
            className="rounded-2xl p-5"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="section-label mb-3">Services</div>
            <div className="space-y-2">
              {data.services.map((s, i) => (
                <div key={i} className="flex justify-between text-[13px]">
                  <span className="text-white">{s.name}</span>
                  <span className="text-white/40">
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
          className="w-full h-[52px] rounded-xl text-[14px] font-bold transition-all disabled:opacity-40 btn-press flex items-center justify-center gap-2"
          style={{
            background: '#D4AF37',
            color: '#000',
            boxShadow: '0 4px 20px rgba(212,175,55,0.4)',
          }}
        >
          <Rocket size={16} />
          {saving ? 'Publishing…' : 'Publish booking page'}
        </button>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-between py-2"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
    >
      <span className="text-[13px] text-white/40">{label}</span>
      <span className="text-[13px] text-white font-medium">{value}</span>
    </div>
  )
}
