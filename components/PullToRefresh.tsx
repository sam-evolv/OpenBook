'use client';

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { haptics } from '@/lib/haptics';

/**
 * Pull-to-refresh with a gold spinner.
 *
 * Usage:
 *   <PullToRefresh onRefresh={async () => { await refetch(); }}>
 *     <YourScreen />
 *   </PullToRefresh>
 *
 * Behaviour:
 *   - Only activates when the content is scrolled to the top (preserves
 *     normal scroll elsewhere).
 *   - Haptic pulse when the pull passes the trigger threshold.
 *   - While refreshing, spinner holds at full opacity until `onRefresh`
 *     resolves — even if the resolve is instant, minimum display time
 *     prevents a "flash" effect.
 *   - Respects prefers-reduced-motion (skips the pulldown animation).
 */

const TRIGGER_DISTANCE = 72;
const MAX_PULL = 120;
const RESISTANCE = 0.5;
const MIN_SPINNER_MS = 600;

type Phase = 'idle' | 'pulling' | 'armed' | 'refreshing';

export function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');

  const atScrollTop = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const el = containerRef.current;
    if (!el) return false;
    const containerScrollTop = el.scrollTop ?? 0;
    const windowScrollTop = window.scrollY ?? 0;
    return containerScrollTop <= 0 && windowScrollTop <= 0;
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (phase === 'refreshing') return;
      if (!atScrollTop()) return;
      startY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY.current === null) return;
      if (phase === 'refreshing') return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        setPull(0);
        setPhase('idle');
        return;
      }
      if (e.cancelable) e.preventDefault();

      const resisted = Math.min(dy * RESISTANCE, MAX_PULL);
      setPull(resisted);

      if (resisted >= TRIGGER_DISTANCE && phase !== 'armed') {
        haptics.tap();
        setPhase('armed');
      } else if (resisted < TRIGGER_DISTANCE && phase === 'armed') {
        setPhase('pulling');
      } else if (phase === 'idle') {
        setPhase('pulling');
      }
    };

    const onTouchEnd = async () => {
      if (startY.current === null) return;
      const wasArmed = phase === 'armed';
      startY.current = null;

      if (!wasArmed) {
        setPhase('idle');
        setPull(0);
        return;
      }

      setPhase('refreshing');
      setPull(TRIGGER_DISTANCE);

      const started = performance.now();
      try {
        await onRefresh();
      } catch {
        // Swallow — caller is responsible for surfacing errors inside
        // the refreshed content.
      }
      const elapsed = performance.now() - started;
      const remainder = Math.max(0, MIN_SPINNER_MS - elapsed);
      setTimeout(() => {
        setPhase('idle');
        setPull(0);
      }, remainder);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [phase, onRefresh, atScrollTop]);

  const spinnerOpacity =
    phase === 'refreshing'
      ? 1
      : Math.min(1, pull / TRIGGER_DISTANCE);
  const spinnerRotation =
    phase === 'refreshing'
      ? 0
      : (pull / TRIGGER_DISTANCE) * 180;

  const contentTransform =
    phase === 'refreshing'
      ? `translateY(${TRIGGER_DISTANCE}px)`
      : `translateY(${pull}px)`;

  return (
    <div
      ref={containerRef}
      style={{
        // Fill the parent (the home page already pins itself to a fixed
        // 100dvh and wraps this in a flex column). Previously this was
        // `min-height: 100dvh`, which overrode any flex centering on
        // the parent — the wrapper was always at least one viewport
        // tall, so on a short page the content was pinned to the top
        // instead of being centred. Inheriting the parent's height +
        // becoming a flex column lets the page lay things out
        // naturally and keeps pull-to-refresh working unchanged.
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: TRIGGER_DISTANCE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `translateY(${
            phase === 'refreshing' ? 0 : Math.max(0, pull - TRIGGER_DISTANCE)
          }px)`,
          opacity: spinnerOpacity,
          transition: phase === 'idle' ? 'transform 240ms ease, opacity 180ms ease' : 'none',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        <Spinner spinning={phase === 'refreshing'} rotation={spinnerRotation} />
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          transform: contentTransform,
          transition:
            phase === 'idle' || phase === 'refreshing'
              ? 'transform 260ms cubic-bezier(0.2, 0.9, 0.3, 1)'
              : 'none',
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Spinner({
  spinning,
  rotation,
}: {
  spinning: boolean;
  rotation: number;
}) {
  return (
    <div
      style={{
        width: 26,
        height: 26,
        borderRadius: '50%',
        border: '2.5px solid rgba(212,175,55,0.22)',
        borderTopColor: '#D4AF37',
        transform: spinning
          ? undefined
          : `rotate(${rotation}deg)`,
        animation: spinning
          ? 'ob-spin 700ms linear infinite'
          : undefined,
        transition: spinning ? 'none' : 'transform 80ms linear',
      }}
    >
      <style jsx>{`
        @keyframes ob-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
