'use client';

import { Reveal, RevealItem } from './shared/Reveal';

export function BuiltInIreland() {
  return (
    <section className="relative py-32 md:py-44 border-t border-white/[0.04]">
      <Reveal className="mx-auto max-w-2xl px-6 text-center" stagger={0.1}>
        <RevealItem>
          <span className="eyebrow text-gold">Built in Ireland</span>
        </RevealItem>
        <RevealItem>
          <h2 className="mt-6 display text-[clamp(30px,4.6vw,52px)] text-paper leading-[1.05]">
            For the businesses <em>on your street.</em>
          </h2>
        </RevealItem>

        <RevealItem>
          <p className="mt-9 text-[17px] leading-[1.75] text-paper/70">
            OpenBook was not designed in a startup lab. It was built because booking a session at a
            local gym or salon in 2026 should not require Instagram DMs, phone calls, or a
            marketplace taking a cut of every transaction.
          </p>
        </RevealItem>

        <RevealItem>
          <p className="mt-6 text-[17px] leading-[1.75] text-paper/70">
            The first businesses on OpenBook are real: a performance gym in Dublin, a sauna on the
            Cork harbour, a nail studio on Grafton Street, a barber shop in Galway. Every feature
            exists because one of them asked for it.
          </p>
        </RevealItem>

        <RevealItem>
          <p className="mt-6 text-[17px] leading-[1.75] text-paper/70">
            We ship weekly. We answer every email. And we don&apos;t take a cut of your revenue —
            because this is your business, not our marketplace.
          </p>
        </RevealItem>

        <RevealItem>
          <a
            href="https://www.openbook.ie"
            className="mt-10 inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.22em] uppercase text-gold hover:text-gold-light transition-colors"
          >
            See it running on openbook.ie
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </RevealItem>
      </Reveal>
    </section>
  );
}
