'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Reveal, RevealItem } from './shared/Reveal';

type Card = {
  name: string;
  tint: string;
  initials: string;
  meta: string;
  time: string;
  price: string;
};

type Demo = {
  ai: 'ChatGPT' | 'Claude' | 'Gemini';
  accent: string;
  dot: string;
  query: string;
  preamble: string;
  cards: Card[];
};

const DEMOS: Demo[] = [
  {
    ai: 'ChatGPT',
    accent: '#10a37f',
    dot: '#10a37f',
    query: 'book me a personal trainer in dublin tomorrow morning',
    preamble:
      "Here are three verified personal trainers in Dublin with open slots tomorrow morning, booking direct via OpenBook — no account required.",
    cards: [
      { name: 'Evolv Performance', tint: '#D4AF37', initials: 'EP', meta: 'D4 · 1-on-1 · €55', time: 'Tomorrow 07:00', price: '€55' },
      { name: 'Iron Gym Cork', tint: '#5C5C5C', initials: 'IG', meta: 'Dublin 2 · PT session', time: 'Tomorrow 08:30', price: '€60' },
      { name: 'Cork Physio & Sports', tint: '#3B82F6', initials: 'CP', meta: 'D6 · Strength & conditioning', time: 'Tomorrow 09:15', price: '€65' },
    ],
  },
  {
    ai: 'Claude',
    accent: '#D97757',
    dot: '#D97757',
    query: 'find a barber open saturday morning in galway',
    preamble:
      'Two OpenBook-listed barbers have Saturday morning availability in Galway city centre. Pick a time and book straight from here.',
    cards: [
      { name: 'Refresh Barber', tint: '#111827', initials: 'RB', meta: 'Shop St · Fade & beard · €25', time: 'Sat 09:30', price: '€25' },
      { name: 'Refresh Barber', tint: '#111827', initials: 'RB', meta: 'Shop St · Skin fade · €28', time: 'Sat 11:00', price: '€28' },
    ],
  },
  {
    ai: 'Gemini',
    accent: '#7B61FF',
    dot: '#4285F4',
    query: 'sauna in cork tonight for two people',
    preamble:
      'Saltwater Sauna Cork has two 60-minute private sessions remaining tonight. Both fit two people.',
    cards: [
      { name: 'Saltwater Sauna Cork', tint: '#0F766E', initials: 'SC', meta: 'Harbour · Private 60 min · 2 people', time: 'Tonight 19:00', price: '€45' },
      { name: 'Saltwater Sauna Cork', tint: '#0F766E', initials: 'SC', meta: 'Harbour · Private 60 min · 2 people', time: 'Tonight 20:30', price: '€45' },
    ],
  },
];

export function AIDistribution() {
  const [tab, setTab] = useState(0);
  const [typed, setTyped] = useState('');
  const [phase, setPhase] = useState<'type' | 'reply' | 'cards' | 'rest'>('type');
  const hoverRef = useRef(false);
  const mountedRef = useRef(true);
  const reduce = useReducedMotion();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const demo = DEMOS[tab];
    setTyped('');
    setPhase('type');

    const runType = async () => {
      if (reduce) {
        setTyped(demo.query);
        setPhase('reply');
        return;
      }
      for (let i = 0; i <= demo.query.length; i++) {
        if (cancelled || !mountedRef.current) return;
        setTyped(demo.query.slice(0, i));
        await new Promise((r) => setTimeout(r, 28 + Math.random() * 22));
      }
      setPhase('reply');
    };
    runType();
    return () => {
      cancelled = true;
    };
  }, [tab, reduce]);

  useEffect(() => {
    if (phase !== 'reply') return;
    const t1 = setTimeout(() => mountedRef.current && setPhase('cards'), reduce ? 120 : 900);
    const t2 = setTimeout(() => mountedRef.current && setPhase('rest'), reduce ? 240 : 1800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [phase, reduce]);

  useEffect(() => {
    if (phase !== 'rest') return;
    const id = setInterval(() => {
      if (hoverRef.current || !mountedRef.current) return;
      setTab((t) => (t + 1) % DEMOS.length);
    }, 6000);
    return () => clearInterval(id);
  }, [phase]);

  const demo = DEMOS[tab];

  return (
    <section id="ai" className="relative py-28 md:py-40 overflow-hidden">
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-20 -translate-x-1/2 w-[900px] h-[900px] rounded-full opacity-50 blur-3xl"
             style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.12), transparent 60%)' }} />
      </div>

      <Reveal className="relative mx-auto max-w-5xl px-6 text-center" stagger={0.08} amount={0.2}>
        <RevealItem>
          <span className="eyebrow text-gold">The OpenBook advantage</span>
        </RevealItem>
        <RevealItem>
          <h2 className="mt-5 display text-[clamp(34px,5.6vw,64px)] text-paper leading-[1]">
            When someone asks AI to book a service near them,
            <br className="hidden md:block" />{' '}
            <em>is your business the answer?</em>
          </h2>
        </RevealItem>
        <RevealItem>
          <p className="mx-auto mt-7 max-w-2xl text-[16px] md:text-[17px] leading-[1.65] text-paper/65">
            Every OpenBook business is discoverable by ChatGPT, Claude and Gemini through a live MCP
            server at{' '}
            <code className="font-mono text-paper/90 bg-white/[0.04] px-1.5 py-0.5 rounded">
              mcp.openbook.ie
            </code>
            . When a customer asks their assistant for a personal trainer in Dublin or a sauna in
            Cork tonight, yours is the answer. No other booking platform in Ireland does this.
          </p>
        </RevealItem>
      </Reveal>

      <Reveal className="relative mx-auto mt-16 max-w-4xl px-4 md:px-6" amount={0.1}>
        <RevealItem>
          <div
            onMouseEnter={() => (hoverRef.current = true)}
            onMouseLeave={() => (hoverRef.current = false)}
            className="relative rounded-[24px] border border-white/[0.08] bg-[#0c0c0c] shadow-[0_40px_120px_rgba(0,0,0,0.6)] overflow-hidden"
          >
            {/* chrome */}
            <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
              </div>
              <div className="mx-auto flex items-center gap-1 rounded-full bg-white/[0.04] border border-white/[0.06] px-3 py-1 text-[11px] text-paper/50 font-mono">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="11" width="16" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 018 0v4" />
                </svg>
                mcp.openbook.ie
              </div>
              <span className="w-[56px]" />
            </div>

            {/* tabs */}
            <div className="flex items-center gap-1 px-3 pt-3 border-b border-white/[0.06]">
              {DEMOS.map((d, i) => {
                const active = i === tab;
                return (
                  <button
                    key={d.ai}
                    onClick={() => setTab(i)}
                    className={`relative px-4 py-2.5 text-[12px] font-medium tracking-tight transition-colors ${
                      active ? 'text-paper' : 'text-paper/45 hover:text-paper/75'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: d.dot, boxShadow: active ? `0 0 10px ${d.dot}` : 'none' }}
                      />
                      {d.ai}
                    </span>
                    {active && (
                      <motion.span
                        layoutId="ai-tab"
                        className="absolute inset-x-0 -bottom-px h-[2px]"
                        style={{ background: demo.accent }}
                      />
                    )}
                  </button>
                );
              })}
              <div className="ml-auto font-mono text-[10px] tracking-[0.18em] uppercase text-paper/35 pr-2 hidden sm:block">
                Live demo · auto-cycle
              </div>
            </div>

            {/* conversation */}
            <div className="relative px-5 sm:px-8 py-8 min-h-[420px] bg-[#0a0a0a] no-scrollbar">
              {/* subtle tint overlay per AI */}
              <div
                aria-hidden
                className="absolute inset-0 pointer-events-none opacity-[0.05]"
                style={{ background: `radial-gradient(ellipse at top, ${demo.accent}, transparent 60%)` }}
              />

              {/* user bubble */}
              <div className="relative flex items-start gap-3">
                <div className="shrink-0 w-7 h-7 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-[11px] text-paper/70">
                  You
                </div>
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white/[0.04] px-4 py-2.5 border border-white/[0.05]">
                  <span className="text-[14px] text-paper/90 font-mono">
                    {typed}
                    {phase === 'type' && <span className="caret" aria-hidden />}
                  </span>
                </div>
              </div>

              {/* AI reply */}
              {phase !== 'type' && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
                  className="relative mt-6 flex items-start gap-3"
                >
                  <div
                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold"
                    style={{ background: `${demo.accent}22`, color: demo.accent, border: `1px solid ${demo.accent}55` }}
                  >
                    {demo.ai[0]}
                  </div>
                  <div className="flex-1">
                    <div className="text-[14px] text-paper/85 leading-[1.55]">
                      <StreamedText text={demo.preamble} play={phase !== 'type'} reduce={!!reduce} />
                    </div>

                    {(phase === 'cards' || phase === 'rest') && (
                      <ul className="mt-5 grid gap-3">
                        {demo.cards.map((c, i) => (
                          <motion.li
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.45, delay: i * 0.12, ease: [0.2, 0.7, 0.2, 1] }}
                          >
                            <button
                              className="w-full group flex items-center gap-4 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-left transition hover:border-gold/40 hover:bg-white/[0.04]"
                            >
                              <div
                                className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-[12px] font-semibold text-white"
                                style={{
                                  background: `linear-gradient(135deg, ${c.tint}, ${c.tint}cc)`,
                                  boxShadow: `0 4px 18px ${c.tint}55`,
                                }}
                              >
                                {c.initials}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-[14px] text-paper font-medium truncate">
                                    {c.name}
                                  </span>
                                  <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-paper/40 shrink-0 hidden sm:inline">
                                    OpenBook
                                  </span>
                                </div>
                                <div className="mt-0.5 text-[12px] text-paper/55 truncate">{c.meta}</div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-[13px] text-paper">{c.time}</div>
                                <div className="text-[12px] text-gold">{c.price}</div>
                              </div>
                              <svg
                                className="text-paper/30 group-hover:text-gold transition-colors"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                              >
                                <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                          </motion.li>
                        ))}
                      </ul>
                    )}

                    {phase === 'rest' && (
                      <div className="mt-5 font-mono text-[10px] tracking-[0.18em] uppercase text-paper/40">
                        Answered via mcp.openbook.ie · updated from live calendars
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </RevealItem>
      </Reveal>

      <Reveal className="mx-auto mt-10 max-w-4xl px-6" stagger={0.1}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          {[
            { t: 'One integration', s: 'Three assistants, plus the ones shipping next.' },
            { t: 'No extra work', s: 'If it\'s on your OpenBook calendar, it\'s discoverable.' },
            { t: 'Real-time', s: 'Slots sync in seconds. No stale availability.' },
          ].map((item, i) => (
            <RevealItem key={i}>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
                <div className="text-[13px] font-semibold text-paper">{item.t}</div>
                <div className="mt-1 text-[13px] text-paper/55 leading-[1.5]">{item.s}</div>
              </div>
            </RevealItem>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

function StreamedText({ text, play, reduce }: { text: string; play: boolean; reduce: boolean }) {
  const [shown, setShown] = useState(reduce ? text : '');
  useEffect(() => {
    if (reduce) {
      setShown(text);
      return;
    }
    if (!play) {
      setShown('');
      return;
    }
    let i = 0;
    setShown('');
    const id = setInterval(() => {
      i += 2;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 14);
    return () => clearInterval(id);
  }, [text, play, reduce]);
  return <>{shown}</>;
}
