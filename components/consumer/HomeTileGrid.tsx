'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Tile } from '@/components/Tile';
import { TilePeek, type TilePeekAction } from '@/components/TilePeek';
import { SystemAppIcon } from '@/components/consumer/SystemAppIcon';
import { PullToRefresh } from '@/components/PullToRefresh';
import {
  getBusinessOpenness,
  type BusinessHourRow,
} from '@/lib/business-hours';
import type { Business } from '@/lib/supabase';

export interface HomeBusiness extends Business {
  business_hours?: BusinessHourRow[] | null;
  business_closures?: string[] | null;
}

export function HomeTileGrid({ businesses }: { businesses: HomeBusiness[] }) {
  const router = useRouter();

  async function refresh() {
    // router.refresh() re-runs the server component and refetches data.
    // Await a microtask so PullToRefresh's min-display-time still applies.
    router.refresh();
    await new Promise((r) => setTimeout(r, 400));
  }
  const [peekState, setPeekState] = useState<{
    business: HomeBusiness;
    rect: DOMRect;
  } | null>(null);

  function navigate(href: string, rect?: DOMRect) {
    const run = () => router.push(href);
    if (rect && typeof document !== 'undefined' && 'startViewTransition' in document) {
      (document as unknown as { startViewTransition: (cb: () => void) => void })
        .startViewTransition(run);
    } else {
      run();
    }
  }

  // Sort businesses alphabetically by name so the grid is predictable.
  // The DB query already orders by name, but resort defensively (and guard
  // against null names) in case upstream changes break that ordering.
  const sortedBusinesses = [...businesses].sort((a, b) =>
    (a.name ?? '').localeCompare(b.name ?? '', undefined, {
      sensitivity: 'base',
    })
  );

  return (
    <PullToRefresh onRefresh={refresh}>
      {/* iOS-style 4-column grid. We deliberately keep 4 cols at every
          width: the system + business tiles flow Discover → businesses →
          wallet → me with no empty cells in between. justify-items: center
          on each cell so the 72px tile sits centred without a wrapper div
          (a wrapper div was previously inserted only around <Tile>, making
          it the sole grid child with stretch alignment, while
          <SystemAppIcon> placed itself directly — that mismatch is what
          shifted Discover into a row of its own on some viewports). */}
      <div className="grid grid-cols-4 gap-x-4 gap-y-7 justify-items-center">
        <SystemAppIcon kind="discover" />
        {sortedBusinesses.map((b, i) => {
          const hours = b.business_hours ?? [];
          const openness = getBusinessOpenness(hours, b.business_closures ?? []);
          return (
            <Tile
              key={b.id}
              name={b.name}
              colour={b.primary_colour}
              logoUrl={b.processed_icon_url ?? b.logo_url ?? null}
              size={72}
              status={openness.status}
              animationDelay={i * 30}
              viewTransitionName={`tile-${b.slug}`}
              onTap={(rect) => navigate(`/business/${b.slug}`, rect)}
              onLongPress={(rect) => setPeekState({ business: b, rect })}
            />
          );
        })}
        <SystemAppIcon kind="wallet" />
        <SystemAppIcon kind="me" />
      </div>

      {peekState && (
        <PeekForBusiness
          business={peekState.business}
          rect={peekState.rect}
          onClose={() => setPeekState(null)}
          onNavigate={(href) => navigate(href)}
        />
      )}
    </PullToRefresh>
  );
}

function PeekForBusiness({
  business,
  rect,
  onClose,
  onNavigate,
}: {
  business: HomeBusiness;
  rect: DOMRect;
  onClose: () => void;
  onNavigate: (href: string) => void;
}) {
  const hours = business.business_hours ?? [];
  const openness = getBusinessOpenness(hours, business.business_closures ?? []);
  const subtitle = hours.length > 0
    ? openness.label
    : business.category ?? 'Tap to open';

  const actions: TilePeekAction[] = [
    {
      label: 'Book next available slot',
      onSelect: () => onNavigate(`/business/${business.slug}?tab=book`),
    },
    {
      label: 'View services',
      onSelect: () => onNavigate(`/business/${business.slug}?tab=book`),
    },
    {
      label: 'About this business',
      onSelect: () => onNavigate(`/business/${business.slug}?tab=about`),
    },
  ];

  return (
    <TilePeek
      anchorRect={rect}
      name={business.name}
      colour={business.primary_colour}
      logoUrl={business.processed_icon_url ?? business.logo_url ?? null}
      subtitle={subtitle}
      actions={actions}
      onClose={onClose}
    />
  );
}
