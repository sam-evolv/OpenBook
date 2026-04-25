'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Download, UserPlus, Users } from 'lucide-react';
import { Card } from '../Card';
import { TopBar } from '../TopBar';
import { Button } from '../Button';
import { Metric } from '../Metric';
import { Avatar } from '../Avatar';
import { StatusPill } from '../StatusPill';
import { EmptyState } from '../EmptyState';
import { FavouritesCallout } from './FavouritesCallout';
import { WinBackCallout } from './WinBackCallout';
import { CustomerFilters, type CohortFilter } from './CustomerFilters';
import { CustomerDrawer, type BookingHistoryEntry } from './CustomerDrawer';
import type {
  CustomerRow,
  CustomersPayload,
} from '@/lib/dashboard-v2/customers-queries';
import { formatPrice } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export interface CustomersClientProps {
  payload: CustomersPayload;
  cohort: CohortFilter;
  q: string;
  businessSlug: string;
  /**
   * For the real page, CustomerDrawer fetches booking history via a
   * server action. For the preview, we inject a static map here.
   */
  previewHistory?: Record<string, BookingHistoryEntry[]>;
  previewMode?: boolean;
  /** Preview-only: when set, client ignores URL and filters locally. */
  initialDraft?: string;
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const ts = new Date(iso).getTime();
  // last_booking_at can sit in the future when a customer has an upcoming
  // appointment — abs the diff so the column never shows a minus sign.
  const diffMs = Math.abs(Date.now() - ts);
  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IE', { month: 'short', day: 'numeric' });
}

function cohortTone(c: CustomerRow['cohort']): 'success' | 'info' | 'warning' | 'danger' {
  switch (c) {
    case 'regular':
      return 'success';
    case 'new':
      return 'info';
    case 'slipping':
      return 'warning';
    case 'churned':
      return 'danger';
  }
}

export function CustomersClient({
  payload,
  cohort,
  q,
  businessSlug,
  previewHistory,
  previewMode,
}: CustomersClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [searchDraft, setSearchDraft] = useState(q);
  const [previewCohort, setPreviewCohort] = useState<CohortFilter>(cohort);
  const [previewQ, setPreviewQ] = useState(q);
  const [selected, setSelected] = useState<CustomerRow | null>(null);
  const [favOverride, setFavOverride] = useState<Record<string, boolean>>({});

  const effectiveCohort = previewMode ? previewCohort : cohort;
  const effectiveQ = previewMode ? previewQ : q;

  const pushFilter = (patch: { cohort?: CohortFilter; q?: string }) => {
    if (previewMode) {
      if (patch.cohort) setPreviewCohort(patch.cohort);
      if (patch.q !== undefined) setPreviewQ(patch.q);
      return;
    }
    const params = new URLSearchParams();
    const nextCohort = patch.cohort ?? effectiveCohort;
    const nextQ = patch.q ?? effectiveQ;
    if (nextCohort !== 'all') params.set('cohort', nextCohort);
    if (nextQ) params.set('q', nextQ);
    startTransition(() => {
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    });
  };

  const commitSearch = () => {
    if (searchDraft === effectiveQ) return;
    pushFilter({ q: searchDraft });
  };

  const withFavOverride = useMemo<CustomerRow[]>(
    () =>
      payload.customers.map((c) =>
        c.id in favOverride ? { ...c, favourited: favOverride[c.id]! } : c,
      ),
    [payload.customers, favOverride],
  );

  const filtered = useMemo(() => {
    const needle = effectiveQ.trim().toLowerCase();
    return withFavOverride.filter((c) => {
      if (effectiveCohort === 'favourites' && !c.favourited) return false;
      if (
        effectiveCohort !== 'all' &&
        effectiveCohort !== 'favourites' &&
        c.cohort !== effectiveCohort
      ) {
        return false;
      }
      if (needle) {
        const name = c.display_name.toLowerCase();
        const phone = c.phone?.toLowerCase() ?? '';
        const email = c.email?.toLowerCase() ?? '';
        if (!name.includes(needle) && !phone.includes(needle) && !email.includes(needle)) {
          return false;
        }
      }
      return true;
    });
  }, [withFavOverride, effectiveCohort, effectiveQ]);

  // Recompute counts accounting for client-side fav overrides.
  const counts: Record<CohortFilter, number> = useMemo(() => {
    const base = {
      all: withFavOverride.length,
      favourites: withFavOverride.filter((c) => c.favourited).length,
      new: 0,
      regular: 0,
      slipping: 0,
      churned: 0,
    };
    for (const c of withFavOverride) base[c.cohort]++;
    return base;
  }, [withFavOverride]);

  const slippingLtv = useMemo(
    () =>
      withFavOverride
        .filter((c) => c.cohort === 'slipping')
        .reduce((s, c) => s + c.lifetime_value_cents, 0),
    [withFavOverride],
  );

  const drawerHistory: BookingHistoryEntry[] = selected
    ? (previewHistory?.[selected.id] ?? [])
    : [];

  return (
    <>
      <TopBar
        title="Customers"
        subtitle="Your people. Their history. What makes them tick."
        actions={
          <>
            <Button
              variant="ghost"
              size="md"
              icon={<Download size={13} strokeWidth={2} />}
              disabled
              title="CSV export coming in the next cycle"
            >
              Export
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={<UserPlus size={13} strokeWidth={2} />}
              disabled
              title="Quick-add customer lives on Calendar → New booking for now"
            >
              Add customer
            </Button>
          </>
        }
      />

      <div className="mx-auto max-w-6xl px-8 py-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Metric
            label="Total customers"
            value={payload.totalCustomers}
            deltaLabel="vs last period"
          />
          <Metric
            label="Favourites"
            value={counts.favourites}
            accent
            deltaLabel="vs last period"
          />
          <Metric
            label="On packages"
            value={payload.onPackages}
            deltaLabel="Wired in Phase 4"
          />
          <Metric
            label="Avg lifetime value"
            prefix="€"
            value={Math.round(payload.avgLifetimeValueCents / 100).toLocaleString()}
            deltaLabel="vs last period"
          />
        </div>

        <FavouritesCallout count={counts.favourites} />
        <WinBackCallout slippingCount={counts.slipping} potentialLtvCents={slippingLtv} />

        {payload.totalCustomers === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers yet"
            description="When someone books through your business page, WhatsApp bot, or AI assistants, they'll show up here with full history and LTV."
            action={
              <a
                href={`https://openbook.ie/${businessSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] font-semibold text-gold hover:underline"
              >
                openbook.ie/{businessSlug} →
              </a>
            }
          />
        ) : (
          <>
            <CustomerFilters
              active={effectiveCohort}
              counts={counts}
              onChange={(next) => pushFilter({ cohort: next })}
              searchDraft={searchDraft}
              onSearchChange={setSearchDraft}
              onSearchCommit={commitSearch}
            />

            {filtered.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No matches"
                description="Nobody in this cohort matches the current search. Try clearing the search or switching the filter."
              />
            ) : (
              <Card padding="none">
                <div className="grid grid-cols-[1.5fr_1fr_0.7fr_1fr_1fr_auto] gap-3 px-5 py-2.5 border-b border-paper-border dark:border-ink-border text-[10.5px] font-semibold uppercase tracking-[0.3px] text-paper-text-3 dark:text-ink-text-3">
                  <div>Customer</div>
                  <div>Status</div>
                  <div className="text-right">Bookings</div>
                  <div className="text-right">LTV</div>
                  <div>Last booking</div>
                  <div>Package</div>
                </div>
                <ul className="divide-y divide-paper-border dark:divide-ink-border">
                  {filtered.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(c)}
                        className={cn(
                          'grid grid-cols-[1.5fr_1fr_0.7fr_1fr_1fr_auto] gap-3 w-full items-center px-5 py-3 text-left',
                          'hover:bg-paper-surface2 dark:hover:bg-ink-surface2 transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-inset',
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar name={c.display_name} size="sm" favourited={c.favourited} />
                          <div className="min-w-0">
                            <div className="text-[13px] font-medium text-paper-text-1 dark:text-ink-text-1 truncate">
                              {c.display_name}
                            </div>
                            {c.notes && (
                              <div className="text-[11px] text-paper-text-3 dark:text-ink-text-3 truncate">
                                {c.notes}
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <StatusPill status={cohortTone(c.cohort)}>{c.cohort}</StatusPill>
                        </div>
                        <div className="text-[13px] text-paper-text-1 dark:text-ink-text-1 text-right tabular-nums">
                          {c.booking_count}
                        </div>
                        <div className="text-[13px] font-semibold text-paper-text-1 dark:text-ink-text-1 text-right tabular-nums">
                          {formatPrice(c.lifetime_value_cents)}
                        </div>
                        <div className="text-[12.5px] text-paper-text-2 dark:text-ink-text-2">
                          {timeAgo(c.last_booking_at)}
                        </div>
                        <div className="text-[12px] text-paper-text-3 dark:text-ink-text-3">
                          —
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </>
        )}
      </div>

      <CustomerDrawer
        customer={selected}
        history={drawerHistory}
        open={selected !== null}
        onClose={() => setSelected(null)}
        previewMode={previewMode}
        onFavouriteChange={(id, next) =>
          setFavOverride((prev) => ({ ...prev, [id]: next }))
        }
      />
    </>
  );
}
