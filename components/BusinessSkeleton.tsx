'use client';

import {
  SkeletonBlock,
  SkeletonText,
  SkeletonKeyframes,
} from './Skeleton';

/**
 * Business page skeleton. Mirrors the business detail layout — hero image,
 * name/description, then a list of service rows.
 */
export function BusinessSkeleton() {
  return (
    <>
      <SkeletonKeyframes />
      <div
        role="status"
        aria-label="Loading business"
        style={{ minHeight: '100dvh' }}
      >
        <SkeletonBlock
          style={{
            width: '100%',
            height: 240,
            borderRadius: 0,
          }}
        />

        <div style={{ padding: '20px 20px 28px' }}>
          <SkeletonText widthPct={60} heightPx={24} style={{ marginBottom: 10, borderRadius: 6 }} />
          <SkeletonText widthPct={40} heightPx={13} style={{ marginBottom: 16 }} />
          <SkeletonText widthPct={90} heightPx={11} style={{ marginBottom: 8 }} />
          <SkeletonText widthPct={75} heightPx={11} />
        </div>

        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 16,
                background: 'rgba(255,255,255,0.03)',
                border: '0.5px solid rgba(255,255,255,0.06)',
                borderRadius: 14,
              }}
            >
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <SkeletonText widthPct={55} heightPx={14} noShimmer />
                <SkeletonText widthPct={30} heightPx={11} noShimmer />
              </div>
              <SkeletonBlock
                noShimmer
                style={{ width: 54, height: 28, borderRadius: 14 }}
              />
            </div>
          ))}
        </div>

        <span className="sr-only">Loading business…</span>
      </div>
    </>
  );
}
