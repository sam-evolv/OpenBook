'use client';

/**
 * HomeTileGrid — the iPhone springboard for the consumer home. Renders
 * the four fixed system tiles (Discover / Wallet / Me / Ask AI) on the
 * top row, then the customer's pinned businesses below, ordered by
 * pinned_at DESC.
 *
 * Long-press a pinned business → TilePeek opens with the management
 * menu (View / Book / Notifications toggle / Share / Remove).
 *
 * Empty state (zero pins) shows a gentle prompt linking to Explore;
 * the system tiles carry the screen until the customer adds a pin.
 */

import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import {
  ArrowRight,
  Bell,
  Building2,
  CalendarPlus,
  Share2,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { Tile } from '@/components/Tile';
import { TilePeek, type TilePeekAction } from '@/components/TilePeek';
import { SystemAppIcon } from '@/components/consumer/SystemAppIcon';
import { PullToRefresh } from '@/components/PullToRefresh';
import { haptics } from '@/lib/haptics';
import type { HomePinWithBusiness } from '@/lib/home-pins';

const TILE_SIZE = 72;
const COLUMN_GAP = 16;
const ROW_GAP = 28;

export function HomeTileGrid({ pins: initialPins }: { pins: HomePinWithBusiness[] }) {
  const router = useRouter();
  const [pins, setPins] = useState<HomePinWithBusiness[]>(initialPins);
  const [peekState, setPeekState] = useState<{
    pin: HomePinWithBusiness;
    rect: DOMRect;
  } | null>(null);

  async function refresh() {
    router.refresh();
    await new Promise((r) => setTimeout(r, 400));
  }

  function navigate(href: string, rect?: DOMRect) {
    const run = () => router.push(href);
    if (rect && typeof document !== 'undefined' && 'startViewTransition' in document) {
      (document as unknown as { startViewTransition: (cb: () => void) => void })
        .startViewTransition(run);
    } else {
      run();
    }
  }

  async function patchNotifications(businessId: string, value: boolean) {
    setPins((curr) =>
      curr.map((p) =>
        p.business_id === businessId
          ? { ...p, notifications_enabled: value }
          : p,
      ),
    );
    try {
      const res = await fetch(`/api/home-pins/${businessId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications_enabled: value }),
      });
      if (!res.ok) throw new Error('patch failed');
    } catch (err) {
      console.error('[home-pins PATCH] failed', err);
      // Revert
      setPins((curr) =>
        curr.map((p) =>
          p.business_id === businessId
            ? { ...p, notifications_enabled: !value }
            : p,
        ),
      );
      haptics.error();
    }
  }

  async function removePin(businessId: string) {
    haptics.warning();
    const previous = pins;
    setPins((curr) => curr.filter((p) => p.business_id !== businessId));
    try {
      const res = await fetch(`/api/home-pins/${businessId}`, {
        method: 'DELETE',
      });
      if (!res.ok && res.status !== 204) throw new Error('delete failed');
    } catch (err) {
      console.error('[home-pins DELETE] failed', err);
      setPins(previous);
      haptics.error();
    }
  }

  function shareBusiness(slug: string, name: string) {
    const url = `https://openbook.ie/${slug}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ url, title: name }).catch(() => {
        // User dismissed the share sheet — not an error.
      });
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => undefined);
      haptics.tap();
    }
  }

  function buildActions(pin: HomePinWithBusiness): TilePeekAction[] {
    const { business } = pin;
    return [
      {
        kind: 'action',
        label: 'View Business',
        icon: <Building2 className="h-[18px] w-[18px]" strokeWidth={1.8} />,
        onSelect: () => navigate(`/business/${business.slug}`),
      },
      {
        kind: 'action',
        label: 'Book a Service',
        icon: <CalendarPlus className="h-[18px] w-[18px]" strokeWidth={1.8} />,
        // MVP: route to the business page. Bottom-sheet quick-book is
        // deferred to a follow-up PR.
        onSelect: () => navigate(`/business/${business.slug}`),
      },
      {
        kind: 'toggle',
        label: 'Notifications',
        icon: <Bell className="h-[18px] w-[18px]" strokeWidth={1.8} />,
        value: pin.notifications_enabled,
        onChange: (next) => patchNotifications(business.id, next),
      },
      {
        kind: 'action',
        label: 'Share Business',
        icon: <Share2 className="h-[18px] w-[18px]" strokeWidth={1.8} />,
        onSelect: () => shareBusiness(business.slug, business.name),
      },
      {
        kind: 'action',
        label: 'Remove from Home',
        icon: <Trash2 className="h-[18px] w-[18px]" strokeWidth={1.8} />,
        destructive: true,
        onSelect: () => removePin(business.id),
      },
    ];
  }

  const systemTiles: { kind: 'discover' | 'wallet' | 'me' | 'assistant'; key: string }[] = [
    { kind: 'discover', key: 'discover' },
    { kind: 'wallet', key: 'wallet' },
    { kind: 'me', key: 'me' },
    { kind: 'assistant', key: 'assistant' },
  ];

  return (
    <PullToRefresh onRefresh={refresh}>
      <div
        className="mx-auto"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(4, ${TILE_SIZE}px)`,
          columnGap: COLUMN_GAP,
          rowGap: ROW_GAP,
          width: 'max-content',
          maxWidth: '100%',
          justifyContent: 'center',
        }}
      >
        {systemTiles.map(({ kind, key }) => (
          <GridSlot key={key}>
            <SystemAppIcon kind={kind} size={TILE_SIZE} />
          </GridSlot>
        ))}

        {pins.map((pin, i) => {
          const { business } = pin;
          return (
            <GridSlot key={pin.business_id}>
              <Tile
                name={business.name}
                colour={business.primary_colour}
                logoUrl={business.processed_icon_url ?? business.logo_url ?? null}
                logoIsProcessedIcon={Boolean(business.processed_icon_url)}
                size={TILE_SIZE}
                animationDelay={(i + 4) * 30}
                viewTransitionName={`tile-${business.slug}`}
                onTap={(rect) => navigate(`/business/${business.slug}`, rect)}
                onLongPress={(rect) => setPeekState({ pin, rect })}
              />
            </GridSlot>
          );
        })}
      </div>

      {pins.length === 0 && <EmptyState />}

      {peekState && (
        <TilePeek
          anchorRect={peekState.rect}
          name={peekState.pin.business.name}
          colour={peekState.pin.business.primary_colour}
          logoUrl={
            peekState.pin.business.processed_icon_url ??
            peekState.pin.business.logo_url ??
            null
          }
          logoIsProcessedIcon={Boolean(peekState.pin.business.processed_icon_url)}
          subtitle={peekState.pin.business.category ?? undefined}
          actions={buildActions(peekState.pin)}
          onClose={() => setPeekState(null)}
        />
      )}
    </PullToRefresh>
  );
}

function GridSlot({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', justifyContent: 'center' }}>{children}</div>;
}

function EmptyState() {
  return (
    <div className="mx-auto mt-10 max-w-[300px] rounded-[22px] p-4 text-center mat-glass-thin animate-reveal-up">
      <p className="text-[14px] font-semibold text-white/90">
        Your home screen is yours to curate.
      </p>
      <p className="mt-1 text-[12.5px] leading-snug text-white/50">
        Tap the + on any business in Explore and it lands here.
      </p>
      <Link
        href="/explore"
        className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#D4AF37] active:scale-95"
      >
        Find a place you love
        <ArrowRight className="h-[14px] w-[14px]" strokeWidth={2.2} aria-hidden />
      </Link>
    </div>
  );
}
