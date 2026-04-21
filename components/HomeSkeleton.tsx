'use client';

import {
  SkeletonText,
  SkeletonTile,
  SkeletonKeyframes,
} from './Skeleton';

/**
 * Home screen skeleton. Renders a greeting placeholder, then a 4-column
 * grid of tile skeletons matching the real home grid layout.
 */
export function HomeSkeleton({ tileCount = 8 }: { tileCount?: number }) {
  return (
    <>
      <SkeletonKeyframes />
      <div
        role="status"
        aria-label="Loading your home screen"
        style={{
          padding: '16px 20px 32px',
          minHeight: '100dvh',
        }}
      >
        <div style={{ marginBottom: 28 }}>
          <SkeletonText widthPct={35} heightPx={9} style={{ marginBottom: 10 }} />
          <SkeletonText widthPct={62} heightPx={28} style={{ borderRadius: 6 }} />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '20px 12px',
          }}
        >
          {Array.from({ length: tileCount }).map((_, i) => (
            <SkeletonTile key={i} size={72} />
          ))}
        </div>

        <span className="sr-only">Loading…</span>
      </div>
    </>
  );
}
