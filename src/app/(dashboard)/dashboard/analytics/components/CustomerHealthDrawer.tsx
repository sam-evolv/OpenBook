'use client';

import { useEffect } from 'react';
import { X, MessageCircle, Phone, Mail } from 'lucide-react';
import { StatusChip } from './StatusChip';
import { formatEuro, percent } from '@/lib/analytics/summary';
import type { CustomerHealth } from '@/lib/analytics/computeHealthScore';

type Props = {
  row: CustomerHealth | null;
  onClose: () => void;
};

export function CustomerHealthDrawer({ row, onClose }: Props) {
  useEffect(() => {
    if (!row) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [row, onClose]);

  const open = row !== null;

  return (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-50 transition-opacity duration-200 ease-premium ${
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <aside
        role="dialog"
        aria-label="Customer details"
        className={`absolute right-0 top-0 h-full w-full sm:max-w-[460px] bg-[#0f1115] border-l border-line shadow-premium transition-transform duration-300 ease-premium ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {row && <DrawerContent row={row} onClose={onClose} />}
      </aside>
    </div>
  );
}

function DrawerContent({
  row,
  onClose,
}: {
  row: CustomerHealth;
  onClose: () => void;
}) {
  const lastSeen =
    row.daysSinceLastVisit >= 999
      ? 'Never booked'
      : row.daysSinceLastVisit === 0
        ? 'Today'
        : `${row.daysSinceLastVisit} days ago`;

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-6 py-4 border-b border-line">
        <div className="font-mono text-[10.5px] tracking-[0.24em] uppercase text-paper/45">
          Customer
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line text-paper/60 hover:text-paper hover:border-gold-400 transition-colors duration-200 ease-premium"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div>
          <h3 className="font-display text-[24px] text-paper leading-tight tracking-tight">
            {row.customer.name || 'Customer'}
          </h3>
          <div className="mt-2 flex items-center gap-2 text-[12.5px] text-paper/55 font-mono">
            {row.customer.email && (
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3 w-3" />
                {row.customer.email}
              </span>
            )}
            {row.customer.phone && (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="h-3 w-3" />
                {row.customer.phone}
              </span>
            )}
          </div>
          <div className="mt-4">
            <StatusChip status={row.status} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Metric
            label="Lifetime visits"
            value={String(row.lifetimeBookings)}
          />
          <Metric label="LTV" value={formatEuro(row.ltvCents)} />
          <Metric label="Last seen" value={lastSeen} />
          <Metric
            label="Cancel rate"
            value={percent(row.cancellationRate, 0)}
          />
          <Metric
            label="Recent pace"
            value={`${row.recentFrequencyDelta > 0 ? '+' : ''}${percent(row.recentFrequencyDelta, 0)}`}
          />
          <Metric label="Health score" value={`${row.score}/100`} />
        </div>

        <div>
          <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-paper/40">
            Last sentiment
          </div>
          <div className="mt-2 text-[13px] text-paper/80 capitalize">
            {row.lastSentiment === 'none' ? 'No review yet' : row.lastSentiment}
          </div>
        </div>
      </div>

      <footer className="px-6 py-4 border-t border-line bg-[#0b0d12]">
        <button
          type="button"
          disabled={row.status === 'Lost'}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#e8c547_0%,#b88a18_100%)] text-ink font-semibold py-3 text-[13.5px] shadow-gold-glow disabled:opacity-40 disabled:cursor-not-allowed transition-transform duration-200 ease-premium hover:-translate-y-0.5 active:translate-y-0"
        >
          <MessageCircle className="h-4 w-4" />
          Send re-engagement WhatsApp
        </button>
        <p className="mt-2 text-[11px] text-paper/40 text-center">
          Uses your WhatsApp Business template from Settings → Messaging.
        </p>
      </footer>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-white/[0.015] p-3">
      <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-paper/40">
        {label}
      </div>
      <div className="mt-1 text-[18px] text-paper font-display tabular-nums">
        {value}
      </div>
    </div>
  );
}
