'use client';

import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';
import { Reveal, RevealItem } from './shared/Reveal';

const STEPS = [
  {
    n: '01',
    title: 'Set up your page',
    desc: 'Add your services, hours and photos. Your booking page is live at openbook.ie/yourname in minutes.',
  },
  {
    n: '02',
    title: 'Pin it to home',
    desc: 'Send customers a link. They add your page to their iPhone home screen and get a real app icon.',
  },
  {
    n: '03',
    title: 'Take bookings',
    desc: 'Card payments settle to your Stripe account next day. Zero platform commission on Pro.',
  },
];

export function ThreeSteps() {
  return (
    <section className="relative py-28 md:py-40">
      <Reveal className="mx-auto max-w-4xl px-6 text-center" stagger={0.08}>
        <RevealItem>
          <span className="eyebrow text-paper/55">How it works</span>
        </RevealItem>
        <RevealItem>
          <h2 className="mt-5 display text-[clamp(34px,5.6vw,64px)] text-paper">
            Live in <em>three steps.</em>
          </h2>
        </RevealItem>
      </Reveal>

      <Reveal
        className="mx-auto mt-14 grid max-w-6xl grid-cols-1 md:grid-cols-3 gap-5 px-6"
        stagger={0.12}
        amount={0.2}
      >
        {STEPS.map((s, i) => (
          <RevealItem key={i}>
            <StepCard index={i} {...s} />
          </RevealItem>
        ))}
      </Reveal>
    </section>
  );
}

function StepCard({ n, title, desc, index }: { n: string; title: string; desc: string; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  return (
    <div
      ref={ref}
      className="group relative rounded-3xl border border-white/[0.06] bg-white/[0.015] p-7 overflow-hidden transition-colors"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
      />
      <div className="flex items-start justify-between">
        <span className="font-display text-[54px] leading-none text-gold">{n}</span>
        <span className="mt-2 font-mono text-[10px] tracking-[0.22em] uppercase text-paper/35">
          Step
        </span>
      </div>
      <h3 className="mt-8 font-display text-[26px] leading-tight text-paper">{title}</h3>
      <p className="mt-2 text-[14px] leading-[1.6] text-paper/60">{desc}</p>

      <div className="mt-8 h-36 rounded-2xl border border-white/[0.05] bg-black/40 overflow-hidden">
        {index === 0 && <SkeletonAssembling active={inView} />}
        {index === 1 && <PhoneIconPop active={inView} />}
        {index === 2 && <PaymentCheck active={inView} />}
      </div>
    </div>
  );
}

function SkeletonAssembling({ active }: { active: boolean }) {
  const reduce = useReducedMotion();
  const bars = [
    { w: '58%', h: 10 },
    { w: '90%', h: 6 },
    { w: '80%', h: 6 },
    { w: '40%', h: 6 },
  ];
  return (
    <div className="p-5 flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <motion.div
          className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold to-gold-dark"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={active ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
        />
        <motion.div
          className="h-3 rounded bg-white/10"
          style={{ width: '42%' }}
          initial={{ opacity: 0 }}
          animate={active ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.25 }}
        />
      </div>
      {bars.map((b, i) => (
        <motion.div
          key={i}
          className="rounded bg-white/10"
          style={{ width: b.w, height: b.h }}
          initial={{ opacity: 0, x: reduce ? 0 : -10 }}
          animate={active ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.55, delay: 0.35 + i * 0.12, ease: [0.2, 0.7, 0.2, 1] }}
        />
      ))}
      <motion.div
        className="mt-1 h-7 w-24 rounded-full bg-gold"
        initial={{ opacity: 0, y: reduce ? 0 : 6 }}
        animate={active ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.55, delay: 1.0 }}
      />
    </div>
  );
}

function PhoneIconPop({ active }: { active: boolean }) {
  return (
    <div className="h-full w-full p-5 flex items-center justify-center">
      <div className="relative w-24 h-40 rounded-[22px] border border-white/10 bg-gradient-to-b from-[#141414] to-[#0a0a0a] shadow-[0_10px_30px_rgba(0,0,0,0.6)] overflow-hidden">
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/20" />
        <div className="pt-6 px-3 grid grid-cols-3 gap-2">
          {[...Array(9)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={active ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.45, delay: 0.1 + i * 0.05 }}
              className={`aspect-square rounded-[7px] ${
                i === 4 ? 'bg-gold' : 'bg-white/10'
              }`}
              style={
                i === 4
                  ? { boxShadow: '0 0 20px rgba(212,175,55,0.6)' }
                  : undefined
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PaymentCheck({ active }: { active: boolean }) {
  return (
    <div className="h-full w-full p-5 flex flex-col justify-center gap-3">
      <div className="flex items-center justify-between text-[11px] font-mono text-paper/50 uppercase tracking-[0.18em]">
        <span>Evolv · 1-on-1</span>
        <span>€55.00</span>
      </div>
      <div className="h-10 rounded-lg border border-white/10 bg-black/50 flex items-center px-3 gap-2">
        <div className="w-6 h-4 rounded-sm bg-white/15" />
        <motion.div
          className="h-px bg-gold"
          initial={{ width: 0 }}
          animate={active ? { width: '100%' } : {}}
          transition={{ duration: 1.2, delay: 0.2, ease: [0.2, 0.7, 0.2, 1] }}
        />
        <motion.svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#D4AF37"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={active ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.45, delay: 1.3 }}
        >
          <path d="M5 12l4 4L19 7" />
        </motion.svg>
      </div>
      <div className="text-[11px] text-paper/45">Settles to your Stripe account next day.</div>
    </div>
  );
}
