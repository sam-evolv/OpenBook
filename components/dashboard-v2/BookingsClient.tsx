'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Search, Inbox } from 'lucide-react';
import { Card } from './Card';
import { TopBar } from './TopBar';
import { StatusPill } from './StatusPill';
import { Avatar } from './Avatar';
import { EmptyState } from './EmptyState';
import { BookingDetailDrawer } from './BookingDetailDrawer';
import { displayCustomerName } from '@/lib/dashboard-v2/customer';
import { formatPrice } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export type BookingRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  price_cents: number;
  notes: string | null;
  services: { name: string | null; duration_minutes: number | null } | null;
  customers: {
    full_name: string | null;
    name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
};

export type TabId = 'upcoming' | 'past' | 'cancelled' | 'all';
export type StatusFilter = 'all' | 'pending' | 'confirmed' | 'completed';

type Status = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'gold';
const STATUS_MAP: Record<BookingRow['status'], { status: Status; label: string }> = {
  confirmed: { status: 'success', label: 'Confirmed' },
  pending: { status: 'warning', label: 'Pending' },
  completed: { status: 'info', label: 'Completed' },
  cancelled: { status: 'danger', label: 'Cancelled' },
};

const TABS: { id: TabId; label: string }[] = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'all', label: 'All' },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
];

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-IE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export interface BookingsClientProps {
  bookings: BookingRow[];
  filters: { tab: TabId; q: string; status: StatusFilter };
  /**
   * When true, URL-sync is disabled (used by the public preview route).
   * Filters still work locally via component state.
   */
  previewMode?: boolean;
}

export function BookingsClient({ bookings, filters, previewMode = false }: BookingsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [searchDraft, setSearchDraft] = useState(filters.q);
  const [previewFilters, setPreviewFilters] = useState(filters);
  const [selected, setSelected] = useState<BookingRow | null>(null);

  const effective = previewMode ? previewFilters : filters;

  const pushFilter = (patch: Partial<typeof filters>) => {
    const next = { ...effective, ...patch };
    if (previewMode) {
      setPreviewFilters(next);
      return;
    }
    const params = new URLSearchParams();
    if (next.tab !== 'upcoming') params.set('tab', next.tab);
    if (next.q) params.set('q', next.q);
    if (next.status !== 'all') params.set('status', next.status);
    startTransition(() => {
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    });
  };

  const commitSearch = () => {
    if (searchDraft === effective.q) return;
    pushFilter({ q: searchDraft });
  };

  const displayed = useMemo(() => {
    if (!previewMode) return bookings;
    // preview-mode: filter locally
    const lower = previewFilters.q.trim().toLowerCase();
    return bookings.filter((b) => {
      if (previewFilters.tab === 'cancelled' && b.status !== 'cancelled') return false;
      if (previewFilters.tab !== 'cancelled' && previewFilters.tab !== 'all') {
        const starts = new Date(b.starts_at).getTime();
        const now = Date.now();
        if (previewFilters.tab === 'upcoming' && (starts < now || b.status === 'cancelled')) return false;
        if (previewFilters.tab === 'past' && (starts >= now || b.status === 'cancelled')) return false;
      }
      if (previewFilters.status !== 'all' && previewFilters.tab !== 'cancelled') {
        if (b.status !== previewFilters.status) return false;
      }
      if (lower) {
        const name = displayCustomerName(b.customers).toLowerCase();
        const email = b.customers?.email?.toLowerCase() ?? '';
        const svc = b.services?.name?.toLowerCase() ?? '';
        if (!name.includes(lower) && !email.includes(lower) && !svc.includes(lower)) return false;
      }
      return true;
    });
  }, [bookings, previewMode, previewFilters]);

  return (
    <>
      <TopBar title="Bookings" subtitle="Every booking customers have made" />

      <div className="mx-auto max-w-6xl px-8 py-6 space-y-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <nav className="flex gap-1 border-b border-paper-border dark:border-ink-border -mb-px">
            {TABS.map((t) => {
              const active = effective.tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pushFilter({ tab: t.id })}
                  className={cn(
                    'relative px-4 py-2.5 text-[13px] font-medium transition-colors',
                    active
                      ? 'text-paper-text-1 dark:text-ink-text-1'
                      : 'text-paper-text-3 dark:text-ink-text-3 hover:text-paper-text-1 dark:hover:text-ink-text-1',
                  )}
                >
                  {t.label}
                  {active && (
                    <span className="absolute left-0 right-0 -bottom-px h-0.5 rounded-t bg-gold" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-paper-text-3 dark:text-ink-text-3 pointer-events-none"
              />
              <input
                type="search"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onBlur={commitSearch}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitSearch();
                  }
                }}
                placeholder="Search customer, email, service…"
                className="h-8 w-64 rounded-md border border-paper-border dark:border-ink-border bg-paper-surface dark:bg-ink-surface pl-8 pr-3 text-[12.5px] text-paper-text-1 dark:text-ink-text-1 placeholder:text-paper-text-3 dark:placeholder:text-ink-text-3 outline-none focus:ring-2 focus:ring-gold focus:border-gold"
              />
            </div>
            <select
              value={effective.status}
              disabled={effective.tab === 'cancelled'}
              onChange={(e) => pushFilter({ status: e.target.value as StatusFilter })}
              className="h-8 rounded-md border border-paper-border dark:border-ink-border bg-paper-surface dark:bg-ink-surface px-2 text-[12.5px] text-paper-text-1 dark:text-ink-text-1 outline-none focus:ring-2 focus:ring-gold focus:border-gold disabled:opacity-40"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {displayed.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No bookings to show"
            description={
              effective.q || effective.status !== 'all'
                ? 'No bookings match the current filters. Try clearing the search or changing the status filter.'
                : effective.tab === 'upcoming'
                  ? "When customers book through your business page, WhatsApp bot, or AI assistants, they'll show up here."
                  : 'Nothing here yet.'
            }
          />
        ) : (
          <Card padding="none">
            <div className="grid grid-cols-[1fr_1fr_1fr_100px_100px] gap-3 px-5 py-2.5 border-b border-paper-border dark:border-ink-border text-[10.5px] font-semibold uppercase tracking-[0.3px] text-paper-text-3 dark:text-ink-text-3">
              <div>Customer</div>
              <div>Service</div>
              <div>When</div>
              <div className="text-right">Amount</div>
              <div>Status</div>
            </div>
            <ul
              className={cn(
                'divide-y divide-paper-border dark:divide-ink-border',
                isPending && 'opacity-60 pointer-events-none',
              )}
            >
              {displayed.map((b) => {
                const customerName = displayCustomerName(b.customers);
                const statusConfig = STATUS_MAP[b.status];
                return (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(b)}
                      className="grid grid-cols-[1fr_1fr_1fr_100px_100px] gap-3 w-full items-center px-5 py-3.5 text-left hover:bg-paper-surface2 dark:hover:bg-ink-surface2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-inset"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar name={customerName} size="sm" />
                        <div className="min-w-0">
                          <div className="text-[13px] font-medium text-paper-text-1 dark:text-ink-text-1 truncate">
                            {customerName}
                          </div>
                          {b.customers?.email && (
                            <div className="text-[11px] text-paper-text-3 dark:text-ink-text-3 truncate">
                              {b.customers.email}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-[12.5px] text-paper-text-2 dark:text-ink-text-2 truncate">
                        {b.services?.name ?? '—'}
                      </div>
                      <div className="text-[12.5px] text-paper-text-2 dark:text-ink-text-2 tabular-nums truncate">
                        {formatWhen(b.starts_at)}
                      </div>
                      <div className="text-[13px] font-semibold text-paper-text-1 dark:text-ink-text-1 tabular-nums text-right">
                        {b.price_cents === 0 ? (
                          <span className="text-paper-text-3 dark:text-ink-text-3 font-normal">Free</span>
                        ) : (
                          formatPrice(b.price_cents)
                        )}
                      </div>
                      <div>
                        <StatusPill status={statusConfig.status} dot>
                          {statusConfig.label}
                        </StatusPill>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>

      <BookingDetailDrawer
        booking={selected}
        open={selected !== null}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
