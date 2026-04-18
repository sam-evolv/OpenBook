'use client';

import { Reveal, RevealItem } from './shared/Reveal';
import { DEMO_URL, SIGNUP_URL } from './shared/appUrl';

export function FinalCTA() {
  return (
    <section className="relative py-36 md:py-52 border-t border-white/[0.04] overflow-hidden">
      <div aria-hidden className="absolute inset-0 grid-mask opacity-70" />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 70% at 50% 50%, rgba(212,175,55,0.18) 0%, rgba(8,8,8,0) 60%)',
        }}
      />

      <div className="hairline-x mx-auto max-w-5xl" />

      <Reveal className="relative mx-auto max-w-5xl px-6 text-center" stagger={0.1}>
        <RevealItem>
          <h2 className="mt-16 display text-[clamp(44px,9vw,128px)] leading-[0.95] text-paper">
            Be where the <em>bookings are.</em>
          </h2>
        </RevealItem>
        <RevealItem>
          <p className="mx-auto mt-8 max-w-xl text-[17px] leading-[1.6] text-paper/65">
            Set up your page, take your first booking, and let the AI era bring you customers you
            wouldn&apos;t have found otherwise.
          </p>
        </RevealItem>
        <RevealItem>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href={SIGNUP_URL} className="btn-gold">
              Get your page live
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <a href={DEMO_URL} className="btn-ghost">
              Book a 10-minute demo
            </a>
          </div>
        </RevealItem>
      </Reveal>

      <div className="hairline-x mx-auto max-w-5xl mt-24" />
    </section>
  );
}
