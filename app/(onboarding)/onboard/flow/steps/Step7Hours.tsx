'use client';

import { StepHeader, NextButton } from './shared';
import type { OnboardingState } from '../OnboardingFlow';

interface StepProps {
  state: OnboardingState;
  update: (patch: Partial<OnboardingState>) => void;
  next: () => void;
}

const DAYS = [
  { id: 1, label: 'Monday',    short: 'Mon' },
  { id: 2, label: 'Tuesday',   short: 'Tue' },
  { id: 3, label: 'Wednesday', short: 'Wed' },
  { id: 4, label: 'Thursday',  short: 'Thu' },
  { id: 5, label: 'Friday',    short: 'Fri' },
  { id: 6, label: 'Saturday',  short: 'Sat' },
  { id: 0, label: 'Sunday',    short: 'Sun' },
];

export function Step7Hours({ state, update, next }: StepProps) {
  const setHour = (day_of_week: number, patch: Partial<OnboardingState['hours'][0]>) => {
    const hours = state.hours.map((h) => (h.day_of_week === day_of_week ? { ...h, ...patch } : h));
    update({ hours });
  };

  return (
    <div className="flex flex-col gap-8 max-w-[520px]">
      <StepHeader
        eyebrow="Step 7 of 9 · Opening hours"
        title={
          <>
            When are you <br />
            open?
          </>
        }
        subtitle="Customers can only book during these times. You can edit this any time from the dashboard."
      />

      <div className="flex flex-col gap-1.5">
        {DAYS.map((d) => {
          const h = state.hours.find((x) => x.day_of_week === d.id)!;
          return (
            <div
              key={d.id}
              className="flex items-center gap-3 py-3 px-4 rounded-2xl mat-card"
            >
              <div className="w-24">
                <p className="text-[14px] font-semibold">{d.label}</p>
              </div>

              {h.is_closed ? (
                <p className="flex-1 text-[13px]" style={{ color: 'var(--label-3)' }}>
                  Closed
                </p>
              ) : (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="time"
                    value={h.open_time}
                    onChange={(e) => setHour(d.id, { open_time: e.target.value })}
                    className="h-10 rounded-xl px-3 text-[13px] tabular-nums bg-white/[0.03] outline-none border border-white/[0.06] focus:border-white/20"
                    style={{ colorScheme: 'dark' }}
                  />
                  <span className="text-[12px]" style={{ color: 'var(--label-3)' }}>
                    to
                  </span>
                  <input
                    type="time"
                    value={h.close_time}
                    onChange={(e) => setHour(d.id, { close_time: e.target.value })}
                    className="h-10 rounded-xl px-3 text-[13px] tabular-nums bg-white/[0.03] outline-none border border-white/[0.06] focus:border-white/20"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              )}

              {/* Toggle */}
              <button
                onClick={() => setHour(d.id, { is_closed: !h.is_closed })}
                className="relative h-7 w-[50px] rounded-full transition-colors shrink-0"
                style={{
                  backgroundColor: h.is_closed ? 'rgba(255,255,255,0.08)' : '#D4AF37',
                }}
                aria-label={h.is_closed ? 'Mark as open' : 'Mark as closed'}
              >
                <div
                  className="absolute top-[3px] h-5 w-5 rounded-full bg-white transition-transform"
                  style={{
                    left: h.is_closed ? '3px' : '26px',
                    transitionTimingFunction: 'var(--ease-apple)',
                    transitionDuration: '250ms',
                  }}
                />
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-2">
        <NextButton onClick={next} />
      </div>
    </div>
  );
}
