'use client';

import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { Reveal, RevealItem } from './shared/Reveal';

const BOOKINGS = [
  { initials: 'AM', name: 'Aoife Murphy', service: '1-on-1 PT · Evolv', time: '08:30', status: 'Paid', tint: '#D4AF37' },
  { initials: 'CO', name: "Cillian O'Brien", service: 'Sports massage · 60m', time: '09:45', status: 'Paid', tint: '#4F46E5' },
  { initials: 'NR', name: 'Niamh Ryan', service: 'Gel manicure', time: '11:15', status: 'Reminder', tint: '#DB2777' },
  { initials: 'TS', name: 'Tadhg Sheridan', service: 'Skin fade', time: '13:00', status: 'Paid', tint: '#111827' },
  { initials: 'SK', name: 'Síofra Kelly', service: 'Yoga · Vinyasa flow', time: '18:00', status: 'New', tint: '#0F766E' },
];

export function DashboardPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-20, 20]);

  return (
    <section
      ref={ref}
      id="dashboard"
      className="relative py-28 md:py-40 border-t border-white/[0.04] overflow-hidden"
    >
      <Reveal className="mx-auto max-w-4xl px-6 text-center" stagger={0.08}>
        <RevealItem>
          <span className="eyebrow text-paper/55">For the business</span>
        </RevealItem>
        <RevealItem>
          <h2 className="mt-5 display text-[clamp(34px,5.6vw,64px)] text-paper">
            A dashboard you&apos;ll actually <em>want to open.</em>
          </h2>
        </RevealItem>
        <RevealItem>
          <p className="mx-auto mt-5 max-w-xl text-[16px] leading-[1.6] text-paper/60">
            Your day at a glance. Revenue, bookings, no-show rate. An AI nudge when there&apos;s money
            on the table.
          </p>
        </RevealItem>
      </Reveal>

      <div className="relative mx-auto mt-20 max-w-6xl px-6">
        {/* gold glow underneath */}
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[40%] w-[70%] h-[70%] rounded-full blur-[90px] opacity-40"
          style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.35), transparent 60%)' }}
        />

        <motion.div style={{ y }} className="relative">
          <div className="tilt-3d">
            <BrowserChrome>
              <DashboardMock />
            </BrowserChrome>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function BrowserChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[20px] border border-white/[0.08] bg-[#0c0c0c] shadow-[0_60px_160px_rgba(0,0,0,0.7)] overflow-hidden">
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]/90" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]/90" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]/90" />
        </div>
        <div className="mx-auto flex items-center gap-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] px-3 py-1 text-[11px] text-paper/55 font-mono">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 018 0v4" />
          </svg>
          app.openbook.ie/dashboard
        </div>
        <span className="w-[56px]" />
      </div>
      {children}
    </div>
  );
}

function DashboardMock() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] min-h-[520px]">
      {/* sidebar */}
      <aside className="hidden md:flex flex-col gap-1 p-4 border-r border-white/[0.05] bg-black/40">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="w-7 h-7 rounded-lg bg-gold text-ink font-display text-sm font-semibold flex items-center justify-center">
            E
          </div>
          <div>
            <div className="text-[13px] text-paper font-medium">Evolv Performance</div>
            <div className="text-[11px] text-paper/45">Dublin 4</div>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-0.5">
          {[
            { l: 'Today', active: true },
            { l: 'Bookings' },
            { l: 'Customers' },
            { l: 'Services' },
            { l: 'Payments' },
            { l: 'Flash sales' },
            { l: 'Insights' },
            { l: 'Settings' },
          ].map((x, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12.5px] ${
                x.active ? 'bg-white/[0.06] text-paper' : 'text-paper/55'
              }`}
            >
              <span className={`w-1 h-1 rounded-full ${x.active ? 'bg-gold' : 'bg-white/20'}`} />
              {x.l}
            </div>
          ))}
        </div>
      </aside>

      {/* main */}
      <div className="p-6 bg-[#0a0a0a]">
        <div className="flex items-end justify-between">
          <div>
            <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-paper/40">
              Friday · 18 April 2026
            </div>
            <h3 className="mt-1 font-display text-[26px] text-paper leading-tight">
              Today&apos;s schedule
            </h3>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <button className="rounded-full border border-white/[0.08] px-3 py-1.5 text-[12px] text-paper/70">
              Share page
            </button>
            <button className="rounded-full bg-gold text-ink px-3 py-1.5 text-[12px] font-semibold">
              + Booking
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <StatCard label="Bookings today" value="14" trend="+3 vs last Fri" tone="neutral" />
          <StatCard label="Revenue this week" value="€2,340" trend="+18% w/w" tone="pos" />
          <StatCard label="No-show rate" value="2.1%" trend="−4 pts m/m" tone="pos" />
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-4">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <div className="text-[13px] text-paper">Bookings</div>
              <div className="text-[11px] text-paper/40 font-mono tracking-[0.15em] uppercase">Live</div>
            </div>
            <ul>
              {BOOKINGS.map((b, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] last:border-b-0"
                >
                  <div
                    className="w-8 h-8 rounded-full text-[11px] font-semibold text-white flex items-center justify-center shrink-0"
                    style={{ background: `linear-gradient(135deg, ${b.tint}, ${b.tint}cc)` }}
                  >
                    {b.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-paper truncate">{b.name}</div>
                    <div className="text-[11.5px] text-paper/50 truncate">{b.service}</div>
                  </div>
                  <div className="text-[12px] text-paper/80 font-mono">{b.time}</div>
                  <StatusPill status={b.status} />
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-gold/30 bg-gradient-to-b from-gold/[0.08] to-transparent p-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gold/20 border border-gold/40 flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2">
                  <path d="M12 2l2.5 5 5.5.8-4 4 1 5.5L12 15l-5 2.3 1-5.5-4-4 5.5-.8L12 2z" />
                </svg>
              </div>
              <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-gold">
                AI insight
              </span>
            </div>
            <p className="mt-3 text-[13px] leading-[1.5] text-paper">
              You have <span className="text-gold">3 empty slots</span> Friday afternoon. A flash
              sale at 15% off typically fills 2 of 3.
            </p>
            <button className="mt-4 w-full rounded-full bg-gold text-ink text-[12px] font-semibold py-2">
              Launch flash sale
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  trend,
  tone,
}: {
  label: string;
  value: string;
  trend: string;
  tone: 'pos' | 'neutral';
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="text-[11px] font-mono tracking-[0.18em] uppercase text-paper/40">{label}</div>
      <div className="mt-1 font-display text-[26px] text-paper">{value}</div>
      <div
        className={`mt-0.5 text-[11.5px] ${tone === 'pos' ? 'text-gold' : 'text-paper/50'}`}
      >
        {trend}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; ring: string; fg: string }> = {
    Paid: { bg: 'rgba(212,175,55,0.12)', ring: 'rgba(212,175,55,0.35)', fg: '#D4AF37' },
    Reminder: { bg: 'rgba(255,255,255,0.04)', ring: 'rgba(255,255,255,0.14)', fg: 'rgba(240,240,240,0.8)' },
    New: { bg: 'rgba(255,255,255,0.06)', ring: 'rgba(255,255,255,0.2)', fg: '#fff' },
  };
  const tone = map[status] ?? map.New;
  return (
    <span
      className="shrink-0 hidden sm:inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-mono tracking-[0.1em] uppercase"
      style={{ background: tone.bg, border: `1px solid ${tone.ring}`, color: tone.fg }}
    >
      {status}
    </span>
  );
}
