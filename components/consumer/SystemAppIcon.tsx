'use client';

import Link from 'next/link';
import { Compass, Wallet, UserRound } from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';
import { OpenBookMark } from './OpenBookMark';
import { haptics } from '@/lib/haptics';

type SystemKind = 'discover' | 'wallet' | 'me' | 'assistant';

type SystemGlyph = ComponentType<
  SVGProps<SVGSVGElement> & { strokeWidth?: number; size?: number }
>;

const SYSTEM_APPS: Record<
  SystemKind,
  {
    href: string;
    label: string;
    Icon: SystemGlyph;
    gradient: { highlight: string; base: string; shadow: string };
    glyphColour: string;
    /** Override the default light haptic on tap. */
    hapticPreset?: 'tap' | 'longPress';
  }
> = {
  discover: {
    href: '/explore',
    label: 'Discover',
    Icon: Compass as SystemGlyph,
    gradient: { highlight: '#F6D77C', base: '#D4AF37', shadow: '#7A5418' },
    glyphColour: 'rgba(0,0,0,0.78)',
  },
  wallet: {
    href: '/wallet',
    label: 'Wallet',
    Icon: Wallet as SystemGlyph,
    gradient: { highlight: '#2C2C30', base: '#141418', shadow: '#050507' },
    glyphColour: 'rgba(255,255,255,0.95)',
  },
  me: {
    href: '/me',
    label: 'Me',
    Icon: UserRound as SystemGlyph,
    gradient: { highlight: '#4A4A50', base: '#2A2A30', shadow: '#131317' },
    glyphColour: 'rgba(255,255,255,0.95)',
  },
  // Ask AI — gold tile mirroring Discover's treatment but with the
  // OpenBookMark glyph. Reverse contrast against the dark Wallet/Me tiles
  // makes the AI tile read as "different" at a glance. Medium haptic on
  // tap matches the existing AI hero button on Explore.
  assistant: {
    href: '/assistant',
    label: 'Ask AI',
    Icon: OpenBookMark as SystemGlyph,
    gradient: { highlight: '#F6D77C', base: '#D4AF37', shadow: '#7A5418' },
    glyphColour: '#080808',
    hapticPreset: 'longPress',
  },
};

export function SystemAppIcon({
  kind,
  size = 72,
}: {
  kind: SystemKind;
  size?: number;
}) {
  const cfg = SYSTEM_APPS[kind];
  const { Icon } = cfg;
  const radius = Math.round(size * 0.235);

  return (
    <Link
      href={cfg.href}
      onClick={() => {
        if (cfg.hapticPreset === 'longPress') haptics.longPress();
        else haptics.tap();
      }}
      className="group flex flex-col items-center transition-transform duration-300 active:scale-[0.88] hover:scale-[1.02]"
      style={{ transitionTimingFunction: 'var(--ease-apple)' }}
      aria-label={cfg.label}
    >
      <div
        className="relative overflow-hidden"
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          boxShadow: `
            0 1px 2px rgba(0, 0, 0, 0.25),
            0 8px 20px rgba(0, 0, 0, 0.45),
            0 16px 40px rgba(0, 0, 0, 0.3)
          `,
        }}
      >
        {/* Radial base */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 30% 20%, ${cfg.gradient.highlight} 0%, ${cfg.gradient.base} 45%, ${cfg.gradient.shadow} 100%)`,
          }}
        />

        {/* Glyph */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon
            style={{
              width: size * 0.46,
              height: size * 0.46,
              color: cfg.glyphColour,
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
            }}
            strokeWidth={1.8}
          />
        </div>

        {/* Specular highlight */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              linear-gradient(
                180deg,
                rgba(255,255,255,0.32) 0%,
                rgba(255,255,255,0.08) 22%,
                transparent 50%,
                transparent 100%
              )
            `,
          }}
        />

        {/* Bottom shadow */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.22) 100%)`,
          }}
        />

        {/* Hairline */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius: radius,
            boxShadow: `
              inset 0 0 0 0.5px rgba(255, 255, 255, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.12),
              inset 0 -0.5px 0 rgba(0, 0, 0, 0.4)
            `,
          }}
        />
      </div>

      <span
        className="mt-2 text-[12px] font-medium leading-tight text-center"
        style={{
          color: 'var(--label-1)',
          letterSpacing: '-0.01em',
          textShadow: '0 1px 2px rgba(0,0,0,0.6)',
        }}
      >
        {cfg.label}
      </span>
    </Link>
  );
}
