'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Step1Basics } from './steps/Step1Basics';
import { Step2Colours } from './steps/Step2Colours';
import { Step3Logo } from './steps/Step3Logo';
import { Step4Story } from './steps/Step4Story';
import { Step5Services } from './steps/Step5Services';
import { Step6Hours } from './steps/Step6Hours';
import { Step7Payments } from './steps/Step7Payments';
import { Step8Launch } from './steps/Step8Launch';
import { LivePreview } from './LivePreview';

export interface OnboardingState {
  businessId?: string;
  name: string;
  slug: string;
  category: string;
  city: string;
  address_line: string;
  primary_colour: string;
  secondary_colour: string;
  logo_url: string | null;
  processed_icon_url: string | null;
  tagline: string;
  about_long: string;
  founder_name: string;
  phone: string;
  website: string;
  socials: {
    instagram?: string;
    tiktok?: string;
    facebook?: string;
  };
  services: Array<{
    name: string;
    description?: string;
    duration_minutes: number;
    price_cents: number;
  }>;
  hours: Array<{
    day_of_week: number;
    open_time: string;
    close_time: string;
    is_closed: boolean;
  }>;
  stripe_connected: boolean;
}

const emptyState: OnboardingState = {
  name: '',
  slug: '',
  category: '',
  city: '',
  address_line: '',
  primary_colour: '#D4AF37',
  secondary_colour: '',
  logo_url: null,
  processed_icon_url: null,
  tagline: '',
  about_long: '',
  founder_name: '',
  phone: '',
  website: '',
  socials: {},
  services: [],
  hours: [
    { day_of_week: 1, open_time: '09:00', close_time: '18:00', is_closed: false },
    { day_of_week: 2, open_time: '09:00', close_time: '18:00', is_closed: false },
    { day_of_week: 3, open_time: '09:00', close_time: '18:00', is_closed: false },
    { day_of_week: 4, open_time: '09:00', close_time: '18:00', is_closed: false },
    { day_of_week: 5, open_time: '09:00', close_time: '18:00', is_closed: false },
    { day_of_week: 6, open_time: '10:00', close_time: '16:00', is_closed: false },
    { day_of_week: 0, open_time: '10:00', close_time: '16:00', is_closed: true },
  ],
  stripe_connected: false,
};

const TOTAL_STEPS = 8;

interface Props {
  owner: any;
  initialBusiness: any;
  startAt?: number;
}

export function OnboardingFlow({ owner, initialBusiness, startAt = 0 }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(startAt);
  const [state, setState] = useState<OnboardingState>(() => {
    if (!initialBusiness) return { ...emptyState, founder_name: owner.full_name ?? '' };
    return {
      ...emptyState,
      businessId: initialBusiness.id,
      name: initialBusiness.name ?? '',
      slug: initialBusiness.slug ?? '',
      category: initialBusiness.category ?? '',
      city: initialBusiness.city ?? '',
      address_line: initialBusiness.address_line ?? '',
      primary_colour: initialBusiness.primary_colour ?? '#D4AF37',
      secondary_colour: initialBusiness.secondary_colour ?? '',
      logo_url: initialBusiness.logo_url,
      processed_icon_url: initialBusiness.processed_icon_url,
      tagline: initialBusiness.tagline ?? '',
      about_long: initialBusiness.about_long ?? '',
      founder_name: initialBusiness.founder_name ?? owner.full_name ?? '',
      phone: initialBusiness.phone ?? '',
      website: initialBusiness.website ?? '',
      socials: initialBusiness.socials ?? {},
      services: [],
      hours: emptyState.hours,
      stripe_connected: initialBusiness.stripe_onboarding_completed ?? false,
    };
  });

  const update = (patch: Partial<OnboardingState>) =>
    setState((prev) => ({ ...prev, ...patch }));

  const next = async () => {
    if (step < TOTAL_STEPS - 1) {
      await saveProgress(step + 1);
      setStep(step + 1);
    }
  };
  const back = () => setStep(Math.max(0, step - 1));

  async function saveProgress(newStep: number) {
    await fetch('/api/onboarding/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state, step: newStep }),
    });
  }

  const StepComponent = [
    Step1Basics,
    Step2Colours,
    Step3Logo,
    Step4Story,
    Step5Services,
    Step6Hours,
    Step7Payments,
    Step8Launch,
  ][step];

  const showPreview = step >= 1 && step <= 6;

  return (
    <main className="relative min-h-[100dvh] text-white overflow-hidden">
      {/* Background */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(900px 600px at 20% 0%, rgba(212,175,55,0.08), transparent 55%), linear-gradient(180deg, #050505 0%, #000 100%)',
        }}
      />
      <div
        aria-hidden
        className="fixed inset-0 -z-10 opacity-[0.035] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' seed='7'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
        }}
      />

      {/* Progress bar */}
      <div className="pt-safe">
        <div className="px-6 pt-4 pb-3 flex items-center gap-4">
          <button
            onClick={back}
            disabled={step === 0}
            className="h-9 w-9 rounded-full mat-glass-thin flex items-center justify-center disabled:opacity-30 active:scale-90 transition-transform"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.2} />
          </button>
          <div className="flex-1 h-[3px] rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${((step + 1) / TOTAL_STEPS) * 100}%`,
                background: 'linear-gradient(90deg, #F6D77C 0%, #D4AF37 100%)',
                transitionTimingFunction: 'var(--ease-apple)',
              }}
            />
          </div>
          <span
            className="text-[12px] font-medium tabular-nums"
            style={{ color: 'var(--label-2)' }}
          >
            {step + 1} / {TOTAL_STEPS}
          </span>
        </div>
      </div>

      {/* Content — two-column on desktop, stacked on mobile */}
      <div className="mx-auto max-w-6xl px-5 pb-12">
        <div className={`grid gap-8 ${showPreview ? 'lg:grid-cols-[1fr_380px]' : 'lg:grid-cols-1 lg:max-w-xl lg:mx-auto'}`}>
          <div className="min-h-[60vh]">
            <StepComponent
              state={state}
              update={update}
              next={next}
            />
          </div>
          {showPreview && (
            <div className="hidden lg:block">
              <div className="sticky top-8">
                <LivePreview state={state} />
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
