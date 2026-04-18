import type { FC, ReactNode } from 'react';
import { useId } from 'react';

type LiquidGlassIconProps = {
  primaryColour: string;
  symbol?: ReactNode;
  fallbackInitials?: string;
  size?: number;
  badge?: number;
  variant?: 'diagonal' | 'radial-gold';
  ring?: boolean;
};

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let s = 0;
  let hue = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        hue = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        hue = ((b - r) / d + 2) * 60;
        break;
      default:
        hue = ((r - g) / d + 4) * 60;
    }
  }
  return { h: hue, s: s * 100, l: l * 100 };
}

function hsl(h: number, s: number, l: number): string {
  const hh = ((h % 360) + 360) % 360;
  const ss = Math.max(0, Math.min(100, s));
  const ll = Math.max(0, Math.min(100, l));
  return `hsl(${hh.toFixed(1)}, ${ss.toFixed(1)}%, ${ll.toFixed(1)}%)`;
}

function buildStops(primaryColour: string) {
  const { h, s, l } = hexToHsl(primaryColour);
  return {
    tint: hsl(h, Math.min(100, s + 10), Math.min(92, l + 30)),
    primary: hsl(h, s, l),
    deep: hsl(h, Math.min(100, s + 5), Math.max(10, l - 22)),
    shadow: hsl(h, Math.max(0, s - 10), Math.max(4, l - 42)),
  };
}

const LiquidGlassIcon: FC<LiquidGlassIconProps> = ({
  primaryColour,
  symbol,
  fallbackInitials,
  size = 62,
  badge,
  variant = 'diagonal',
  ring = false,
}) => {
  const uid = useId().replace(/:/g, '');
  const stops = buildStops(primaryColour);
  const radius = Math.round(size * 0.28);
  const initialsFontSize = Math.round(size * 0.32);

  const clipId = `lg-clip-${uid}`;
  const baseId = `lg-base-${uid}`;
  const sheenId = `lg-sheen-${uid}`;
  const specId = `lg-spec-${uid}`;
  const shadowId = `lg-shadow-${uid}`;

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
        filter: `drop-shadow(0 ${Math.round(size * 0.1)}px ${Math.round(
          size * 0.22
        )}px rgba(0,0,0,0.45))`,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 62 62"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block' }}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={0} y={0} width={62} height={62} rx={radius * (62 / size)} />
          </clipPath>

          {variant === 'diagonal' ? (
            <linearGradient id={baseId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={stops.tint} />
              <stop offset="35%" stopColor={stops.primary} />
              <stop offset="75%" stopColor={stops.deep} />
              <stop offset="100%" stopColor={stops.shadow} />
            </linearGradient>
          ) : (
            <radialGradient id={baseId} cx="50%" cy="45%" r="70%">
              <stop offset="0%" stopColor="#FFF4CB" />
              <stop offset="45%" stopColor="#FFD966" />
              <stop offset="80%" stopColor="#D4AF37" />
              <stop offset="100%" stopColor="#5E4A0E" />
            </radialGradient>
          )}

          <linearGradient id={sheenId} x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
            <stop offset="45%" stopColor="rgba(255,255,255,0)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>

          <radialGradient id={specId} cx="22" cy="8" r="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>

          <linearGradient id={shadowId} x1="50%" y1="55%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.22)" />
          </linearGradient>
        </defs>

        <g clipPath={`url(#${clipId})`}>
          <rect x={0} y={0} width={62} height={62} fill={`url(#${baseId})`} />
          <rect x={0} y={0} width={62} height={62} fill={`url(#${shadowId})`} />

          {symbol ? (
            symbol
          ) : fallbackInitials ? (
            <text
              x={31}
              y={31}
              textAnchor="middle"
              dominantBaseline="central"
              fill="rgba(255,255,255,0.88)"
              fontSize={initialsFontSize}
              fontWeight={500}
              fontFamily="Inter, -apple-system, BlinkMacSystemFont, sans-serif"
              letterSpacing={-0.5}
              style={{ mixBlendMode: 'screen' }}
            >
              {fallbackInitials}
            </text>
          ) : null}

          <ellipse cx={22} cy={8} rx={28} ry={14} fill={`url(#${specId})`} />
          <rect x={0} y={0} width={62} height={22} fill={`url(#${sheenId})`} />
        </g>

        <rect
          x={0.25}
          y={0.25}
          width={61.5}
          height={61.5}
          rx={radius * (62 / size) - 0.25}
          fill="none"
          stroke="rgba(255,255,255,0.24)"
          strokeWidth={0.5}
        />
        {ring ? (
          <rect
            x={-1.25}
            y={-1.25}
            width={64.5}
            height={64.5}
            rx={radius * (62 / size) + 1.5}
            fill="none"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth={0.5}
          />
        ) : null}
      </svg>

      {badge && badge > 0 ? (
        <div
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            padding: '0 4px',
            background: '#ff453a',
            color: '#fff',
            fontSize: 10,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 0 1.5px #050504',
          }}
        >
          {badge > 99 ? '99+' : badge}
        </div>
      ) : null}
    </div>
  );
};

export default LiquidGlassIcon;
