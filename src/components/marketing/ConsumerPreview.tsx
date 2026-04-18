'use client';

import { Reveal, RevealItem } from './shared/Reveal';

const ICONS = [
  { name: 'Evolv', initials: 'E', tint: '#D4AF37', featured: true },
  { name: 'Refresh', initials: 'R', tint: '#111827' },
  { name: 'Saltwater', initials: 'S', tint: '#0F766E' },
  { name: 'Nail Studio', initials: 'N', tint: '#DB2777' },
  { name: 'Cork Physio', initials: 'C', tint: '#3B82F6' },
  { name: 'Yoga Flow', initials: 'Y', tint: '#A855F7' },
  { name: 'Iron Gym', initials: 'I', tint: '#5C5C5C' },
  { name: 'Driving', initials: 'D', tint: '#F97316' },
];

export function ConsumerPreview() {
  return (
    <section id="consumer" className="relative py-28 md:py-40 border-t border-white/[0.04]">
      <div className="mx-auto max-w-6xl px-6 grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-16 lg:gap-20 items-center">
        <Reveal stagger={0.08}>
          <RevealItem>
            <span className="eyebrow text-paper/55">For the customer</span>
          </RevealItem>
          <RevealItem>
            <h2 className="mt-5 display text-[clamp(32px,5vw,58px)] text-paper leading-[1]">
              It lives on <em>their phone.</em>
            </h2>
          </RevealItem>
          <RevealItem>
            <p className="mt-6 text-[17px] leading-[1.65] text-paper/65 max-w-md">
              When a customer saves your booking page to their iPhone home screen, your business gets
              a real app icon sitting next to Instagram and Spotify. No App Store download. No
              password prompts.
            </p>
          </RevealItem>
          <RevealItem>
            <p className="mt-4 text-[17px] leading-[1.65] text-paper/65 max-w-md">
              Rebooking takes two taps. Which is why your regulars come back, and why your marketing
              compounds every time someone new books.
            </p>
          </RevealItem>
          <RevealItem>
            <ul className="mt-8 flex flex-col gap-3">
              {[
                'Native home-screen icon, no App Store',
                'Liquid-glass consumer UI, iOS-native feel',
                'Book, pay and get reminders in under 20 seconds',
              ].map((l, i) => (
                <li key={i} className="flex items-start gap-3 text-[14px] text-paper/75">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#D4AF37"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-0.5 shrink-0"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M8 12.5l2.5 2.5L16 9.5" />
                  </svg>
                  {l}
                </li>
              ))}
            </ul>
          </RevealItem>
        </Reveal>

        <Reveal className="flex justify-center lg:justify-end">
          <RevealItem>
            <PhoneMock />
          </RevealItem>
        </Reveal>
      </div>
    </section>
  );
}

function PhoneMock() {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -inset-10 rounded-full blur-3xl opacity-50"
        style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.18), transparent 60%)' }}
      />
      <div
        className="relative w-[290px] h-[590px] rounded-[54px] border border-white/10 bg-[#0a0a0a] shadow-[0_60px_140px_rgba(0,0,0,0.7)] overflow-hidden"
        style={{
          backgroundImage:
            'radial-gradient(70% 50% at 50% 0%, rgba(212,175,55,0.12), transparent 60%), linear-gradient(180deg, #0e0e0e 0%, #050505 100%)',
        }}
      >
        {/* Dynamic island */}
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[95px] h-[28px] rounded-full bg-black border border-white/10" />
        {/* Status bar */}
        <div className="flex items-center justify-between px-8 pt-4 text-[11px] font-medium text-paper/80">
          <span>9:41</span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-2 rounded-sm bg-paper/70" />
            <span className="w-3 h-2 rounded-sm bg-paper/70" />
          </span>
        </div>

        {/* Icons grid */}
        <div className="mt-14 px-6 grid grid-cols-4 gap-y-6 gap-x-4">
          {ICONS.map((ic, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <GlassIcon tint={ic.tint} initials={ic.initials} featured={ic.featured} />
              <span className="text-[10px] text-paper/80 truncate max-w-[60px] text-center">
                {ic.name}
              </span>
            </div>
          ))}
        </div>

        {/* Dock */}
        <div className="absolute bottom-6 left-4 right-4 rounded-[28px] border border-white/10 bg-white/[0.06] backdrop-blur-xl p-3 flex justify-around">
          {[
            { t: '#3B82F6', i: 'M' },
            { t: '#22C55E', i: 'P' },
            { t: '#F97316', i: 'C' },
            { t: '#EC4899', i: 'S' },
          ].map((d, i) => (
            <GlassIcon key={i} tint={d.t} initials={d.i} small />
          ))}
        </div>

        {/* Home indicator */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-[110px] h-[4px] rounded-full bg-white/50" />
      </div>
    </div>
  );
}

function GlassIcon({
  tint,
  initials,
  small,
  featured,
}: {
  tint: string;
  initials: string;
  small?: boolean;
  featured?: boolean;
}) {
  const size = small ? 46 : 54;
  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
    >
      {featured && (
        <span
          aria-hidden
          className="absolute -inset-1 rounded-[18px] blur-md opacity-70"
          style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.5), transparent 70%)' }}
        />
      )}
      <div
        className="relative w-full h-full rounded-[15px] flex items-center justify-center font-semibold text-white"
        style={{
          background: `linear-gradient(135deg, ${tint} 0%, ${tint}cc 100%)`,
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -6px 10px rgba(0,0,0,0.35), 0 6px 16px rgba(0,0,0,0.4)',
          fontSize: small ? 16 : 20,
        }}
      >
        <span className="relative z-[1]">{initials}</span>
        <span
          aria-hidden
          className="absolute inset-0 rounded-[15px] opacity-60"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 45%)',
          }}
        />
      </div>
    </div>
  );
}
