'use client';

import { Dumbbell, Scissors, Flame, Sparkles, Stethoscope, HandHelping, Brush, Waves, type LucideIcon } from 'lucide-react';
import type { OnboardingState } from './OnboardingFlow';

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  gym: Dumbbell,
  barber: Scissors,
  sauna: Flame,
  salon: Sparkles,
  physio: Stethoscope,
  yoga: HandHelping,
  nails: Brush,
  massage: Waves,
  default: Sparkles,
};

function resolveCategoryKey(categoryText: string): string {
  const s = categoryText.toLowerCase();
  if (s.includes('gym') || s.includes('fitness') || s.includes('training')) return 'gym';
  if (s.includes('barber')) return 'barber';
  if (s.includes('sauna') || s.includes('spa')) return 'sauna';
  if (s.includes('nail')) return 'nails';
  if (s.includes('salon') || s.includes('beauty') || s.includes('hair')) return 'salon';
  if (s.includes('physio') || s.includes('health') || s.includes('therapy')) return 'physio';
  if (s.includes('yoga') || s.includes('pilates')) return 'yoga';
  if (s.includes('massage')) return 'massage';
  return 'default';
}

/**
 * Live preview of the owner's app icon + home screen placement.
 * Updates in real time as they edit colours, logo, etc.
 */
export function LivePreview({ state }: { state: OnboardingState }) {
  const categoryKey = resolveCategoryKey(state.category);
  const CategoryIcon = CATEGORY_ICONS[categoryKey] ?? CATEGORY_ICONS.default;
  const colour = state.primary_colour || '#D4AF37';
  const secondary = state.secondary_colour || colour;
  const name = state.name || 'Your business';
  const shortName = name.split(' ').find((w) => !['the', 'a', 'an'].includes(w.toLowerCase())) ?? name;

  return (
    <div className="flex flex-col items-center">
      <p className="text-caption-eyebrow mb-4" style={{ color: 'var(--label-3)' }}>
        Live preview
      </p>

      {/* Phone frame */}
      <div
        className="relative w-[280px] overflow-hidden rounded-[44px] p-2 hairline"
        style={{
          background: 'linear-gradient(180deg, #1a1a1d, #0a0a0c)',
          borderColor: 'rgba(255,255,255,0.12)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        {/* Screen */}
        <div
          className="relative rounded-[36px] overflow-hidden"
          style={{
            aspectRatio: '9 / 19.5',
            background:
              'radial-gradient(600px 400px at 20% 0%, rgba(212,175,55,0.08), transparent 55%), linear-gradient(180deg, #050505 0%, #000 100%)',
          }}
        >
          {/* Notch */}
          <div className="absolute left-1/2 top-2 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />

          {/* Status bar */}
          <div className="relative z-10 flex items-center justify-between px-6 pt-3 text-[10px] font-semibold">
            <span>9:41</span>
            <span>●●●</span>
          </div>

          {/* Greeting */}
          <div className="px-5 mt-5">
            <p
              className="text-[8px] font-semibold tracking-[0.16em] uppercase"
              style={{ color: 'var(--label-3)' }}
            >
              Welcome to
            </p>
            <h2 className="text-[20px] font-bold mt-0.5" style={{ letterSpacing: '-0.02em' }}>
              OpenBook<span style={{ color: 'var(--brand-gold)' }}>.</span>
            </h2>
          </div>

          {/* App grid */}
          <div className="px-4 mt-5">
            <div className="grid grid-cols-4 gap-x-2 gap-y-4">
              {/* Discover */}
              <PreviewIcon colour="#D4AF37" Icon={CATEGORY_ICONS.default} label="Discover" glyphDark />
              {/* Their app (highlighted) */}
              <div className="animate-gentle-pulse">
                <PreviewIcon
                  colour={colour}
                  secondaryColour={secondary}
                  Icon={CategoryIcon}
                  label={shortName}
                  logoUrl={state.processed_icon_url}
                  highlight
                />
              </div>
              {/* Placeholder neighbours */}
              <PreviewIcon colour="#3A3A40" Icon={Scissors} label="Barber" muted />
              <PreviewIcon colour="#5D3A8F" Icon={Flame} label="Sauna" muted />
              <PreviewIcon colour="#18543A" Icon={Dumbbell} label="Gym" muted />
              <PreviewIcon colour="#D4477E" Icon={Brush} label="Nails" muted />
              <PreviewIcon colour="#1C1C1E" Icon={CATEGORY_ICONS.default} label="Wallet" />
              <PreviewIcon colour="#2A2A30" Icon={CATEGORY_ICONS.default} label="Me" />
            </div>

            <div className="mt-6 flex items-center justify-center gap-1">
              <span className="h-[4px] w-[4px] rounded-full bg-white/80" />
              <span className="h-[4px] w-[4px] rounded-full bg-white/25" />
            </div>
          </div>

          {/* Dock */}
          <div className="absolute left-3 right-3 bottom-3">
            <div
              className="flex items-center justify-around rounded-[22px] px-2 py-2 mat-glass-thick"
              style={{
                boxShadow: '0 10px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
              }}
            >
              {[
                { c: '#D4AF37', bright: true },
                { c: '#3A3A40' },
                { c: '#3A3A40' },
                { c: '#3A3A40' },
              ].map((d, i) => (
                <div
                  key={i}
                  className="h-7 w-7 rounded-[8px]"
                  style={{
                    background: d.bright
                      ? `radial-gradient(ellipse at 30% 20%, #F6D77C, ${d.c} 50%, #7A5418)`
                      : `radial-gradient(ellipse at 30% 20%, #4A4A50, ${d.c} 50%, #0E0E12)`,
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="mt-4 text-[11px] text-center max-w-[240px]" style={{ color: 'var(--label-3)' }}>
        This is exactly what your customers will see when they open OpenBook.
      </p>
    </div>
  );
}

function PreviewIcon({
  colour,
  secondaryColour,
  Icon,
  label,
  logoUrl,
  highlight,
  muted,
  glyphDark,
}: {
  colour: string;
  secondaryColour?: string;
  Icon: LucideIcon;
  label: string;
  logoUrl?: string | null;
  highlight?: boolean;
  muted?: boolean;
  glyphDark?: boolean;
}) {
  const size = 48;
  const highlight2 = secondaryColour && secondaryColour !== colour ? secondaryColour : lighten(colour, 30);
  const shadow2 = darken(colour, 45);

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative overflow-hidden"
        style={{
          width: size,
          height: size,
          borderRadius: 11,
          opacity: muted ? 0.4 : 1,
          boxShadow: highlight
            ? `0 6px 16px ${colour}55, 0 2px 4px rgba(0,0,0,0.4)`
            : '0 2px 6px rgba(0,0,0,0.4)',
          transition: 'all 400ms var(--ease-apple)',
        }}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <>
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(ellipse at 30% 20%, ${highlight2} 0%, ${colour} 45%, ${shadow2} 100%)`,
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Icon
                style={{
                  width: size * 0.42,
                  height: size * 0.42,
                  color: glyphDark ? 'rgba(0,0,0,0.78)' : 'rgba(255,255,255,0.95)',
                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))',
                }}
                strokeWidth={1.8}
              />
            </div>
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.05) 22%, transparent 50%)',
              }}
            />
          </>
        )}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none rounded-[11px]"
          style={{ boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.18)' }}
        />
      </div>
      <span
        className="mt-1 text-[8px] font-medium leading-tight text-center truncate max-w-[52px]"
        style={{ color: muted ? 'var(--label-3)' : 'var(--label-1)' }}
      >
        {label}
      </span>
    </div>
  );
}

function lighten(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const factor = percent / 100;
  return rgbToHex(
    Math.min(255, Math.round(r + (255 - r) * factor)),
    Math.min(255, Math.round(g + (255 - g) * factor)),
    Math.min(255, Math.round(b + (255 - b) * factor))
  );
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
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}
