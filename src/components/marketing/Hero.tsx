'use client';

import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { SIGNUP_URL } from './shared/appUrl';

const headlineLine1 = ['Your', 'booking', 'page,'];
const headlineLine2Before = ['live', 'in'];
const headlineTail = '15 minutes.';

const prompts = [
  {
    ai: 'ChatGPT',
    q: 'book me a sauna in dublin tonight',
    pos: 'top-[8%] left-[4%] bob-a',
    rotate: '-rotate-[4deg]',
  },
  {
    ai: 'Claude',
    q: 'find a barber open saturday in galway',
    pos: 'top-[14%] right-[4%] bob-b',
    rotate: 'rotate-[5deg]',
  },
  {
    ai: 'Gemini',
    q: 'cheapest personal training session cork',
    pos: 'bottom-[16%] left-[7%] bob-c',
    rotate: 'rotate-[3deg]',
  },
  {
    ai: 'ChatGPT',
    q: 'nail studio with availability tomorrow',
    pos: 'bottom-[10%] right-[6%] bob-d',
    rotate: '-rotate-[3deg]',
  },
];

export function Hero() {
  const reduce = useReducedMotion();

  const wordVariants: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 24 },
    show: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.75, delay: 0.1 + i * 0.06, ease: [0.2, 0.7, 0.2, 1] },
    }),
  };

  const fade: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 14 },
    show: (d: number = 0) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, delay: d, ease: [0.2, 0.7, 0.2, 1] },
    }),
  };

  return (
    <section className="relative overflow-hidden pt-28 md:pt-36 pb-24 md:pb-36">
      {/* grid backdrop */}
      <div aria-hidden className="absolute inset-0 grid-mask" />
      {/* radial gold glow */}
      <div aria-hidden className="absolute inset-0 gold-radial" />
      {/* scan line */}
      <div aria-hidden className="scan-line" />
      {/* vignette */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-40"
        style={{ background: 'linear-gradient(to bottom, transparent, #080808)' }}
      />

      {/* floating prompt cards (desktop only) */}
      <div aria-hidden className="pointer-events-none hidden lg:block absolute inset-0">
        {prompts.map((p, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.9 + i * 0.12, ease: [0.2, 0.7, 0.2, 1] }}
            className={`absolute ${p.pos} ${p.rotate}`}
          >
            <div className="glass rounded-2xl px-4 py-3 w-[260px] shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-paper/50">
                  {p.ai}
                </span>
              </div>
              <p className="mt-2 text-[13px] text-paper/85 leading-snug">
                &ldquo;{p.q}&rdquo;
              </p>
              <div className="mt-3 flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                <div className="w-5 h-5 rounded-md bg-gold/20 border border-gold/40 flex items-center justify-center">
                  <span className="text-gold text-[9px] font-bold">OB</span>
                </div>
                <span className="text-[11px] text-paper/70">OpenBook · answered</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="relative mx-auto max-w-6xl px-6 lg:px-10">
        <motion.div
          className="flex justify-center"
          variants={fade}
          initial="hidden"
          animate="show"
          custom={0}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/[0.06] px-3 py-1 font-mono text-[10px] tracking-[0.22em] uppercase text-gold">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inset-0 rounded-full bg-gold animate-gold-pulse" />
              <span className="relative rounded-full w-1.5 h-1.5 bg-gold" />
            </span>
            Now live · Ireland
          </span>
        </motion.div>

        <h1 className="mt-7 display text-center text-[clamp(44px,9vw,128px)] text-paper leading-[0.92]">
          <span className="block">
            {headlineLine1.map((w, i) => (
              <motion.span
                key={i}
                className="inline-block mr-[0.25em]"
                variants={wordVariants}
                initial="hidden"
                animate="show"
                custom={i}
              >
                {w}
              </motion.span>
            ))}
          </span>
          <span className="block mt-2">
            {headlineLine2Before.map((w, i) => (
              <motion.span
                key={i}
                className="inline-block mr-[0.25em]"
                variants={wordVariants}
                initial="hidden"
                animate="show"
                custom={headlineLine1.length + i}
              >
                {w}
              </motion.span>
            ))}
            <motion.em
              className="inline-block"
              variants={wordVariants}
              initial="hidden"
              animate="show"
              custom={headlineLine1.length + headlineLine2Before.length}
            >
              {headlineTail}
            </motion.em>
          </span>
        </h1>

        <motion.p
          className="mx-auto mt-8 max-w-2xl text-center text-[17px] md:text-[19px] leading-[1.55] text-paper/70"
          variants={fade}
          initial="hidden"
          animate="show"
          custom={0.9}
        >
          A premium booking page, your own icon on your customer&apos;s home screen, and zero
          commission on every booking you take.
        </motion.p>

        <motion.div
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
          variants={fade}
          initial="hidden"
          animate="show"
          custom={1.05}
        >
          <a href={SIGNUP_URL} className="btn-gold">
            Get your page live
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
          <a href="#consumer" className="btn-ghost">
            See the consumer app
          </a>
        </motion.div>

        <motion.div
          className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 font-mono text-[10px] tracking-[0.22em] uppercase text-paper/40"
          variants={fade}
          initial="hidden"
          animate="show"
          custom={1.2}
        >
          <span>Free to start</span>
          <span className="text-paper/20">·</span>
          <span>No credit card</span>
          <span className="text-paper/20">·</span>
          <span>15 min setup</span>
        </motion.div>

        <motion.div
          className="mt-20 md:mt-28 flex justify-center"
          variants={fade}
          initial="hidden"
          animate="show"
          custom={1.5}
        >
          <div className="flex flex-col items-center gap-2 text-paper/40">
            <span className="font-mono text-[10px] tracking-[0.22em] uppercase">Scroll</span>
            <motion.span
              aria-hidden
              className="block w-px h-10 bg-gradient-to-b from-gold/60 to-transparent"
              animate={reduce ? undefined : { scaleY: [0.6, 1, 0.6], originY: 0 }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
