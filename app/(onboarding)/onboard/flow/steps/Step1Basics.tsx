'use client';

import { useEffect, useMemo } from 'react';
import { Dumbbell, Scissors, Flame, Sparkles, Stethoscope, HandHelping, Brush, Waves, Car, Building2, type LucideIcon } from 'lucide-react';
import { StepHeader, Field, TextInput, NextButton } from './shared';
import type { OnboardingState } from '../OnboardingFlow';

interface StepProps {
  state: OnboardingState;
  update: (patch: Partial<OnboardingState>) => void;
  next: () => void;
}

const CATEGORIES: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'Personal Training', label: 'Gym / Fitness', icon: Dumbbell },
  { id: 'Barbershop', label: 'Barber', icon: Scissors },
  { id: 'Sauna / Spa', label: 'Sauna / Spa', icon: Flame },
  { id: 'Salon', label: 'Salon', icon: Sparkles },
  { id: 'Health & Therapy', label: 'Physio / Therapy', icon: Stethoscope },
  { id: 'Yoga / Pilates', label: 'Yoga / Pilates', icon: HandHelping },
  { id: 'Nails', label: 'Nails', icon: Brush },
  { id: 'Massage', label: 'Massage', icon: Waves },
  { id: 'Driving Instructor', label: 'Driving', icon: Car },
  { id: 'Other', label: 'Other', icon: Building2 },
];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function Step1Basics({ state, update, next }: StepProps) {
  // Auto-generate slug from name
  useEffect(() => {
    if (state.name && !state.slug) {
      update({ slug: slugify(state.name) });
    }
  }, [state.name]);

  const canContinue = useMemo(
    () => !!(state.name.trim() && state.category && state.city.trim()),
    [state]
  );

  return (
    <div className="flex flex-col gap-8 max-w-[520px]">
      <StepHeader
        eyebrow="Step 1 of 9 · Basics"
        title={
          <>
            Let's start with <br />
            the basics.
          </>
        }
        subtitle="Tell us about your business. You can change any of this later."
      />

      <div className="flex flex-col gap-5">
        <Field label="Business name">
          <TextInput
            autoFocus
            value={state.name}
            onChange={(v) => update({ name: v })}
            placeholder="e.g. Evolv Performance"
          />
        </Field>

        <Field label="Category">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CATEGORIES.map(({ id, label, icon: Icon }) => {
              const active = state.category === id;
              return (
                <button
                  key={id}
                  onClick={() => update({ category: id })}
                  className="flex items-center gap-2.5 p-3 rounded-xl transition-all active:scale-[0.97]"
                  style={{
                    background: active
                      ? 'linear-gradient(135deg, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.04) 100%)'
                      : 'var(--mat-surface-1)',
                    borderWidth: '0.5px',
                    borderStyle: 'solid',
                    borderColor: active ? 'rgba(212,175,55,0.55)' : 'var(--sep)',
                    boxShadow: active ? '0 0 0 1px rgba(212,175,55,0.25)' : 'none',
                  }}
                >
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
                    style={{
                      background: active
                        ? 'linear-gradient(145deg, #F6D77C 0%, #D4AF37 100%)'
                        : 'rgba(255,255,255,0.05)',
                    }}
                  >
                    <Icon
                      className="h-4 w-4"
                      style={{ color: active ? 'rgba(0,0,0,0.78)' : 'var(--label-2)' }}
                      strokeWidth={2}
                    />
                  </div>
                  <span
                    className="text-[13px] font-medium text-left"
                    style={{ color: active ? 'var(--label-1)' : 'var(--label-2)' }}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="City" hint="Where your business is based.">
          <TextInput
            value={state.city}
            onChange={(v) => update({ city: v })}
            placeholder="Cork"
          />
        </Field>

        <Field
          label="Your URL"
          hint={`openbook.ie/${state.slug || 'your-slug'}`}
        >
          <TextInput
            value={state.slug}
            onChange={(v) => update({ slug: slugify(v) })}
            placeholder="evolv-performance"
          />
        </Field>
      </div>

      <div className="mt-2">
        <NextButton onClick={next} disabled={!canContinue} />
      </div>
    </div>
  );
}
