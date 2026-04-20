'use client';

import { StepHeader, Field, NextButton } from './shared';
import type { OnboardingState } from '../OnboardingFlow';

interface StepProps {
  state: OnboardingState;
  update: (patch: Partial<OnboardingState>) => void;
  next: () => void;
}

const PRESET_PALETTES = [
  { name: 'Gold',       primary: '#D4AF37', secondary: '' },
  { name: 'Emerald',    primary: '#10B981', secondary: '' },
  { name: 'Indigo',     primary: '#5B6DFF', secondary: '' },
  { name: 'Crimson',    primary: '#DC2626', secondary: '' },
  { name: 'Coral',      primary: '#F97066', secondary: '' },
  { name: 'Plum',       primary: '#9333EA', secondary: '' },
  { name: 'Teal',       primary: '#14B8A6', secondary: '' },
  { name: 'Amber',      primary: '#F59E0B', secondary: '' },
  { name: 'Rose',       primary: '#EC4899', secondary: '' },
  { name: 'Slate',      primary: '#64748B', secondary: '' },
  { name: 'Ocean',      primary: '#0EA5E9', secondary: '' },
  { name: 'Forest',     primary: '#16A34A', secondary: '' },
];

export function Step2Colours({ state, update, next }: StepProps) {
  return (
    <div className="flex flex-col gap-8 max-w-[520px]">
      <StepHeader
        eyebrow="Step 2 of 9 · Colours"
        title={
          <>
            Pick your brand <br />
            colours.
          </>
        }
        subtitle="These define how your app icon looks on your customers' home screens. Everything else stays beautifully black so your colours stand out."
      />

      <div className="flex flex-col gap-6">
        <Field label="Primary colour">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="h-12 w-12 rounded-xl hairline"
              style={{
                backgroundColor: state.primary_colour,
                borderColor: 'var(--sep-strong)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
              }}
            />
            <input
              type="text"
              value={state.primary_colour}
              onChange={(e) => update({ primary_colour: e.target.value })}
              className="h-12 flex-1 rounded-xl px-4 text-[15px] font-mono mat-card outline-none"
            />
            <input
              type="color"
              value={state.primary_colour}
              onChange={(e) => update({ primary_colour: e.target.value })}
              className="h-12 w-12 rounded-xl border-0 bg-transparent cursor-pointer"
              aria-label="Pick colour"
            />
          </div>
          <div className="grid grid-cols-6 gap-2">
            {PRESET_PALETTES.map((p) => {
              const active = state.primary_colour.toLowerCase() === p.primary.toLowerCase();
              return (
                <button
                  key={p.name}
                  onClick={() => update({ primary_colour: p.primary })}
                  className="group relative flex flex-col items-center gap-1"
                  aria-label={`Use ${p.name}`}
                >
                  <div
                    className="relative h-9 w-9 rounded-full transition-transform group-active:scale-90 group-hover:scale-105"
                    style={{
                      background: `radial-gradient(ellipse at 30% 20%, ${lighten(p.primary, 25)} 0%, ${p.primary} 55%, ${darken(p.primary, 40)} 100%)`,
                      boxShadow: active
                        ? `0 0 0 2px #050505, 0 0 0 4px ${p.primary}, 0 4px 12px ${p.primary}55`
                        : '0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.18)',
                      transitionTimingFunction: 'var(--ease-apple)',
                    }}
                  />
                  <span className="text-[10px]" style={{ color: active ? 'var(--label-1)' : 'var(--label-3)' }}>
                    {p.name}
                  </span>
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Secondary colour" hint="Optional. Used for gradients and accents.">
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-xl hairline"
              style={{
                backgroundColor: state.secondary_colour || 'transparent',
                borderColor: 'var(--sep-strong)',
                backgroundImage: !state.secondary_colour
                  ? 'repeating-linear-gradient(45deg, rgba(255,255,255,0.04), rgba(255,255,255,0.04) 4px, transparent 4px, transparent 8px)'
                  : 'none',
              }}
            />
            <input
              type="text"
              value={state.secondary_colour}
              onChange={(e) => update({ secondary_colour: e.target.value })}
              placeholder="Leave blank to skip"
              className="h-12 flex-1 rounded-xl px-4 text-[15px] font-mono mat-card outline-none placeholder:text-white/30"
            />
            <input
              type="color"
              value={state.secondary_colour || '#000000'}
              onChange={(e) => update({ secondary_colour: e.target.value })}
              className="h-12 w-12 rounded-xl border-0 bg-transparent cursor-pointer"
              aria-label="Pick secondary colour"
            />
          </div>
        </Field>
      </div>

      <div className="mt-2">
        <NextButton onClick={next} />
      </div>
    </div>
  );
}

function lighten(hex: string, p: number) {
  const { r, g, b } = hexToRgb(hex);
  const f = p / 100;
  return `rgb(${Math.min(255, r + (255 - r) * f)}, ${Math.min(255, g + (255 - g) * f)}, ${Math.min(255, b + (255 - b) * f)})`;
}
function darken(hex: string, p: number) {
  const { r, g, b } = hexToRgb(hex);
  const f = 1 - p / 100;
  return `rgb(${Math.floor(r * f)}, ${Math.floor(g * f)}, ${Math.floor(b * f)})`;
}
function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}
