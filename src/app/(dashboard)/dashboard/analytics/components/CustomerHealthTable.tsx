'use client';

import { useMemo, useState } from 'react';
import { Users, ArrowUpDown } from 'lucide-react';
import { formatCompactEuro } from '@/lib/analytics/summary';
import type { CustomerHealth, HealthStatus } from '@/lib/analytics/computeHealthScore';
import { CustomerHealthDrawer } from './CustomerHealthDrawer';
import { StatusChip } from './StatusChip';

type SortKey = 'status' | 'lastSeen' | 'ltv' | 'bookings';

type Props = {
  scores: CustomerHealth[];
  hasEnoughData: boolean;
};

const STATUS_ORDER: Record<HealthStatus, number> = {
  'At Risk': 0,
  Cooling: 1,
  Thriving: 2,
  Steady: 3,
  Lost: 4,
};

export function CustomerHealthTable({ scores, hasEnoughData }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('status');
  const [selected, setSelected] = useState<CustomerHealth | null>(null);

  const sorted = useMemo(() => {
    const arr = [...scores];
    switch (sortKey) {
      case 'status':
        arr.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
        break;
      case 'lastSeen':
        arr.sort((a, b) => a.daysSinceLastVisit - b.daysSinceLastVisit);
        break;
      case 'ltv':
        arr.sort((a, b) => b.ltvCents - a.ltvCents);
        break;
      case 'bookings':
        arr.sort((a, b) => b.lifetimeBookings - a.lifetimeBookings);
        break;
    }
    return arr.slice(0, 30);
  }, [scores, sortKey]);

  const counts = useMemo(() => {
    const c: Record<HealthStatus, number> = {
      Thriving: 0,
      Steady: 0,
      Cooling: 0,
      'At Risk': 0,
      Lost: 0,
    };
    for (const s of scores) c[s.status] += 1;
    return c;
  }, [scores]);

  return (
    <section className="rounded-2xl border border-line bg-[#0f1115] shadow-premium overflow-hidden">
      <header className="px-6 py-5 border-b border-line">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-gold" />
              <span className="font-mono text-[10.5px] tracking-[0.24em] uppercase text-gold">
                Customer health
              </span>
            </div>
            <h2 className="mt-2 font-display text-[22px] text-paper leading-tight tracking-tight">
              Who&apos;s about to churn.
            </h2>
          </div>
          <SortToggle value={sortKey} onChange={setSortKey} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(Object.keys(counts) as HealthStatus[]).map((st) => (
            <StatusPill key={st} status={st} count={counts[st]} />
          ))}
        </div>
      </header>

      {scores.length === 0 ? (
        <div className="px-6 py-10 text-[13px] text-paper/55">
          {hasEnoughData
            ? 'No customer records yet.'
            : "We'll score your customer health once you have 2 weeks of bookings. In the meantime, share your booking link on Instagram — every new booking feeds the model."}
        </div>
      ) : (
        <div className="max-h-[420px] overflow-y-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-[#0f1115]/95 backdrop-blur-sm">
              <tr className="font-mono text-[10px] tracking-[0.2em] uppercase text-paper/40">
                <th className="px-6 py-3 font-normal">Customer</th>
                <th className="px-2 py-3 font-normal">Status</th>
                <th className="px-2 py-3 font-normal text-right">Last</th>
                <th className="px-2 py-3 font-normal text-right">Visits</th>
                <th className="px-6 py-3 font-normal text-right">LTV</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <Row
                  key={row.customer.id}
                  row={row}
                  onClick={() => setSelected(row)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CustomerHealthDrawer
        row={selected}
        onClose={() => setSelected(null)}
      />
    </section>
  );
}

function Row({
  row,
  onClick,
}: {
  row: CustomerHealth;
  onClick: () => void;
}) {
  const lastLabel =
    row.daysSinceLastVisit >= 999
      ? 'never'
      : row.daysSinceLastVisit === 0
        ? 'today'
        : `${row.daysSinceLastVisit}d ago`;

  return (
    <tr
      onClick={onClick}
      className="border-t border-line cursor-pointer hover:bg-white/[0.02] transition-colors duration-150 ease-premium"
    >
      <td className="px-6 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={row.customer.name} />
          <div className="min-w-0">
            <div className="truncate text-[13.5px] text-paper">
              {row.customer.name || 'Customer'}
            </div>
            <div className="text-[11px] text-paper/45">
              {row.customer.email || row.customer.phone || '—'}
            </div>
          </div>
        </div>
      </td>
      <td className="px-2 py-3">
        <StatusChip status={row.status} />
      </td>
      <td className="px-2 py-3 text-right font-mono text-[12px] text-paper/80 tabular-nums">
        {lastLabel}
      </td>
      <td className="px-2 py-3 text-right font-mono text-[12px] text-paper/80 tabular-nums">
        {row.lifetimeBookings}
      </td>
      <td className="px-6 py-3 text-right font-mono text-[12px] text-paper tabular-nums">
        {formatCompactEuro(row.ltvCents)}
      </td>
    </tr>
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
    <div className="h-8 w-8 shrink-0 rounded-full border border-gold-300 bg-gold-100 text-gold font-mono text-[10.5px] font-semibold inline-flex items-center justify-center">
      {initials}
    </div>
  );
}

function StatusPill({
  status,
  count,
}: {
  status: HealthStatus;
  count: number;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-line bg-white/[0.02] px-3 py-1">
      <StatusChip status={status} />
      <span className="font-mono text-[11px] text-paper/75 tabular-nums">
        {count}
      </span>
    </div>
  );
}

function SortToggle({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (v: SortKey) => void;
}) {
  const options: { value: SortKey; label: string }[] = [
    { value: 'status', label: 'Risk' },
    { value: 'lastSeen', label: 'Last seen' },
    { value: 'ltv', label: 'LTV' },
    { value: 'bookings', label: 'Visits' },
  ];
  return (
    <div className="hidden sm:inline-flex items-center gap-1 rounded-full border border-line bg-white/[0.02] p-1">
      <ArrowUpDown className="h-3 w-3 text-paper/40 mx-2" />
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-full px-3 py-1 text-[11.5px] font-mono tracking-wide transition-colors duration-150 ease-premium ${
            value === opt.value
              ? 'bg-gold-100 border border-gold-300 text-gold'
              : 'text-paper/60 hover:text-paper'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
