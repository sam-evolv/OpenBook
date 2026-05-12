'use client';

/**
 * FlyingIcon — animates a copy of a business logo from a source rect
 * (e.g. the PinButton's bounding rect on an Explore card) to the
 * bottom-tab "Home" icon. Used to give the user a satisfying iPhone-
 * springboard "app drops into the dock" beat when they pin a business.
 *
 * Pure CSS transforms: zero framer-motion dep. The animation uses the
 * project-wide --ease-apple curve already in globals.css. Duration 420ms
 * matches the iOS "add to home screen" feel.
 *
 * On native (Capacitor WebView) the success haptic fires on
 * transitionend. On web preview there's no bottom-tab dock to fly to,
 * so callers should skip mounting this and just flip the button state —
 * see PinButton's `if (isNative) setFlyingFrom(...)` guard.
 */

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { haptics } from '@/lib/haptics';
import { getTileColour } from '@/lib/tile-palette';

type Props = {
  sourceRect: DOMRect;
  logoUrl: string | null;
  primaryColour?: string | null;
  businessName: string;
  onComplete: () => void;
};

const DURATION_MS = 420;
const TARGET_SELECTOR = '[aria-label="Home"]';

export function FlyingIcon({
  sourceRect,
  logoUrl,
  primaryColour,
  businessName,
  onComplete,
}: Props) {
  const [transform, setTransform] = useState('translate3d(0px, 0px, 0) scale(1)');
  const [opacity, setOpacity] = useState(1);
  const completedRef = useRef(false);

  useEffect(() => {
    const target = document.querySelector(TARGET_SELECTOR);
    if (!target) {
      // No dock target available (e.g. web preview rendered without a
      // BottomTabBar). Bail out immediately so the caller's state
      // settles. PinButton has a separate isNative guard that should
      // prevent this code path on web, but defend belt-and-braces.
      onComplete();
      return;
    }

    const targetRect = target.getBoundingClientRect();
    const sourceCenterX = sourceRect.left + sourceRect.width / 2;
    const sourceCenterY = sourceRect.top + sourceRect.height / 2;
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;
    const dx = targetCenterX - sourceCenterX;
    const dy = targetCenterY - sourceCenterY;

    // Two requestAnimationFrames so the browser commits the initial
    // styles before the transition target is applied — without this,
    // some WebKit builds skip the animation entirely.
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        setTransform(`translate3d(${dx}px, ${dy}px, 0) scale(0.45)`);
        setOpacity(0.85);
      });
      // store raf2 on the same handle so the cleanup can cancel both
      (raf1 as unknown as { _next?: number })._next = raf2;
    });

    // Fallback timer in case transitionend never fires (e.g. the page
    // navigated away mid-flight). 100ms grace beyond duration.
    const timeout = window.setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
    }, DURATION_MS + 100);

    return () => {
      cancelAnimationFrame(raf1);
      const next = (raf1 as unknown as { _next?: number })._next;
      if (next) cancelAnimationFrame(next);
      window.clearTimeout(timeout);
    };
  }, [sourceRect, onComplete]);

  function handleTransitionEnd(e: React.TransitionEvent) {
    if (e.propertyName !== 'transform') return;
    if (completedRef.current) return;
    completedRef.current = true;
    haptics.success();
    onComplete();
  }

  const tileColour = getTileColour(primaryColour ?? undefined).mid;
  const initial = businessName.slice(0, 1).toUpperCase();
  const radius = Math.round(sourceRect.width * 0.235);

  return (
    <div
      onTransitionEnd={handleTransitionEnd}
      style={{
        position: 'fixed',
        left: sourceRect.left,
        top: sourceRect.top,
        width: sourceRect.width,
        height: sourceRect.height,
        zIndex: 200,
        pointerEvents: 'none',
        willChange: 'transform, opacity',
        transform,
        opacity,
        transition: `transform ${DURATION_MS}ms var(--ease-apple), opacity ${DURATION_MS}ms var(--ease-apple)`,
        borderRadius: radius,
        overflow: 'hidden',
        background: tileColour,
        boxShadow:
          '0 4px 14px rgba(0,0,0,0.35), 0 12px 28px rgba(0,0,0,0.45)',
      }}
      aria-hidden
    >
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt=""
          fill
          sizes={`${Math.round(sourceRect.width)}px`}
          style={{ objectFit: 'cover' }}
          unoptimized
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.95)',
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontSize: Math.round(sourceRect.width * 0.4),
            fontWeight: 500,
          }}
        >
          {initial}
        </div>
      )}
    </div>
  );
}
