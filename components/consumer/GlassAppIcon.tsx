'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { Business } from '@/lib/supabase';

/**
 * iOS home-screen app icon. Larger than the dock icons, used in the main grid.
 * Pulls `primary_colour` from the business for tint.
 */
export function GlassAppIcon({ biz }: { biz: Business }) {
  const colour = biz.primary_colour || '#D4AF37';
  const initials = biz.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  const displayName = getShortName(biz.name);

  return (
    <Link
      href={`/business/${biz.slug}`}
      className="group flex flex-col items-center active:scale-90 transition-transform duration-150"
      aria-label={`Open ${biz.name}`}
    >
      <div
        className="
          relative w-[72px] h-[72px] rounded-[18px] overflow-hidden
          shadow-[0_10px_28px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.2)]
        "
        style={{
          background: `linear-gradient(145deg, ${lighten(colour, 20)} 0%, ${colour} 45%, ${darken(colour, 40)} 100%)`,
        }}
      >
        {biz.logo_url ? (
          <Image
            src={biz.logo_url}
            alt={biz.name}
            fill
            sizes="72px"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="text-[26px] font-bold tracking-tight text-white"
              style={{
                textShadow:
                  '0 1px 2px rgba(0,0,0,0.35), 0 0 20px rgba(255,255,255,0.15)',
              }}
            >
              {initials}
            </span>
          </div>
        )}

        {/* Glass top sheen */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.06) 42%, transparent 58%)',
          }}
        />
        {/* Inner border */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-[18px] pointer-events-none"
          style={{
            boxShadow:
              'inset 0 0 0 1px rgba(255,255,255,0.16), inset 0 -1px 0 rgba(0,0,0,0.3)',
          }}
        />
      </div>

      <span
        className="
          mt-2 text-[12px] font-medium text-white/90 text-center
          max-w-[80px] truncate leading-tight
        "
        style={{
          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
        }}
      >
        {displayName}
      </span>
    </Link>
  );
}

// Prefer a distinctive word: "Evolv Performance" → "Evolv", "The Nail Studio" → "Nails"
function getShortName(full: string): string {
  const skip = new Set(['the', 'a', 'an']);
  const words = full.split(' ');
  const first = words.find((w) => !skip.has(w.toLowerCase())) ?? words[0];
  return first;
}

function lighten(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const factor = percent / 100;
  const nr = Math.min(255, Math.round(r + (255 - r) * factor));
  const ng = Math.min(255, Math.round(g + (255 - g) * factor));
  const nb = Math.min(255, Math.round(b + (255 - b) * factor));
  return rgbToHex(nr, ng, nb);
}

function darken(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const factor = 1 - percent / 100;
  return rgbToHex(
    Math.max(0, Math.floor(r * factor)),
    Math.max(0, Math.floor(g * factor)),
    Math.max(0, Math.floor(b * factor))
  );
}

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
