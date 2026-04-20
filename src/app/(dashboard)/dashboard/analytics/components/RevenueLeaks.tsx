'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CreditCard } from 'lucide-react';
import { formatCompactEuro, formatEuro, percent } from '@/lib/analytics/summary';
import type { NoShowBreakdown } from '@/lib/analytics/computeNoShowCost';

type Props = {
  breakdown: NoShowBreakdown;
  hasEnoughData: boolean;
};

export function RevenueLeaks({ breakdown, hasEnoughData }: Props) {
  return (
    <section className="rounded-2xl border border-line bg-[#0f1115] shadow-premium overflow-hidden">
      <header className="flex items-center justify-between px-6 py-5 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-gold" />
            <span className="font-mono text-[10.5px] tracking-[0.24em] uppercase text-gold">
              Hidden revenue leaks
            </span>
          </div>
          <h2 className="mt-2 font-display text-[22px] text-paper leading-tight tracking-tight">
            What no-shows cost you this month.
          </h2>
        </div>
        <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 font-mono text-[10.5px] tracking-[0.18em] uppercase text-paper/55">
          <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
          Live
        </span>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-0">
        <div className="p-6 border-b lg:border-b-0 lg:border-r border-line">
          <NoShowClock lostCents={breakdown.monthLostCents} />
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat
              label="This month"
              value={String(breakdown.monthTotalCount)}
              caption="no-shows"
            />
            <Stat
              label="Share of missed"
              value={percent(breakdown.monthShareOfMissed, 0)}
              caption="vs cancellations"
            />
            <Stat
              label="Last 90 days"
              value={String(breakdown.ninetyDayCount)}
              caption="no-shows"
            />
            <Stat
              label="Repeat offenders"
              value={String(breakdown.offenders.length)}
              caption="customers"
            />
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Breakdown
              title="By day of week"
              rows={breakdown.byDayOfWeek
                .filter((d) => d.count > 0)
                .sort((a, b) => b.count - a.count)
                .slice(0, 4)
                .map((d) => ({ label: d.day, value: d.count }))}
            />
            <Breakdown
              title="By time of day"
              rows={breakdown.bySlot
                .filter((s) => s.count > 0)
                .sort((a, b) => b.count - a.count)
                .slice(0, 4)
                .map((s) => ({ label: s.label, value: s.count }))}
            />
          </div>

          <p className="mt-6 text-[12.5px] leading-[1.55] text-paper/55">
            Automated reminders + Stripe deposits reduce no-shows by up to{' '}
            <span className="text-gold">35%</span>. Enable deposits from{' '}
            <span className="text-paper/70">Settings → Payments</span>.
          </p>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-paper/45">
              Repeat offenders
            </div>
            <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-paper/30">
              {breakdown.offenders.length > 0 ? 'Last 90d' : ''}
            </div>
          </div>

          {breakdown.offenders.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-line p-5 text-[13px] text-paper/55">
              {hasEnoughData
                ? 'No repeat offenders — nice. Keep reminders on.'
                : "We'll flag repeat no-shows here once you have 2 weeks of bookings."}
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {breakdown.offenders.map((o) => (
                <li
                  key={o.customer.id}
                  className="flex items-center gap-3 py-3"
                >
                  <Avatar name={o.customer.name} />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-[13.5px] text-paper">
                      {o.customer.name || 'Customer'}
                    </div>
                    <div className="text-[11.5px] text-paper/45">
                      {o.count} no-shows · {formatEuro(o.lostCents)} lost
                    </div>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-full border border-gold-300 bg-gold-100 px-3 py-1.5 text-[11.5px] font-medium text-gold hover:bg-gold-200 transition-colors duration-200 ease-premium"
                  >
                    <CreditCard className="h-3 w-3" />
                    Deposit
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function NoShowClock({ lostCents }: { lostCents: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 1100;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(lostCents * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [lostCents]);

  return (
    <div>
      <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-paper/45">
        Lost this month
      </div>
      <div
        className="mt-2 font-display text-[clamp(40px,7vw,72px)] leading-[1] text-paper tabular-nums"
        aria-live="polite"
      >
        <span className="bg-clip-text text-transparent bg-[linear-gradient(135deg,#e8c547_0%,#b88a18_100%)]">
          {formatCompactEuro(display)}
        </span>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-white/[0.015] p-3">
      <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-paper/40">
        {label}
      </div>
      <div className="mt-1 font-display text-[20px] text-paper tabular-nums">
        {value}
      </div>
      <div className="text-[11px] text-paper/45">{caption}</div>
    </div>
  );
}

function Breakdown({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: number }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div>
      <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-paper/40">
        {title}
      </div>
      <div className="mt-3 space-y-2">
        {rows.length === 0 ? (
          <div className="text-[12px] text-paper/40">—</div>
        ) : (
          rows.map((r) => (
            <div key={r.label} className="flex items-center gap-3">
              <div className="w-28 shrink-0 text-[12px] text-paper/70">
                {r.label}
              </div>
              <div className="flex-1 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                <div
                  className="h-full bg-[linear-gradient(90deg,rgba(212,175,55,0.4),#D4AF37)]"
                  style={{ width: `${(r.value / max) * 100}%` }}
                />
              </div>
              <div className="w-6 text-right text-[12px] tabular-nums text-paper/80">
                {r.value}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = (name || '?')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div className="h-9 w-9 shrink-0 rounded-full border border-gold-300 bg-gold-100 text-gold font-mono text-[11px] font-semibold inline-flex items-center justify-center">
      {initials}
    </div>
  );
}
