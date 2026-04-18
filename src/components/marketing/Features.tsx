'use client';

import { Reveal, RevealItem } from './shared/Reveal';

type Feature = {
  title: string;
  desc: string;
  flagship?: boolean;
  Icon: () => JSX.Element;
};

const strokeProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
};

const FEATURES: Feature[] = [
  {
    title: 'Smart scheduling',
    desc: 'Buffers, breaks, multi-staff rotas, recurring classes. It just understands your business.',
    Icon: () => (
      <svg width="22" height="22" {...strokeProps}>
        <rect x="3.5" y="5" width="17" height="15" rx="2" />
        <path d="M3.5 10h17" />
        <path d="M8 3v4M16 3v4" />
        <path d="M8 14h3v3H8z" fill="currentColor" fillOpacity="0.6" stroke="none" />
      </svg>
    ),
  },
  {
    title: 'Card payments',
    desc: 'Stripe-powered, settled next day to your account. 2% on Growth, zero on Pro.',
    Icon: () => (
      <svg width="22" height="22" {...strokeProps}>
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 10h18" />
        <path d="M7 15h3" />
      </svg>
    ),
  },
  {
    title: 'Automated reminders',
    desc: 'Email the night before, SMS the morning of. Measured 42% drop in no-shows.',
    Icon: () => (
      <svg width="22" height="22" {...strokeProps}>
        <path d="M18 16V10a6 6 0 10-12 0v6l-1.5 2.5h15L18 16z" />
        <path d="M10 20a2 2 0 004 0" />
      </svg>
    ),
  },
  {
    title: 'Your booking page',
    desc: 'A premium, conversion-tuned page at openbook.ie/yourname. Bring your own domain too.',
    Icon: () => (
      <svg width="22" height="22" {...strokeProps}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 8h18" />
        <circle cx="6" cy="6" r="0.6" fill="currentColor" stroke="none" />
        <path d="M7 12h10M7 15h7" />
      </svg>
    ),
  },
  {
    title: 'Consumer app icon',
    desc: 'Your business lives as a real icon on your customer\'s home screen. Two-tap rebooking.',
    Icon: () => (
      <svg width="22" height="22" {...strokeProps}>
        <rect x="6" y="2.5" width="12" height="19" rx="3" />
        <path d="M10 5h4" />
        <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" fillOpacity="0.5" stroke="none" />
      </svg>
    ),
  },
  {
    title: 'Flash sales',
    desc: 'Fill empty Friday 3pm with one tap. Push to every customer on your waiting list.',
    Icon: () => (
      <svg width="22" height="22" {...strokeProps}>
        <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
      </svg>
    ),
  },
  {
    flagship: true,
    title: 'AI distribution',
    desc: 'Be found when a customer asks ChatGPT, Claude or Gemini to book a service near them.',
    Icon: () => (
      <svg width="22" height="22" {...strokeProps}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M3.5 12h17M12 3.5c2.5 3 2.5 14 0 17M12 3.5c-2.5 3-2.5 14 0 17" />
      </svg>
    ),
  },
  {
    title: 'WhatsApp bookings',
    desc: 'Customers message your number. An AI bot confirms, takes payment and adds it to your calendar.',
    Icon: () => (
      <svg width="22" height="22" {...strokeProps}>
        <path d="M4 20l1.4-4.1A8 8 0 1116 20a8 8 0 01-4.3-1.2L4 20z" />
        <path d="M9 10c0 3 2 5 5 5l1.5-1.5-2-1-1 1c-1 0-2-1-2-2l1-1-1-2L9 10z" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    title: 'AI business insights',
    desc: 'Every Monday: what sold, what\'s slow, what to price change. One paragraph, actionable.',
    Icon: () => (
      <svg width="22" height="22" {...strokeProps}>
        <path d="M4 20V4" />
        <path d="M4 20h16" />
        <path d="M7 16l3-5 3 2 5-7" />
        <circle cx="18" cy="6" r="1.3" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    title: 'Packages & credits',
    desc: 'Sell 10-session blocks, monthly memberships, intro offers. Auto-deducted on booking.',
    Icon: () => (
      <svg width="22" height="22" {...strokeProps}>
        <path d="M3 8l9-4 9 4-9 4-9-4z" />
        <path d="M3 12l9 4 9-4" />
        <path d="M3 16l9 4 9-4" />
      </svg>
    ),
  },
  {
    title: 'Reviews',
    desc: 'Verified from real bookings. Show up on your page and in AI answers.',
    Icon: () => (
      <svg width="22" height="22" {...strokeProps}>
        <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1.1 6.1L12 17l-5.5 2.9 1.1-6.1L3.2 9.5l6.1-0.9L12 3z" />
      </svg>
    ),
  },
  {
    title: 'Waitlist',
    desc: 'Someone cancels, your waitlist is notified in order. Slot filled automatically.',
    Icon: () => (
      <svg width="22" height="22" {...strokeProps}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
  },
];

export function Features() {
  return (
    <section id="features" className="relative py-28 md:py-40 border-t border-white/[0.04]">
      <Reveal className="mx-auto max-w-4xl px-6 text-center" stagger={0.08}>
        <RevealItem>
          <span className="eyebrow text-paper/55">Everything in the box</span>
        </RevealItem>
        <RevealItem>
          <h2 className="mt-5 display text-[clamp(34px,5.6vw,64px)] text-paper">
            Everything you need <em>to run bookings.</em>
          </h2>
        </RevealItem>
        <RevealItem>
          <p className="mx-auto mt-5 max-w-xl text-[16px] leading-[1.6] text-paper/60">
            One platform. Every part tuned for local service businesses. Nothing bolted on, nothing
            missing.
          </p>
        </RevealItem>
      </Reveal>

      <Reveal
        className="mx-auto mt-14 grid max-w-6xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 px-6"
        stagger={0.05}
        amount={0.1}
      >
        {FEATURES.map((f) => (
          <RevealItem key={f.title}>
            <FeatureCard {...f} />
          </RevealItem>
        ))}
      </Reveal>
    </section>
  );
}

function FeatureCard({ title, desc, flagship, Icon }: Feature) {
  return (
    <div
      className={`group relative h-full rounded-2xl p-6 transition-all duration-300 ${
        flagship
          ? 'border border-gold/40 bg-gradient-to-br from-gold/[0.08] via-gold/[0.02] to-transparent hover:border-gold/60'
          : 'border border-white/[0.06] bg-white/[0.015] hover:border-white/[0.14] hover:bg-white/[0.03]'
      }`}
    >
      {flagship && (
        <span className="absolute top-5 right-5 font-mono text-[9px] tracking-[0.25em] uppercase text-gold border border-gold/40 rounded-full px-2 py-0.5">
          Core
        </span>
      )}
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-[1.06] ${
          flagship
            ? 'bg-gold/15 text-gold border border-gold/30'
            : 'bg-white/[0.04] text-paper/90 border border-white/[0.08]'
        }`}
      >
        <Icon />
      </div>
      <h3 className="mt-5 text-[17px] font-semibold text-paper tracking-tight">{title}</h3>
      <p className="mt-1.5 text-[14px] leading-[1.55] text-paper/55">{desc}</p>
    </div>
  );
}
