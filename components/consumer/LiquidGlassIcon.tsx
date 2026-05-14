/**
 * Logo / initials chip with the iOS-26 "liquid glass" three-stop
 * gradient and inset highlight. Mirrors src/components/consumer/
 * LiquidGlassIcon.tsx — that copy is consumed by the Vite/iOS app
 * (src/ tree); this copy is the version Next.js builds against,
 * since src/ is excluded from the consumer-web tsconfig and Vite
 * paths don't resolve here. Keep them visually in sync.
 */

import type { CSSProperties } from 'react';

type Props = {
  primaryColour?: string | null;
  fallbackInitials: string;
  size?: number;
  style?: CSSProperties;
};

function lighten(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.min(255, ((n >> 16) & 0xff) + amount);
  const g = Math.min(255, ((n >> 8) & 0xff) + amount);
  const b = Math.min(255, (n & 0xff) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function darken(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.max(0, ((n >> 16) & 0xff) - amount);
  const g = Math.max(0, ((n >> 8) & 0xff) - amount);
  const b = Math.max(0, (n & 0xff) - amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function LiquidGlassIcon({
  primaryColour,
  fallbackInitials,
  size = 72,
  style,
}: Props) {
  const base = primaryColour && /^#?[0-9a-f]{6}$/i.test(primaryColour) ? primaryColour : '#444444';
  const top = lighten(base, 36);
  const bottom = darken(base, 28);
  const radius = Math.round(size * 0.28);

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: radius,
        background: `linear-gradient(155deg, ${top} 0%, ${base} 50%, ${bottom} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        boxShadow: `0 6px 18px ${darken(base, 40)}66, inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.2)`,
        overflow: 'hidden',
        ...style,
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(120% 60% at 50% 0%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 60%)',
          pointerEvents: 'none',
        }}
      />
      <span
        style={{
          position: 'relative',
          fontWeight: 800,
          fontSize: Math.round(size * 0.34),
          letterSpacing: -0.5,
          color: '#ffffff',
          textShadow: '0 1px 2px rgba(0,0,0,0.25)',
        }}
      >
        {fallbackInitials}
      </span>
    </div>
  );
}
