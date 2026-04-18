import type { CSSProperties, ReactNode } from 'react';
import { BusinessSymbol, type BusinessSymbolId } from '@/components/icons/BusinessSymbols';

type Props = {
  primaryColour?: string | null;
  fallbackInitials: string;
  symbolId?: BusinessSymbolId;
  size?: number;
  label?: ReactNode;
  sublabel?: ReactNode;
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

export default function LiquidGlassIcon({
  primaryColour,
  fallbackInitials,
  symbolId,
  size = 72,
  label,
  sublabel,
  style,
}: Props) {
  const base = primaryColour && /^#?[0-9a-f]{6}$/i.test(primaryColour) ? primaryColour : '#444444';
  const top = lighten(base, 36);
  const bottom = darken(base, 28);
  const radius = Math.round(size * 0.28);

  return (
    <div
      style={{
        width: size,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        ...style,
      }}
    >
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
        {symbolId ? (
          <BusinessSymbol
            id={symbolId}
            width={Math.round(size * 0.55)}
            height={Math.round(size * 0.55)}
            style={{ position: 'relative' }}
          />
        ) : (
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
        )}
      </div>
      {label && (
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#f0f0f0',
            textAlign: 'center',
            lineHeight: 1.2,
            maxWidth: size + 8,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
      )}
      {sublabel && (
        <span style={{ fontSize: 10, color: '#888888' }}>{sublabel}</span>
      )}
    </div>
  );
}
