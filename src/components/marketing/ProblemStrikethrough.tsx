'use client';

import { Reveal, RevealItem } from './shared/Reveal';

const REPLACED = [
  'Phone calls to book',
  'Instagram DMs',
  'Paper appointment books',
  'No-shows with no reminder',
  'Marketplaces taking 20% commission',
  'Facebook Messenger bookings',
  'No app of your own',
];

export function ProblemStrikethrough() {
  return (
    <section className="relative py-28 md:py-40">
      <Reveal className="mx-auto max-w-4xl px-6 text-center" stagger={0.08} amount={0.25}>
        <RevealItem>
          <span className="eyebrow text-paper/55">What you are replacing</span>
        </RevealItem>
        <RevealItem>
          <h2 className="mt-5 display text-[clamp(36px,6vw,68px)] text-paper">
            The <em>old way</em> of running bookings.
          </h2>
        </RevealItem>
        <RevealItem>
          <p className="mx-auto mt-5 max-w-xl text-[16px] leading-[1.6] text-paper/60">
            If any of these are still running your diary, you&apos;re leaving revenue, time, and
            customers on the table.
          </p>
        </RevealItem>

        <RevealItem>
          <ul className="mt-12 flex flex-wrap justify-center gap-3">
            {REPLACED.map((label, i) => (
              <li
                key={i}
                className="group inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.02] px-4 py-2 text-[14px] text-paper/45 transition-colors hover:text-paper/80 hover:border-gold/40"
              >
                <span className="relative inline-block">
                  <span className="line-through decoration-[1.5px] decoration-paper/30 group-hover:decoration-gold/90 transition-colors">
                    {label}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </RevealItem>
      </Reveal>
    </section>
  );
}
