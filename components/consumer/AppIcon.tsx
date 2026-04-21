'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { Business } from '@/lib/supabase';
import { resolveCategory, CATEGORIES } from '@/lib/categories';
import { getTileColour, isValidTileColour } from '@/lib/tile-palette';

/**
 * Apple-quality app icon.
 *
 * Depth is built up from 5 layers:
 *   1. Multi-stop radial gradient base (not a flat linear)
 *   2. Business primary_colour wash (if set) blended multiply
 *   3. Specular highlight sweep across the top third
 *   4. Inner shadow at the bottom for physicality
 *   5. Hairline inner stroke for crisp edge definition
 *
 * Icon glyph is the category symbol, centred, with soft drop shadow.
 * If business has a processed_icon_url (from logo pipeline), use that instead.
 */
export function AppIcon({
  biz,
  size = 72,
}: {
  biz: Business;
  size?: number;
}) {
  const cat = resolveCategory(biz.category);
  const cfg = CATEGORIES[cat];
  const Icon = cfg.icon;

  // If business has uploaded processed icon, use it directly
  const hasProcessedIcon = Boolean(biz.processed_icon_url);

  // If business uses a palette slug, resolve to hex for the brand wash.
  // Pre-migration hex values are also accepted (getTileColour falls back).
  const brandColour = isValidTileColour(biz.primary_colour)
    ? getTileColour(biz.primary_colour).mid
    : biz.primary_colour;
  const useBrandTint = Boolean(brandColour) && brandColour.toLowerCase() !== '#d4af37';

  const radius = Math.round(size * 0.235); // iOS superellipse approximation

  return (
    <Link
      href={`/business/${biz.slug}`}
      className="group flex flex-col items-center transition-transform duration-300 active:scale-[0.88] hover:scale-[1.02]"
      style={{ transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)' }}
      aria-label={`Open ${biz.name}`}
    >
      <div
        className="relative overflow-hidden"
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          /* Three-layer shadow for real physical depth */
          boxShadow: `
            0 1px 2px rgba(0, 0, 0, 0.25),
            0 8px 20px rgba(0, 0, 0, 0.45),
            0 16px 40px rgba(0, 0, 0, 0.3)
          `,
        }}
      >
        {hasProcessedIcon ? (
          <Image
            src={biz.processed_icon_url!}
            alt={biz.name}
            fill
            sizes={`${size}px`}
            className="object-cover"
          />
        ) : (
          <>
            {/* LAYER 1: Radial base gradient — off-centre light source */}
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(ellipse at 30% 20%, ${cfg.gradient.highlight} 0%, ${cfg.gradient.base} 45%, ${cfg.gradient.shadow} 100%)`,
              }}
            />

            {/* LAYER 2: Brand colour wash (only if business sets custom) */}
            {useBrandTint && (
              <div
                className="absolute inset-0 mix-blend-overlay opacity-80"
                style={{
                  background: `linear-gradient(155deg, ${brandColour}cc 0%, transparent 60%)`,
                }}
              />
            )}

            {/* LAYER 3: Glyph */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Icon
                className="text-white/95"
                style={{
                  width: size * 0.44,
                  height: size * 0.44,
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
                }}
                strokeWidth={1.8}
              />
            </div>

            {/* LAYER 4: Specular highlight (the "sheen") */}
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

            {/* LAYER 5: Bottom inner shadow for physicality */}
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.22) 100%)`,
              }}
            />
          </>
        )}

        {/* Hairline inner border — crisp edge definition */}
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
        className="mt-2 max-w-[86px] truncate text-center text-[12px] font-medium leading-tight"
        style={{
          color: 'var(--label-1)',
          letterSpacing: '-0.01em',
          textShadow: '0 1px 2px rgba(0,0,0,0.6)',
        }}
      >
        {shortName(biz.name)}
      </span>
    </Link>
  );
}

/** Apple-style truncation: prefer distinctive word, drop articles. */
function shortName(full: string): string {
  const skip = new Set(['the', 'a', 'an', 'of', 'and', '&']);
  const words = full.split(/\s+/);
  const meaningful = words.find((w) => !skip.has(w.toLowerCase())) ?? words[0];
  return meaningful;
}
