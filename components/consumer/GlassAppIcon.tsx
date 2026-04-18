'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { Business } from '@/lib/supabase';

/**
 * iOS 26 liquid-glass style app icon.
 * Uses the business primary_colour as the tint beneath a layered glass treatment.
 */
export function GlassAppIcon({ biz }: { biz: Business }) {
  const colour = biz.primary_colour || '#D4AF37';
  const initials = biz.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <Link
      href={`/business/${biz.slug}`}
      className="group flex flex-col items-center active:scale-95 transition-transform"
    >
      <div
        className="
          relative w-[62px] h-[62px] rounded-[18px] overflow-hidden
          shadow-[0_8px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.18)]
        "
        style={{
          background: `linear-gradient(140deg, ${colour} 0%, ${darken(colour, 35)} 100%)`,
        }}
      >
        {/* Logo or initials */}
        {biz.logo_url ? (
          <Image
            src={biz.logo_url}
            alt={biz.name}
            fill
            sizes="62px"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="text-[22px] font-bold tracking-tight text-white"
              style={{
                textShadow: '0 1px 2px rgba(0,0,0,0.4)',
              }}
            >
              {initials}
            </span>
          </div>
        )}

        {/* Glass top highlight */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.04) 45%, transparent 60%)',
          }}
        />
        {/* Inner border */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-[18px] pointer-events-none"
          style={{
            boxShadow:
              'inset 0 0 0 1px rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.25)',
          }}
        />
      </div>

      <span className="mt-2 text-[11px] font-medium text-white/85 text-center max-w-[78px] truncate leading-tight">
        {biz.name.split(' ')[0]}
      </span>
    </Link>
  );
}

// Utility: darken a hex colour by percentage
function darken(hex: string, percent: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const num = parseInt(full, 16);
  const factor = 1 - percent / 100;
  const r = Math.max(0, Math.floor(((num >> 16) & 255) * factor));
  const g = Math.max(0, Math.floor(((num >> 8) & 255) * factor));
  const b = Math.max(0, Math.floor((num & 255) * factor));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
