import { tokens } from '@/lib/types'
import type { OnboardingData } from './OnboardingFlow'

const PRESET_COLOURS = [
  '#D4AF37', '#E8C547', '#C9A227',
  '#3B82F6', '#8B5CF6', '#EC4899',
  '#10B981', '#F97316', '#EF4444',
  '#FFFFFF',
]

interface Props { data: OnboardingData; update: (p: Partial<OnboardingData>) => void }

export default function StepBrand({ data, update }: Props) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-1">Brand your booking page</h2>
      <p className="text-sm mb-8" style={{ color: tokens.text2 }}>
        Pick an accent colour — your customers will see this when they book.
      </p>

      <div className="space-y-6">
        <div>
          <label className="block text-xs font-medium mb-3" style={{ color: tokens.text2 }}>
            Accent colour
          </label>
          <div className="flex gap-3 flex-wrap">
            {PRESET_COLOURS.map((colour) => (
              <button
                key={colour}
                onClick={() => update({ primaryColour: colour })}
                className="w-9 h-9 rounded-xl transition-transform hover:scale-110"
                style={{
                  background: colour,
                  outline: data.primaryColour === colour ? `2px solid white` : 'none',
                  outlineOffset: 2,
                }}
              />
            ))}
            <input
              type="color"
              value={data.primaryColour}
              onChange={(e) => update({ primaryColour: e.target.value })}
              className="w-9 h-9 rounded-xl cursor-pointer"
              title="Custom colour"
              style={{ background: 'transparent', border: `1px solid ${tokens.border2}` }}
            />
          </div>
        </div>

        {/* Live preview */}
        <div>
          <label className="block text-xs font-medium mb-3" style={{ color: tokens.text2 }}>
            Preview
          </label>
          <div
            className="rounded-2xl p-5"
            style={{ background: tokens.surface1, border: `1px solid ${tokens.border}` }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-black text-lg"
                style={{ background: data.primaryColour }}
              >
                {(data.name || 'B')[0]}
              </div>
              <div>
                <div className="font-semibold text-white text-sm">{data.name || 'Your Business'}</div>
                <div className="text-xs" style={{ color: tokens.text2 }}>{data.city || 'Dublin'}</div>
              </div>
            </div>
            <button
              className="w-full rounded-xl py-2.5 text-sm font-semibold text-black"
              style={{ background: data.primaryColour }}
            >
              Book now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
