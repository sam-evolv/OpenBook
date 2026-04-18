'use client';

import { useEffect } from 'react';
import { Plus, X, Minus } from 'lucide-react';
import { StepHeader, TextInput, NextButton } from './shared';
import type { OnboardingState } from '../OnboardingFlow';

interface StepProps {
  state: OnboardingState;
  update: (patch: Partial<OnboardingState>) => void;
  next: () => void;
}

const SUGGESTIONS: Record<string, Array<{ name: string; duration_minutes: number; price_cents: number }>> = {
  'Personal Training': [
    { name: 'PT Session',        duration_minutes: 60, price_cents: 6000 },
    { name: 'Assessment + Plan', duration_minutes: 75, price_cents: 0 },
    { name: '4-Week Block',      duration_minutes: 60, price_cents: 20000 },
  ],
  'Barbershop': [
    { name: 'Haircut',           duration_minutes: 30, price_cents: 2000 },
    { name: 'Skin Fade',         duration_minutes: 45, price_cents: 2500 },
    { name: 'Hot Towel Shave',   duration_minutes: 45, price_cents: 3000 },
  ],
  'Sauna / Spa': [
    { name: '60-min Sauna Session',    duration_minutes: 60, price_cents: 2500 },
    { name: 'Private Sauna (up to 6)', duration_minutes: 90, price_cents: 8000 },
    { name: 'Cold Plunge Add-on',      duration_minutes: 15, price_cents: 1000 },
  ],
  'Salon': [
    { name: 'Cut & Style', duration_minutes: 60,  price_cents: 5000 },
    { name: 'Colour',      duration_minutes: 120, price_cents: 9000 },
    { name: 'Blow-dry',    duration_minutes: 45,  price_cents: 3500 },
  ],
  'Health & Therapy': [
    { name: 'Initial Assessment', duration_minutes: 60, price_cents: 7500 },
    { name: 'Follow-up Session',  duration_minutes: 45, price_cents: 6500 },
    { name: 'Sports Massage',     duration_minutes: 60, price_cents: 7000 },
  ],
  'Yoga / Pilates': [
    { name: 'Drop-in Class',  duration_minutes: 60, price_cents: 1800 },
    { name: '10-Class Pack',  duration_minutes: 60, price_cents: 15000 },
    { name: 'Private 1:1',    duration_minutes: 60, price_cents: 7500 },
  ],
  'Nails': [
    { name: 'BIAB Gel',   duration_minutes: 75, price_cents: 5500 },
    { name: 'Manicure',   duration_minutes: 45, price_cents: 3500 },
    { name: 'Pedicure',   duration_minutes: 60, price_cents: 4500 },
  ],
  'Massage': [
    { name: 'Deep Tissue Massage', duration_minutes: 60, price_cents: 7000 },
    { name: 'Swedish Massage',     duration_minutes: 60, price_cents: 6000 },
    { name: 'Hot Stone Massage',   duration_minutes: 75, price_cents: 8500 },
  ],
  'Driving Instructor': [
    { name: 'Single Lesson',    duration_minutes: 60, price_cents: 4000 },
    { name: '10-Lesson Pack',   duration_minutes: 60, price_cents: 35000 },
    { name: 'Pre-test Lesson',  duration_minutes: 90, price_cents: 6000 },
  ],
  'Other': [],
};

/** Duration snap points — matches how businesses actually think about sessions. */
const DURATION_OPTIONS = [15, 30, 45, 60, 75, 90, 120, 150, 180];

export function Step5Services({ state, update, next }: StepProps) {
  useEffect(() => {
    if (state.services.length === 0 && state.category && SUGGESTIONS[state.category]) {
      update({ services: SUGGESTIONS[state.category].map((s) => ({ ...s })) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.category]);

  const addService = () =>
    update({
      services: [
        ...state.services,
        { name: '', duration_minutes: 60, price_cents: 0 },
      ],
    });

  const updateService = (idx: number, patch: Partial<OnboardingState['services'][0]>) => {
    const services = state.services.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    update({ services });
  };

  const removeService = (idx: number) =>
    update({ services: state.services.filter((_, i) => i !== idx) });

  function adjustDuration(current: number, delta: number): number {
    const idx = DURATION_OPTIONS.findIndex((d) => d >= current);
    if (idx === -1) return Math.max(15, current + delta * 15);
    const nextIdx = Math.max(0, Math.min(DURATION_OPTIONS.length - 1, idx + delta));
    return DURATION_OPTIONS[nextIdx];
  }

  function adjustPrice(currentCents: number, deltaEuros: number): number {
    const euros = currentCents / 100;
    const next = Math.max(0, euros + deltaEuros);
    return Math.round(next * 100);
  }

  const canContinue = state.services.some((s) => s.name.trim() && s.duration_minutes > 0);

  return (
    <div className="flex flex-col gap-8 max-w-[640px]">
      <StepHeader
        eyebrow="Step 5 of 8 · Services"
        title={
          <>
            What do you <br />
            offer?
          </>
        }
        subtitle={
          state.category && SUGGESTIONS[state.category]?.length
            ? "We've started you off with common services for your category. Edit, remove, or add your own."
            : 'Add the services customers can book. You can edit this any time.'
        }
      />

      <div className="flex flex-col gap-3">
        {state.services.map((svc, idx) => (
          <div
            key={idx}
            className="group flex flex-col gap-3 p-4 rounded-2xl mat-card hover:mat-card-elevated transition-all"
          >
            {/* Name row */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <TextInput
                  value={svc.name}
                  onChange={(v) => updateService(idx, { name: v })}
                  placeholder="Service name"
                />
              </div>
              <button
                onClick={() => removeService(idx)}
                className="flex h-11 w-11 items-center justify-center rounded-full opacity-60 hover:opacity-100 hover:bg-red-500/10 transition-all shrink-0"
                aria-label="Remove service"
              >
                <X className="h-4 w-4 text-white/70" strokeWidth={2} />
              </button>
            </div>

            {/* Duration + Price steppers */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Duration stepper */}
              <div className="flex items-center gap-1 h-[52px] rounded-2xl mat-card overflow-hidden">
                <button
                  onClick={() =>
                    updateService(idx, { duration_minutes: adjustDuration(svc.duration_minutes, -1) })
                  }
                  className="h-full w-11 flex items-center justify-center hover:bg-white/5 active:bg-white/10 transition-colors"
                  aria-label="Decrease duration"
                >
                  <Minus className="h-4 w-4 text-white/70" strokeWidth={2.2} />
                </button>
                <div className="flex-1 text-center">
                  <div className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--label-3)' }}>
                    Duration
                  </div>
                  <div className="text-[15px] font-semibold tabular-nums">
                    {formatDurationDisplay(svc.duration_minutes)}
                  </div>
                </div>
                <button
                  onClick={() =>
                    updateService(idx, { duration_minutes: adjustDuration(svc.duration_minutes, 1) })
                  }
                  className="h-full w-11 flex items-center justify-center hover:bg-white/5 active:bg-white/10 transition-colors"
                  aria-label="Increase duration"
                >
                  <Plus className="h-4 w-4 text-white/70" strokeWidth={2.2} />
                </button>
              </div>

              {/* Price stepper */}
              <div className="flex items-center gap-1 h-[52px] rounded-2xl mat-card overflow-hidden">
                <button
                  onClick={() => updateService(idx, { price_cents: adjustPrice(svc.price_cents, -5) })}
                  className="h-full w-11 flex items-center justify-center hover:bg-white/5 active:bg-white/10 transition-colors"
                  aria-label="Decrease price"
                >
                  <Minus className="h-4 w-4 text-white/70" strokeWidth={2.2} />
                </button>
                <div className="flex-1 text-center">
                  <div className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--label-3)' }}>
                    Price
                  </div>
                  <div className="text-[15px] font-semibold tabular-nums" style={{ color: 'var(--brand-gold)' }}>
                    €{(svc.price_cents / 100).toFixed(0)}
                  </div>
                </div>
                <button
                  onClick={() => updateService(idx, { price_cents: adjustPrice(svc.price_cents, 5) })}
                  className="h-full w-11 flex items-center justify-center hover:bg-white/5 active:bg-white/10 transition-colors"
                  aria-label="Increase price"
                >
                  <Plus className="h-4 w-4 text-white/70" strokeWidth={2.2} />
                </button>
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={addService}
          className="flex items-center justify-center gap-2 rounded-2xl py-4 mat-card hover:mat-card-elevated transition-all"
        >
          <Plus className="h-4 w-4" strokeWidth={2.2} />
          <span className="text-[14px] font-medium">Add another service</span>
        </button>
      </div>

      <div className="mt-2">
        <NextButton onClick={next} disabled={!canContinue} />
      </div>
    </div>
  );
}

function formatDurationDisplay(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
