'use client';

import { useState } from 'react';
import {
  paletteByFamily,
  tileGradient,
  type TileColourSlug,
  type TileColourFamily,
} from '@/lib/tile-palette';
import { haptics } from '@/lib/haptics';
import { Tile } from './Tile';

const FAMILY_LABELS: Record<TileColourFamily, string> = {
  warm: 'Warm',
  cool: 'Cool',
  earth: 'Earth',
  neutral: 'Neutral',
};

export interface ColourPickerProps {
  /** Currently selected slug. */
  value: TileColourSlug;
  /** Called whenever a new colour is selected. */
  onChange: (slug: TileColourSlug) => void;
  /** Business name — used for the live tile preview. */
  businessName: string;
  /** Pre-processed monochrome white logo URL, optional. */
  logoUrl?: string | null;
}

export function ColourPicker({
  value,
  onChange,
  businessName,
  logoUrl,
}: ColourPickerProps) {
  const families = paletteByFamily();
  const familyOrder: TileColourFamily[] = ['warm', 'cool', 'earth', 'neutral'];

  const handlePick = (slug: TileColourSlug) => {
    if (slug === value) return;
    haptics.selection();
    onChange(slug);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
        color: 'rgba(255,255,255,0.95)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          padding: '24px 0',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 18,
          border: '0.5px solid rgba(255,255,255,0.08)',
        }}
      >
        <Tile
          name={businessName || 'Your business'}
          colour={value}
          logoUrl={logoUrl ?? null}
          size={96}
          hideLabel
        />
        <div
          style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.55)',
            textAlign: 'center',
            maxWidth: 240,
          }}
        >
          This is what your tile will look like on a customer's home screen.
        </div>
      </div>

      {familyOrder.map((family) => (
        <div key={family}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.18em',
              color: 'rgba(255,255,255,0.4)',
              marginBottom: 12,
              textTransform: 'uppercase',
            }}
          >
            {FAMILY_LABELS[family]}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: 10,
            }}
          >
            {families[family].map((c) => (
              <Swatch
                key={c.slug}
                slug={c.slug}
                gradient={tileGradient(c)}
                name={c.name}
                selected={c.slug === value}
                onSelect={handlePick}
              />
            ))}
          </div>
        </div>
      ))}

      <p
        style={{
          fontSize: 12,
          color: 'rgba(255,255,255,0.45)',
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        We've curated 24 colours that look premium against the OpenBook home
        screen. Light tiles stand out more than dark ones.
      </p>
    </div>
  );
}

interface SwatchProps {
  slug: TileColourSlug;
  gradient: string;
  name: string;
  selected: boolean;
  onSelect: (slug: TileColourSlug) => void;
}

function Swatch({ slug, gradient, name, selected, onSelect }: SwatchProps) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      type="button"
      aria-label={name}
      aria-pressed={selected}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onClick={() => onSelect(slug)}
      style={{
        position: 'relative',
        aspectRatio: '1 / 1',
        padding: 0,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        transform: pressed ? 'scale(0.92)' : 'scale(1)',
        transition: 'transform 160ms cubic-bezier(0.2, 0.9, 0.3, 1)',
      }}
    >
      <span
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 12,
          background: gradient,
          boxShadow: selected
            ? '0 0 0 2px #D4AF37, 0 0 0 4px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(0,0,0,0.25)'
            : 'inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(0,0,0,0.25), inset 0 0 0 0.5px rgba(255,255,255,0.12)',
          transition: 'box-shadow 200ms ease',
        }}
      />
      {selected && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      )}
    </button>
  );
}
