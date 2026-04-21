'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Briefcase,
  Package,
  BookOpen,
  ShoppingBag,
  Plus,
  type LucideIcon,
} from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { TopBar } from './TopBar';
import { EmptyState } from './EmptyState';
import { StatusPill } from './StatusPill';
import { ServiceDrawer, type ServiceRow } from './ServiceDrawer';
import { formatPrice, formatDuration } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export type CatalogTabId = 'services' | 'packages' | 'classes' | 'inventory';

type ServiceBadge = 'top' | 'under' | null;

export interface CatalogClientProps {
  activeTab: CatalogTabId;
  services: ServiceRow[];
  bookingCounts: Record<string, number>;
  totalRecentBookings: number;
  previewMode?: boolean;
}

interface TabDef {
  id: CatalogTabId;
  label: string;
  icon: LucideIcon;
  live: boolean;
  count?: number;
  comingSoon?: { title: string; description: string };
}

function badgeFor(
  serviceId: string,
  counts: Record<string, number>,
  total: number,
): ServiceBadge {
  // Heuristics only kick in when there's enough data to be meaningful.
  if (total < 20) return null;

  const entries = Object.entries(counts);
  if (entries.length === 0) return null;
  const maxCount = Math.max(...entries.map(([, n]) => n));
  const myCount = counts[serviceId] ?? 0;

  if (myCount === maxCount && myCount >= 10) return 'top';
  if (myCount < 5 && maxCount >= 10) return 'under';
  return null;
}

export function CatalogClient({
  activeTab,
  services,
  bookingCounts,
  totalRecentBookings,
  previewMode = false,
}: CatalogClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [previewTab, setPreviewTab] = useState<CatalogTabId>(activeTab);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceRow | null>(null);

  const effectiveTab = previewMode ? previewTab : activeTab;

  const tabs: TabDef[] = [
    {
      id: 'services',
      label: 'Services',
      icon: Briefcase,
      live: true,
      count: services.length,
    },
    {
      id: 'packages',
      label: 'Packages',
      icon: Package,
      live: false,
      comingSoon: {
        title: 'Packages — coming soon',
        description:
          'Sell session bundles and memberships. Credits with expiry, auto-renewal via Stripe, customer-visible balances.',
      },
    },
    {
      id: 'classes',
      label: 'Classes',
      icon: BookOpen,
      live: false,
      comingSoon: {
        title: 'Classes — coming soon',
        description:
          'Multi-attendee bookings with waitlists. Set capacity, charge per seat, auto-fill from favourites when spots open.',
      },
    },
    {
      id: 'inventory',
      label: 'Retail',
      icon: ShoppingBag,
      live: false,
      comingSoon: {
        title: 'Retail — coming soon',
        description:
          'Stock items sold at checkout or standalone. Low-stock alerts, variants, and payout reconciliation.',
      },
    },
  ];

  const goToTab = (id: CatalogTabId) => {
    if (previewMode) {
      setPreviewTab(id);
      return;
    }
    const params = new URLSearchParams();
    if (id !== 'services') params.set('tab', id);
    startTransition(() => {
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    });
  };

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };
  const openEdit = (s: ServiceRow) => {
    setEditing(s);
    setDrawerOpen(true);
  };

  const newItemLabel =
    effectiveTab === 'services'
      ? 'New service'
      : effectiveTab === 'packages'
        ? 'New package'
        : effectiveTab === 'classes'
          ? 'New class'
          : 'New product';

  return (
    <>
      <TopBar
        title="Catalog"
        subtitle="Everything you sell — services, packages, classes, and products"
        actions={
          <Button
            variant="primary"
            size="md"
            icon={<Plus size={13} strokeWidth={2} />}
            onClick={effectiveTab === 'services' ? openCreate : undefined}
            disabled={effectiveTab !== 'services'}
          >
            {newItemLabel}
          </Button>
        }
      />

      <div className="mx-auto max-w-5xl px-8 py-6 space-y-6">
        <nav className="flex gap-1 border-b border-paper-border dark:border-ink-border -mb-px">
          {tabs.map((t) => {
            const active = effectiveTab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => goToTab(t.id)}
                className={cn(
                  'relative flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium transition-colors',
                  active
                    ? 'text-paper-text-1 dark:text-ink-text-1'
                    : 'text-paper-text-3 dark:text-ink-text-3 hover:text-paper-text-1 dark:hover:text-ink-text-1',
                )}
              >
                <Icon size={13} strokeWidth={active ? 2 : 1.75} />
                {t.label}
                {typeof t.count === 'number' && (
                  <span className="text-[11px] tabular-nums text-paper-text-3 dark:text-ink-text-3 bg-paper-surface2 dark:bg-ink-surface2 rounded px-1.5 py-0.5">
                    {t.count}
                  </span>
                )}
                {!t.live && (
                  <span className="text-[9.5px] font-semibold uppercase tracking-[0.3px] text-gold bg-gold-soft border border-gold-border rounded-[3px] px-1.5 py-0.5">
                    Soon
                  </span>
                )}
                {active && (
                  <span className="absolute left-0 right-0 -bottom-px h-0.5 rounded-t bg-gold" />
                )}
              </button>
            );
          })}
        </nav>

        {/*
          TODO (Phase 4 — Messages / MCP): restore the "Customers keep asking
          about X" AI insight card at the top of the Services tab. Source
          is the ai_queries table (see brief §5), which lands when the MCP
          server at mcp.openbook.ie starts writing to it. Until then, we
          have no signal to render.
        */}

        <div className={cn(isPending && 'opacity-60 pointer-events-none')}>
          {effectiveTab === 'services' ? (
            services.length === 0 ? (
              <EmptyState
                icon={Briefcase}
                title="No services yet"
                description="Services are the core of your catalog. A PT session, a haircut, a massage — whatever your customers book from you."
                action={
                  <Button variant="primary" icon={<Plus size={13} strokeWidth={2} />} onClick={openCreate}>
                    New service
                  </Button>
                }
              />
            ) : (
              <div className="flex flex-col gap-2.5">
                {services.map((s) => {
                  const count = bookingCounts[s.id] ?? 0;
                  const badge = badgeFor(s.id, bookingCounts, totalRecentBookings);
                  return (
                    <Card key={s.id} padding="sm">
                      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-6">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="text-[14px] font-semibold text-paper-text-1 dark:text-ink-text-1 truncate">
                              {s.name}
                            </div>
                            {badge === 'top' && <StatusPill status="gold">Top seller</StatusPill>}
                            {badge === 'under' && (
                              <StatusPill status="warning">Under-booked</StatusPill>
                            )}
                            {!s.is_active && <StatusPill status="neutral">Hidden</StatusPill>}
                          </div>
                          {s.description && (
                            <div className="mt-1 text-[12px] text-paper-text-3 dark:text-ink-text-3 truncate">
                              {s.description}
                            </div>
                          )}
                        </div>
                        <MetricCell label="Duration" value={formatDuration(s.duration_minutes)} />
                        <MetricCell
                          label="Price"
                          value={s.price_cents === 0 ? 'Free' : formatPrice(s.price_cents)}
                          accent={s.price_cents > 0}
                        />
                        <MetricCell label="30-day" value={`${count} ${count === 1 ? 'booking' : 'bookings'}`} />
                        <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>
                          Edit
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )
          ) : (
            (() => {
              const t = tabs.find((tb) => tb.id === effectiveTab)!;
              return (
                <EmptyState
                  icon={t.icon}
                  title={t.comingSoon!.title}
                  description={t.comingSoon!.description}
                />
              );
            })()
          )}
        </div>
      </div>

      <ServiceDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        service={editing}
        previewMode={previewMode}
      />
    </>
  );
}

function MetricCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="text-right min-w-[72px]">
      <div className="text-[10.5px] font-medium uppercase tracking-[0.3px] text-paper-text-3 dark:text-ink-text-3">
        {label}
      </div>
      <div
        className={cn(
          'mt-0.5 text-[13px] font-semibold tabular-nums',
          accent ? 'text-gold' : 'text-paper-text-1 dark:text-ink-text-1',
        )}
      >
        {value}
      </div>
    </div>
  );
}
