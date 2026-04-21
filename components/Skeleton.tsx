'use client';

/**
 * Skeleton primitives.
 *
 * Building blocks for loading states. Compose these into screen-specific
 * skeletons — never use a spinner.
 *
 * Why skeletons not spinners:
 *   Users perceive skeleton screens as ~30% faster than spinners even when
 *   actual load time is identical. Skeletons communicate "content is
 *   arriving in these shapes"; spinners communicate "we don't know what
 *   you'll get, or when".
 *
 * The shimmer is a single CSS keyframe. No JS, no animation library.
 */

import type { CSSProperties, ReactNode } from 'react';

interface BaseSkeletonProps {
  className?: string;
  style?: CSSProperties;
  /** Disable the shimmer (e.g. when nesting inside another shimmering block). */
  noShimmer?: boolean;
  children?: ReactNode;
}

export function SkeletonBlock({
  className,
  style,
  noShimmer,
  children,
}: BaseSkeletonProps) {
  return (
    <div
      aria-hidden
      className={className}
      style={{
        background: noShimmer ? 'rgba(255,255,255,0.06)' : undefined,
        backgroundImage: noShimmer
          ? undefined
          : 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%)',
        backgroundSize: '200% 100%',
        animation: noShimmer ? undefined : 'ob-shimmer 1.6s ease-in-out infinite',
        borderRadius: 8,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SkeletonCircle({
  size = 40,
  style,
  noShimmer,
}: { size?: number } & BaseSkeletonProps) {
  return (
    <SkeletonBlock
      noShimmer={noShimmer}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

export function SkeletonText({
  widthPct = 100,
  heightPx = 12,
  style,
  noShimmer,
}: {
  widthPct?: number;
  heightPx?: number;
} & BaseSkeletonProps) {
  return (
    <SkeletonBlock
      noShimmer={noShimmer}
      style={{
        width: `${widthPct}%`,
        height: heightPx,
        borderRadius: heightPx / 2,
        ...style,
      }}
    />
  );
}

export function SkeletonTile({
  size = 72,
  showLabel = true,
}: {
  size?: number;
  showLabel?: boolean;
}) {
  const radius = Math.round(size * 0.25);
  return (
    <div
      aria-hidden
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <SkeletonBlock
        style={{
          width: size,
          height: size,
          borderRadius: radius,
        }}
      />
      {showLabel && <SkeletonText widthPct={60} heightPx={10} />}
    </div>
  );
}

export function SkeletonKeyframes() {
  return (
    <style jsx global>{`
      @keyframes ob-shimmer {
        0%   { background-position: 100% 0; }
        100% { background-position: -100% 0; }
      }
    `}</style>
  );
}
