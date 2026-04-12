import { tokens } from '@/lib/types'
import type { OnboardingData } from './OnboardingFlow'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface Props { data: OnboardingData; update: (p: Partial<OnboardingData>) => void }

export default function StepHours({ data, update }: Props) {
  function updateDay(dayIndex: number, partial: Partial<OnboardingData['hours'][number]>) {
    const hours = data.hours.map((h) =>
      h.day_of_week === dayIndex ? { ...h, ...partial } : h
    )
    update({ hours })
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-1">Set your opening hours</h2>
      <p className="text-sm mb-8" style={{ color: tokens.text2 }}>
        Availability is calculated from these hours.
      </p>

      <div className="space-y-2">
        {DAYS.map((day, i) => {
          const h = data.hours.find((x) => x.day_of_week === i)!
          return (
            <div
              key={day}
              className="flex items-center gap-4 rounded-xl px-4 py-3"
              style={{
                background: tokens.surface1,
                border: `1px solid ${h.is_open ? tokens.border2 : tokens.border}`,
              }}
            >
              {/* Toggle */}
              <button
                onClick={() => updateDay(i, { is_open: !h.is_open })}
                className="w-10 h-5 rounded-full transition-colors relative shrink-0"
                style={{ background: h.is_open ? tokens.gold : tokens.surface2 }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                  style={{ left: h.is_open ? '22px' : '2px' }}
                />
              </button>

              <span
                className="w-8 text-sm font-medium shrink-0"
                style={{ color: h.is_open ? tokens.text1 : tokens.text3 }}
              >
                {day}
              </span>

              {h.is_open ? (
                <div className="flex items-center gap-2 ml-auto">
                  <input
                    type="time"
                    value={h.open_time}
                    onChange={(e) => updateDay(i, { open_time: e.target.value })}
                    className="rounded-lg px-3 py-1.5 text-sm text-white outline-none"
                    style={{ background: tokens.surface2, border: `1px solid ${tokens.border2}` }}
                  />
                  <span className="text-xs" style={{ color: tokens.text3 }}>to</span>
                  <input
                    type="time"
                    value={h.close_time}
                    onChange={(e) => updateDay(i, { close_time: e.target.value })}
                    className="rounded-lg px-3 py-1.5 text-sm text-white outline-none"
                    style={{ background: tokens.surface2, border: `1px solid ${tokens.border2}` }}
                  />
                </div>
              ) : (
                <span className="ml-auto text-xs" style={{ color: tokens.text3 }}>Closed</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
