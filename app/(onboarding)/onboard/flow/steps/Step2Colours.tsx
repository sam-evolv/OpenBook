'use client';

import { StepHeader, NextButton } from './shared';
import { ColourPicker } from '@/components/ColourPicker';
import {
  DEFAULT_TILE_COLOUR,
  isValidTileColour,
  type TileColourSlug,
} from '@/lib/tile-palette';
import type { OnboardingState } from '../OnboardingFlow';

interface StepProps {
  state: OnboardingState;
  update: (patch: Partial<OnboardingState>) => void;
  next: () => void;
}

export function Step2Colours({ state, update, next }: StepProps) {
  const current: TileColourSlug = isValidTileColour(state.primary_colour)
    ? state.primary_colour
    : DEFAULT_TILE_COLOUR;

  return (
    <div className="flex flex-col gap-8 max-w-[520px]">
      <StepHeader
        eyebrow="Step 2 of 9 · Colour"
        title={
          <>
            Pick your tile <br />
            colour.
          </>
        }
        subtitle="This is the colour customers see on their home screen. Everything else stays beautifully black so your tile stands out."
      />

      <ColourPicker
        value={current}
        onChange={(slug) => update({ primary_colour: slug })}
        businessName={state.name}
        logoUrl={state.processed_icon_url ?? state.logo_url ?? null}
      />

      <div className="mt-2">
        <NextButton onClick={next} />
      </div>
    </div>
  );
}
