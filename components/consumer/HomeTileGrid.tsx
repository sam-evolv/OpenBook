'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Info, X } from 'lucide-react';
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
  const [showHint, setShowHint] = useState(false);

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

  useEffect(() => {
    if (sortedBusinesses.length === 0) return;
    if (window.localStorage.getItem('ob_home_hint_dismissed') === 'true') return;
    setShowHint(true);
  }, [sortedBusinesses.length]);

  function dismissHint() {
    window.localStorage.setItem('ob_home_hint_dismissed', 'true');
    setShowHint(false);
  }

  return (
    <PullToRefresh onRefresh={refresh}>
      {showHint && (
        <div className="mx-auto mb-5 flex max-w-[312px] items-start gap-2.5 rounded-[20px] px-3.5 py-3 mat-glass-thin animate-reveal-up">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#D4AF37]" strokeWidth={2} />
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-semibold leading-snug text-white/90">
              Tap a tile to book. Press and hold to peek.
            </p>
            <p className="mt-0.5 text-[11.5px] leading-snug text-white/45">
              Your favourite local businesses live here like apps.
            </p>
          </div>
          <button
            type="button"
            onClick={dismissHint}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-white/50 active:scale-95"
            aria-label="Dismiss home tip"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.2} />
          </button>
        </div>
      )}

      {/* iPhone Springboard layout. Tracks are a *fixed* 72 px — the
          iPhone icon size — rather than `1fr`, so the grid's intrinsic
          width is exactly four tiles + three column gaps. The page-
          level section already does `items-center justify-center`, so
          a content-sized grid is automatically centred horizontally
          and vertically inside the phone frame on every viewport. The
          `mx-auto` here is belt-and-braces in case a future parent
          changes its alignment. Inline styles ensure the 4-track
          declaration can't be overridden by Tailwind utilities. */}
      <div
        className="mx-auto"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 72px)',
          columnGap: 16,
          rowGap: 28,
          width: 'max-content',
          maxWidth: '100%',
          justifyContent: 'center',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <SystemAppIcon kind="discover" />
        </div>
        {sortedBusinesses.map((b, i) => {
          const hours = b.business_hours ?? [];
          const openness = getBusinessOpenness(hours, b.business_closures ?? []);
          return (
            <div
              key={b.id}
              style={{ display: 'flex', justifyContent: 'center' }}
            >
              <Tile
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
            </div>
          );
        })}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <SystemAppIcon kind="wallet" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <SystemAppIcon kind="me" />
        </div>
      </div>

      {sortedBusinesses.length === 0 && (
        <div className="mx-auto mt-8 max-w-[300px] rounded-[22px] p-4 text-center mat-glass-thin">
          <p className="text-[14px] font-semibold text-white/90">No live businesses yet</p>
          <p className="mt-1 text-[12.5px] leading-snug text-white/50">
            Explore is ready. As soon as a business goes live, its tile appears here.
          </p>
        </div>
      )}

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
