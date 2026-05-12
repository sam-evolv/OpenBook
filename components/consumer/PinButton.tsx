'use client';

/**
 * PinButton — App Store-style "+" pill that pins a business to the
 * caller's home screen. Renders in the top-right corner of business
 * cards on Explore.
 *
 * Behaviour:
 *  - "+" before pin → ✓ On Home after pin
 *  - Optimistic state flip on tap; reverts on API error
 *  - On native Capacitor builds, fires FlyingIcon animation toward the
 *    bottom-tab Home icon. On web preview, just flips the pill (no dock
 *    target to fly to)
 *  - stopPropagation on click so taps don't open the underlying card
 *  - Disabled state once pinned: tapping does nothing (use long-press
 *    on the home screen to remove)
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Check } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { FlyingIcon } from './FlyingIcon';

type Props = {
  businessId: string;
  businessName: string;
  logoUrl: string | null;
  primaryColour?: string | null;
  initiallyPinned: boolean;
  /** Notify parent when the pin completes so it can update its pinnedIds set. */
  onPinned?: () => void;
};

type CapacitorBridge = { isNativePlatform?: () => boolean };

function detectNative(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as unknown as { Capacitor?: CapacitorBridge }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

export function PinButton({
  businessId,
  businessName,
  logoUrl,
  primaryColour,
  initiallyPinned,
  onPinned,
}: Props) {
  const [pinned, setPinned] = useState(initiallyPinned);
  const [flyingFrom, setFlyingFrom] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Portal target only available after client hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Reconcile if the parent's view of `initiallyPinned` shifts (e.g. a
  // server refetch after another card pinned this same business).
  useEffect(() => {
    setPinned(initiallyPinned);
  }, [initiallyPinned]);

  async function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (pinned) return;

    const rect = buttonRef.current?.getBoundingClientRect() ?? null;
    setPinned(true); // optimistic
    haptics.tap();

    const isNative = detectNative();
    if (isNative && rect) {
      // On native, the FlyingIcon animation provides the success beat.
      // It fires haptics.success() on transitionend.
      setFlyingFrom(rect);
    } else {
      // On web, no dock to fly to — fire success haptic immediately.
      haptics.success();
    }

    try {
      const res = await fetch('/api/home-pins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      });
      if (!res.ok) throw new Error(`pin failed: ${res.status}`);
      onPinned?.();
    } catch (err) {
      // Revert optimistic state on failure
      console.error('[pin-button] failed', err);
      setPinned(false);
      setFlyingFrom(null);
      haptics.error();
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        aria-label={pinned ? `${businessName} pinned to home` : `Pin ${businessName} to home`}
        aria-pressed={pinned}
        disabled={pinned}
        style={{
          height: 28,
          padding: pinned ? '0 10px' : '0 8px',
          minWidth: 28,
          borderRadius: 14,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          background: pinned ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.10)',
          border: pinned
            ? '0.5px solid rgba(212,175,55,0.65)'
            : '0.5px solid rgba(255,255,255,0.20)',
          color: pinned ? '#D4AF37' : 'rgba(255,255,255,0.95)',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '-0.005em',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          transition: 'all 200ms var(--ease-apple)',
          cursor: pinned ? 'default' : 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {pinned ? (
          <>
            <Check className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
            <span>On Home</span>
          </>
        ) : (
          <Plus className="h-4 w-4" strokeWidth={2.4} aria-hidden />
        )}
      </button>

      {mounted && flyingFrom &&
        createPortal(
          <FlyingIcon
            sourceRect={flyingFrom}
            logoUrl={logoUrl}
            primaryColour={primaryColour}
            businessName={businessName}
            onComplete={() => setFlyingFrom(null)}
          />,
          document.body,
        )}
    </>
  );
}
