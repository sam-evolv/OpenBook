'use client';

/**
 * HomePinnedTiles — interactive pinned-businesses portion of the home
 * springboard. Split out of HomeTileGrid so the static system tiles
 * (Discover / Wallet / Me / Ask AI) can render synchronously while the
 * pinned-business grid streams in via Suspense.
 *
 * Long-press a pin → TilePeek opens with the management menu (View /
 * Book / Notifications toggle / Share / Remove).
 */

import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import {
  ArrowRight,
  Bell,
  BellRing,
  Building2,
  CalendarPlus,
  ChevronRight,
  Share2,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { Tile } from '@/components/Tile';
import { TilePeek, type TilePeekAction } from '@/components/TilePeek';
import { AlertSheet } from '@/components/consumer/AlertSheet';
import { PullToRefresh } from '@/components/PullToRefresh';
import { haptics } from '@/lib/haptics';
import type { HomePinWithBusiness } from '@/lib/home-pins';

const TILE_SIZE = 72;
const COLUMN_GAP = 16;
const ROW_GAP = 28;

export function HomePinnedTiles({ pins: initialPins }: { pins: HomePinWithBusiness[] }) {
  const router = useRouter();
  const [pins, setPins] = useState<HomePinWithBusiness[]>(initialPins);
  const [peekState, setPeekState] = useState<{
    pin: HomePinWithBusiness;
    rect: DOMRect;
  } | null>(null);
  const [alertSheetBusiness, setAlertSheetBusiness] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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
      navigator.share({ url, title: name }).catch(() => {});
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
        label: 'Set up alerts',
        icon: <BellRing className="h-[18px] w-[18px]" strokeWidth={1.8} />,
        trailingIcon: <ChevronRight className="h-[14px] w-[14px]" strokeWidth={2} />,
        onSelect: () => setAlertSheetBusiness({ id: business.id, name: business.name }),
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

  return (
    <PullToRefresh onRefresh={refresh}>
      {pins.length > 0 && (
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
      )}

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

      {alertSheetBusiness && (
        <AlertSheet
          business={alertSheetBusiness}
          onClose={() => setAlertSheetBusiness(null)}
          onSaved={() => {
            setAlertSheetBusiness(null);
            setToast("We'll let you know.");
            window.setTimeout(() => setToast(null), 3000);
          }}
        />
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: 'calc(env(safe-area-inset-bottom) + 92px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 200,
            padding: '12px 22px',
            borderRadius: 999,
            background: 'rgba(20,20,22,0.92)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '0.5px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.95)',
            fontSize: 14,
            fontWeight: 500,
            boxShadow: '0 18px 48px rgba(0,0,0,0.42)',
            animation: 'ob-toast-pop 240ms cubic-bezier(0.2, 0.9, 0.3, 1) both',
          }}
        >
          {toast}
        </div>
      )}

      <style jsx>{`
        @keyframes ob-toast-pop {
          0% { opacity: 0; transform: translate(-50%, 12px); }
          100% { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </PullToRefresh>
  );
}

function GridSlot({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', justifyContent: 'center' }}>{children}</div>;
}

function EmptyState() {
  return (
    <div className="mx-auto mt-2 max-w-[300px] rounded-[22px] p-4 text-center mat-glass-thin animate-reveal-up">
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

export function HomePinnedTilesSkeleton() {
  return (
    <div
      aria-hidden
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
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            width: TILE_SIZE,
            height: TILE_SIZE + 28,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <div
            style={{
              width: TILE_SIZE,
              height: TILE_SIZE,
              borderRadius: Math.round(TILE_SIZE * 0.25),
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.025) 100%)',
              border: '0.5px solid rgba(255,255,255,0.06)',
              animation: 'ob-pulse 1.4s ease-in-out infinite',
            }}
          />
          <div
            style={{
              width: 36,
              height: 8,
              borderRadius: 4,
              background: 'rgba(255,255,255,0.06)',
              animation: 'ob-pulse 1.4s ease-in-out infinite',
            }}
          />
        </div>
      ))}
      <style>{`
        @keyframes ob-pulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
