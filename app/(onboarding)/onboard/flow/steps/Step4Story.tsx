'use client';

import { Instagram, Music, Facebook } from 'lucide-react';
import { StepHeader, Field, TextInput, TextArea, NextButton, SkipLink } from './shared';
import type { OnboardingState } from '../OnboardingFlow';

interface StepProps {
  state: OnboardingState;
  update: (patch: Partial<OnboardingState>) => void;
  next: () => void;
}

export function Step4Story({ state, update, next }: StepProps) {
  const updateSocial = (key: string, val: string) =>
    update({ socials: { ...state.socials, [key]: val || undefined } });

  return (
    <div className="flex flex-col gap-8 max-w-[520px]">
      <StepHeader
        eyebrow="Step 4 of 9 · Your story"
        title={
          <>
            Tell people <br />
            who you are.
          </>
        }
        subtitle="This is what appears on your app page. Keep it short, genuine, human."
      />

      <div className="flex flex-col gap-5">
        <Field label="Tagline" hint="One line. This is the first thing people read.">
          <TextInput
            value={state.tagline}
            onChange={(v) => update({ tagline: v })}
            placeholder="Strength coaching for busy professionals."
          />
        </Field>

        <Field label="About">
          <TextArea
            value={state.about_long}
            onChange={(v) => update({ about_long: v })}
            placeholder="We founded Evolv in 2022 to give serious lifters the coaching they deserve…"
            rows={5}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Founder name">
            <TextInput
              value={state.founder_name}
              onChange={(v) => update({ founder_name: v })}
              placeholder="Sam Donworth"
            />
          </Field>
          <Field label="Phone">
            <TextInput
              value={state.phone}
              onChange={(v) => update({ phone: v })}
              placeholder="+353 21 123 4567"
            />
          </Field>
        </div>

        <Field label="Website" hint="If you have one. Optional.">
          <TextInput
            value={state.website}
            onChange={(v) => update({ website: v })}
            placeholder="https://evolv.ie"
            type="url"
          />
        </Field>

        <Field label="Address" hint="Where customers visit.">
          <TextInput
            value={state.address_line}
            onChange={(v) => update({ address_line: v })}
            placeholder="12 South Mall, Cork"
          />
        </Field>

        <div>
          <p
            className="text-[12px] font-semibold tracking-wide uppercase mb-3"
            style={{ color: 'var(--label-3)', letterSpacing: '0.08em' }}
          >
            Socials
          </p>
          <div className="flex flex-col gap-2">
            <SocialInput
              Icon={Instagram}
              placeholder="instagram.com/your-handle"
              value={state.socials.instagram ?? ''}
              onChange={(v) => updateSocial('instagram', v)}
              brand="#E1306C"
            />
            <SocialInput
              Icon={Music}
              placeholder="tiktok.com/@your-handle"
              value={state.socials.tiktok ?? ''}
              onChange={(v) => updateSocial('tiktok', v)}
              brand="#FF0050"
            />
            <SocialInput
              Icon={Facebook}
              placeholder="facebook.com/your-page"
              value={state.socials.facebook ?? ''}
              onChange={(v) => updateSocial('facebook', v)}
              brand="#1877F2"
            />
          </div>
        </div>
      </div>

      <div className="mt-2">
        <NextButton onClick={next} />
        <SkipLink onClick={next} label="I'll fill this in later" />
      </div>
    </div>
  );
}

function SocialInput({
  Icon,
  placeholder,
  value,
  onChange,
  brand,
}: {
  Icon: typeof Instagram;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  brand: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl mat-card px-4 h-[52px] focus-within:ring-2">
      <Icon className="h-[18px] w-[18px]" style={{ color: brand }} strokeWidth={2} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-white/30"
      />
    </div>
  );
}
