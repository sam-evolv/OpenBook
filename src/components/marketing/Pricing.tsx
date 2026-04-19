'use client';

import { Reveal, RevealItem } from './shared/Reveal';
import { SIGNUP_URL } from './shared/appUrl';

type Tier = {
  name: string;
  price: string;
  priceNote?: string;
  tagline: string;
  cta: string;
  popular?: boolean;
  features: string[];
};

const TIERS: Tier[] = [
  {
    name: 'Free',
    price: '€0',
    priceNote: '/ month',
    tagline: 'Everything you need to test the waters.',
    cta: 'Start free',
    features: [
      'Booking page at openbook.ie/yourname',
      '2 services',
      'Email confirmations',
      'Basic dashboard',
    ],
  },
  {
    name: 'Growth',
    price: '€0',
    priceNote: '+ 2% on card payments',
    tagline: 'For busy businesses taking payments online.',
    cta: 'Start on Growth',
    popular: true,
    features: [
      'Unlimited services',
      'Stripe card payments',
      'Consumer app icon',
      'SMS + email reminders',
      'Waitlist & calendar sync',
      'Customer profiles',
    ],
  },
  {
    name: 'Pro',
    price: '€39',
    priceNote: '/ month · flat',
    tagline: 'Everything, no transaction fees, AI included.',
    cta: 'Go Pro',
    features: [
      'Everything in Growth',
      'Zero transaction fees',
      'WhatsApp booking bot',
      'AI business insights',
      'Flash sales',
      'AI distribution (ChatGPT / Claude / Gemini)',
      'Priority support',
    ],
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative py-28 md:py-40 border-t border-white/[0.04]">
      <Reveal className="mx-auto max-w-4xl px-6 text-center" stagger={0.08}>
        <RevealItem>
          <span className="eyebrow text-paper/55">Pricing</span>
        </RevealItem>
        <RevealItem>
          <h2 className="mt-5 display text-[clamp(34px,5.6vw,64px)] text-paper">
            One price. <em>Zero surprises.</em>
          </h2>
        </RevealItem>
        <RevealItem>
          <p className="mx-auto mt-5 max-w-xl text-[16px] leading-[1.6] text-paper/60">
            Pick a tier, run your business, keep almost all of your revenue. First month on any paid
            plan is free.
          </p>
        </RevealItem>
      </Reveal>

      <Reveal
        className="mx-auto mt-16 grid max-w-6xl grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5 px-6 items-stretch"
        stagger={0.1}
        amount={0.15}
      >
        {TIERS.map((t, i) => (
          <RevealItem
            key={t.name}
            className={t.popular ? 'lg:order-2' : i === 0 ? 'lg:order-1' : 'lg:order-3'}
          >
            <PricingCard tier={t} />
          </RevealItem>
        ))}
      </Reveal>

      <Reveal className="mx-auto mt-10 max-w-3xl px-6 text-center" stagger={0.05}>
        <RevealItem>
          <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-paper/50">
            Zero charges to end customers — ever.
          </div>
        </RevealItem>
        <RevealItem>
          <div className="mt-3 text-[13px] text-paper/45">
            First month on Pro is free. Cancel anytime. VAT where applicable.
          </div>
        </RevealItem>
      </Reveal>
    </section>
  );
}

function PricingCard({ tier }: { tier: Tier }) {
  const popular = tier.popular;
  return (
    <div
      className={`relative h-full rounded-3xl p-7 flex flex-col ${
        popular
          ? 'border border-gold/50 bg-[#0f0c04] gold-breath'
          : 'border border-white/[0.06] bg-white/[0.02]'
      }`}
    >
      {popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold text-ink px-3 py-1 text-[10px] font-mono tracking-[0.22em] uppercase font-semibold shadow-[0_6px_20px_rgba(212,175,55,0.45)]">
          Most popular
        </span>
      )}
      <div>
        <div className="flex items-center justify-between">
          <span className="font-display text-[22px] text-paper">{tier.name}</span>
          {popular && (
            <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-gold">
              Recommended
            </span>
          )}
        </div>
        <p className="mt-2 text-[13.5px] text-paper/55 min-h-[38px]">{tier.tagline}</p>
      </div>

      <div className="mt-5 pb-6 border-b border-white/[0.06]">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-[56px] leading-none text-paper">{tier.price}</span>
          <span className="text-[13px] text-paper/50">{tier.priceNote}</span>
        </div>
      </div>

      <ul className="mt-6 flex-1 flex flex-col gap-3">
        {tier.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[14px] text-paper/80">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={popular ? '#D4AF37' : '#888'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 shrink-0"
            >
              <path d="M5 12l4 4L19 7" />
            </svg>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <a
        href={SIGNUP_URL}
        className={`mt-8 w-full inline-flex items-center justify-center rounded-full py-3 text-[14px] font-semibold transition ${
          popular
            ? 'bg-gold text-ink hover:brightness-105'
            : 'border border-white/[0.12] text-paper hover:border-gold/40 hover:bg-white/[0.04]'
        }`}
      >
        {tier.cta}
      </a>
    </div>
  );
}
