'use client';

import Image from 'next/image';
import { useState } from 'react';
import { getTileColour } from '@/lib/tile-palette';

/**
 * Single source of truth for "the visual representation of a business"
 * across consumer surfaces (AI chat chips, bookings list, booking detail).
 *
 * Priority order:
 *   1. processed_icon_url   — masked square icon from the logo pipeline
 *   2. logo_url             — raw uploaded logo
 *   3. Styled initials tile — first letter of each word (max 2),
 *                              uppercased, centred on the brand colour.
 *
 * Initials are derived from `name`, never `slug`. "Dublin Iron Gym" → "DI",
 * "Evolv Performance" → "EP", "Refresh Barber" → "RB".
 */

const SKIP_WORDS = new Set([
  'the',
  'a',
  'an',
  'of',
  'and',
  '&',
  'at',
  'le',
  'la',
]);

export function getBusinessInitials(name: string): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return '?';
  const words = trimmed
    .split(/\s+/)
    .filter((w) => !SKIP_WORDS.has(w.toLowerCase()));
  if (words.length === 0) {
    return trimmed.charAt(0).toUpperCase() || '?';
  }
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  const first = words[0].charAt(0);
  const second = words[1].charAt(0);
  return (first + second).toUpperCase();
}

export interface BusinessIconProps {
  name: string;
  primary_colour?: string | null;
  processed_icon_url?: string | null;
  logo_url?: string | null;
  /** Pixel size of the icon tile (square). */
  size?: number;
  /** Tailwind/utility classes to merge onto the wrapper for radius, margin, etc. */
  className?: string;
  /** Override radius in px; defaults to 22% of size (matches iOS app icon). */
  radius?: number;
}

// Anything below this is almost certainly a browser favicon (16/32/48 px) and
// not a real business logo — favicons load with HTTP 200 so onError never
// fires, and they look terrible scaled into the 56px booking-row tile.
const MIN_LOGO_DIMENSION = 50;

export function BusinessIcon({
  name,
  primary_colour,
  processed_icon_url,
  logo_url,
  size = 48,
  className = '',
  radius,
}: BusinessIconProps) {
  const colour = getTileColour(primary_colour ?? undefined).mid;
  const r = radius ?? Math.round(size * 0.22);
  // A row like "Dublin Iron Gym" can have a non-null processed_icon_url that
  // either 404s (stale path) or loads HTTP 200 but points at a tiny browser
  // favicon. Track both cases and fall through to the initials tile so we
  // never render a broken or favicon-quality icon.
  const [imageRejected, setImageRejected] = useState(false);
  const candidate = processed_icon_url || logo_url || null;
  const imgSrc = imageRejected ? null : candidate;
  const showInitials = !imgSrc;

  return (
    <div
      className={`relative shrink-0 overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: r,
        background: showInitials
          ? `linear-gradient(145deg, ${colour} 0%, ${colour}55 100%)`
          : '#0B0B0D',
        boxShadow: showInitials
          ? `inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(0,0,0,0.3)`
          : '0 1px 2px rgba(0,0,0,0.3)',
      }}
      aria-hidden
    >
      {imgSrc ? (
        <Image
          src={imgSrc}
          alt={name}
          fill
          sizes={`${size}px`}
          className="object-cover"
          onError={() => setImageRejected(true)}
          onLoad={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            if (
              img.naturalWidth > 0 &&
              img.naturalHeight > 0 &&
              (img.naturalWidth < MIN_LOGO_DIMENSION ||
                img.naturalHeight < MIN_LOGO_DIMENSION)
            ) {
              setImageRejected(true);
            }
          }}
        />
      ) : (
        <span
          className="absolute inset-0 flex items-center justify-center font-semibold text-white"
          style={{
            fontSize: Math.max(10, Math.round(size * 0.4)),
            letterSpacing: '-0.02em',
            textShadow: '0 1px 2px rgba(0,0,0,0.35)',
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', system-ui, sans-serif",
          }}
        >
          {getBusinessInitials(name)}
        </span>
      )}
    </div>
  );
}
