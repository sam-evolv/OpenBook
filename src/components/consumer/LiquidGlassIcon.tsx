'use client';

import { useId } from 'react';
import {
  businessSymbols,
  type BusinessSymbolId,
} from '@/components/icons/BusinessSymbols';
import { dockIcons, type DockIconId } from '@/components/icons/DockIcons';

export interface LiquidGlassIconProps {
  primaryColour: string;
  businessSymbolId?: BusinessSymbolId;
  dockSymbolId?: DockIconId;
  fallbackInitials?: string;
  size?: number;
  variant?: 'diagonal' | 'radial-gold';
  badge?: number;
  active?: boolean;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return { h: 0, s: 0, l: 50 };
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 0xff) / 255;
  const g = ((n >> 8) & 0xff) / 255;
  const b = (n & 0xff) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  const sN = s / 100;
  const lN = l / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp >= 0 && hp < 1) {
    r = c;
    g = x;
  } else if (hp < 2) {
    r = x;
    g = c;
  } else if (hp < 3) {
    g = c;
    b = x;
  } else if (hp < 4) {
    g = x;
    b = c;
  } else if (hp < 5) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const m = lN - c / 2;
  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function deriveStops(hex: string): [string, string, string, string] {
  const { h, s, l } = hexToHsl(hex);
  const clamp = (n: number) => Math.max(6, Math.min(94, n));
  return [
    hslToHex(h, s, clamp(l + 18)),
    hex,
    hslToHex(h, Math.max(s - 10, 20), clamp(l - 25)),
    hslToHex(h, Math.max(s - 20, 10), clamp(l - 45)),
  ];
}

export function LiquidGlassIcon({
  primaryColour,
  businessSymbolId,
  dockSymbolId,
  fallbackInitials,
  size = 62,
  variant = 'diagonal',
  badge,
  active = false,
}: LiquidGlassIconProps) {
  const uid = useId().replace(/:/g, '');
  const rx = Math.round(size * 0.258);
  const clipId = `lg-clip-${uid}`;
  const fillId = `lg-fill-${uid}`;
  const sheenId = `lg-sheen-${uid}`;
  const specId = `lg-spec-${uid}`;

  const [s0, s1, s2, s3] = deriveStops(primaryColour);

  const Symbol = businessSymbolId
    ? businessSymbols[businessSymbolId]
    : dockSymbolId
      ? dockIcons[dockSymbolId]
      : null;

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'inline-block',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 62 62"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          display: 'block',
          filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.45))',
        }}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x="0" y="0" width="62" height="62" rx={rx} ry={rx} />
          </clipPath>

          {variant === 'radial-gold' ? (
            <radialGradient
              id={fillId}
              cx="0.3"
              cy="0.2"
              r="0.9"
              fx="0.3"
              fy="0.2"
            >
              <stop offset="0%" stopColor="#FFF4CB" />
              <stop offset="30%" stopColor="#FFD966" />
              <stop offset="65%" stopColor="#D4AF37" />
              <stop offset="100%" stopColor="#5E4A0E" />
            </radialGradient>
          ) : (
            <linearGradient id={fillId} x1="0.15" y1="0" x2="0.85" y2="1">
              <stop offset="0%" stopColor={s0} />
              <stop offset="33%" stopColor={s1} />
              <stop offset="70%" stopColor={s2} />
              <stop offset="100%" stopColor={s3} />
            </linearGradient>
          )}

          <linearGradient id={sheenId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.33" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>

          <radialGradient
            id={specId}
            cx="0.35"
            cy="0.12"
            r="0.7"
            fx="0.35"
            fy="0.12"
          >
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.7" />
            <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g clipPath={`url(#${clipId})`}>
          {/* Layer 1: gradient fill */}
          <rect x="0" y="0" width="62" height="62" fill={`url(#${fillId})`} />

          {/* Layer 2: symbol or initials */}
          {Symbol ? (
            <Symbol />
          ) : fallbackInitials ? (
            <text
              x="31"
              y="31"
              fontSize="20"
              fontWeight="500"
              fill="#FFFFFF"
              fillOpacity="0.35"
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto"
            >
              {fallbackInitials}
            </text>
          ) : null}

          {/* Layer 3: top vertical sheen */}
          <rect
            x="0"
            y="0"
            width="62"
            height="28"
            fill={`url(#${sheenId})`}
          />

          {/* Layer 4: top-left specular highlight */}
          <ellipse cx="22" cy="8" rx="28" ry="14" fill={`url(#${specId})`} />

          {/* Layer 5: inner hairline border */}
          <rect
            x="0"
            y="0"
            width="62"
            height="62"
            rx={rx}
            ry={rx}
            fill="none"
            stroke="rgba(255,255,255,0.24)"
            strokeWidth="0.5"
          />

          {/* Active inset ring */}
          {active && (
            <rect
              x="1"
              y="1"
              width="60"
              height="60"
              rx={Math.max(rx - 1, 0)}
              ry={Math.max(rx - 1, 0)}
              fill="none"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="0.5"
            />
          )}
        </g>
      </svg>

      {typeof badge === 'number' && (
        <span
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            width: 20,
            height: 20,
            borderRadius: 10,
            border: '2px solid #050504',
            background: '#FF3B30',
            color: '#FFFFFF',
            fontSize: 11,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
          }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

export default LiquidGlassIcon;
