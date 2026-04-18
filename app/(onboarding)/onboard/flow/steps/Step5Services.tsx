'use client';

import { useEffect } from 'react';
import { Plus, X, Clock } from 'lucide-react';
import { StepHeader, TextInput, NextButton } from './shared';
import type { OnboardingState } from '../OnboardingFlow';

interface StepProps {
  state: OnboardingState;
  update: (patch: Partial<OnboardingState>) => void;
  next: () => void;
}

/**
 * Category-specific starter service suggestions.
 * Keyed by the category id from Step 1.
 */
const SUGGESTIONS: Record<string, Array<{ name: string; duration_minutes: number; price_cents: number }>> = {
  'Personal Training': [
    { name: 'PT Session',                duration_minutes: 60, price_cents: 6000 },
    { name: 'Assessment + Plan',         duration_minutes: 75, price_cents: 0 },
    { name: '4-Week Block',              duration_minutes: 60, price_cents: 20000 },
  ],
  'Barbershop': [
    { name: 'Haircut',                   duration_minutes: 30, price_cents: 2000 },
    { name: 'Skin Fade',                 duration_minutes: 45, price_cents: 2500 },
    { name: 'Hot Towel Shave',           duration_minutes: 45, price_cents: 3000 },
  ],
  'Sauna / Spa': [
    { name: '60-min Sauna Session',      duration_minutes: 60, price_cents: 2500 },
    { name: 'Private Sauna (up to 6)',   duration_minutes: 90, price_cents: 8000 },
    { name: 'Cold Plunge Add-on',        duration_minutes: 15, price_cents: 1000 },
  ],
  'Salon': [
    { name: 'Cut & Style',               duration_minutes: 60, price_cents: 5000 },
    { name: 'Colour',                    duration_minutes: 120, price_cents: 9000 },
    { name: 'Blow-dry',                  duration_minutes: 45, price_cents: 3500 },
  ],
  'Health & Therapy': [
    { name: 'Initial Assessment',        duration_minutes: 60, price_cents: 7500 },
    { name: 'Follow-up Session',         duration_minutes: 45, price_cents: 6500 },
    { name: 'Sports Massage',            duration_minutes: 60, price_cents: 7000 },
  ],
  'Yoga / Pilates': [
    { name: 'Drop-in Class',             duration_minutes: 60, price_cents: 1800 },
    { name: '10-Class Pack',             duration_minutes: 60, price_cents: 15000 },
    { name: 'Private 1:1',               duration_minutes: 60, price_cents: 7500 },
  ],
  'Nails': [
    { name: 'BIAB Gel',                  duration_minutes: 75, price_cents: 5500 },
    { name: 'Manicure',                  duration_minutes: 45, price_cents: 3500 },
    { name: 'Pedicure',                  duration_minutes: 60, price_cents: 4500 },
  ],
  'Massage': [
    { name: 'Deep Tissue Massage',       duration_minutes: 60, price_cents: 7000 },
    { name: 'Swedish Massage',           duration_minutes: 60, price_cents: 6000 },
    { name: 'Hot Stone Massage',         duration_minutes: 75, price_cents: 8500 },
  ],
  'Driving Instructor': [
    { name: 'Single Lesson',             duration_minutes: 60, price_cents: 4000 },
    { name: '10-Lesson Pack',            duration_minutes: 60, price_cents: 35000 },
    { name: 'Pre-test Lesson',           duration_minutes: 90, price_cents: 6000 },
  ],
  'Other': [],
};

export function Step5Services({ state, update, next }: StepProps) {
  // Prefill services from category suggestions — only once
  useEffect(() => {
    if (state.services.length === 0 && state.category && SUGGESTIONS[state.category]) {
      update({ services: SUGGESTIONS[state.category].map((s) => ({ ...s })) });
    }
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

  const removeService = (idx: number) => {
    update({ services: state.services.filter((_, i) => i !== idx) });
  };

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
            ? "We've started you off with some common services for your category. Edit them, remove them, or add your own."
            : 'Add the services customers can book. You can edit the list any time.'
        }
      />

      <div className="flex flex-col gap-3">
        {state.services.map((svc, idx) => (
          <div
            key={idx}
            className="group flex items-center gap-3 p-3 rounded-2xl mat-card hover:mat-card-elevated transition-all"
          >
            <div className="flex-1 grid grid-cols-[1fr_100px_110px] gap-2">
              <TextInput
                value={svc.name}
                onChange={(v) => updateService(idx, { name: v })}
                placeholder="Service name"
              />
              <div className="flex items-center gap-2 h-[52px] rounded-2xl mat-card px-3">
                <Clock className="h-4 w-4 text-white/40 shrink-0" strokeWidth={2} />
                <input
                  type="number"
                  min={5}
                  step={15}
                  value={svc.duration_minutes}
                  onChange={(e) => updateService(idx, { duration_minutes: Number(e.target.value) || 0 })}
                  className="w-full bg-transparent outline-none text-[14px]"
                />
                <span className="text-[12px] text-white/40">min</span>
              </div>
              <div className="flex items-center gap-2 h-[52px] rounded-2xl mat-card px-3">
                <span className="text-[14px] text-white/40">€</span>
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={svc.price_cents / 100}
                  onChange={(e) =>
                    updateService(idx, { price_cents: Math.round(Number(e.target.value) * 100) || 0 })
                  }
                  className="w-full bg-transparent outline-none text-[14px]"
                />
              </div>
            </div>
            <button
              onClick={() => removeService(idx)}
              className="flex h-9 w-9 items-center justify-center rounded-full opacity-60 hover:opacity-100 hover:bg-red-500/10 transition-all"
              aria-label="Remove service"
            >
              <X className="h-4 w-4 text-white/60" strokeWidth={2} />
            </button>
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
