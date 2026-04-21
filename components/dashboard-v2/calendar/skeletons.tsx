import { Skeleton } from '../Skeleton';
import { Card } from '../Card';
import { HOUR_PX, HOURS_PER_DAY } from './WeekGrid';

export function StaffFilterBarSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="h-4 w-14" />
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-24 rounded-full" />
      ))}
    </div>
  );
}

export function WeekHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-7 w-7 rounded-md" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-7 w-7 rounded-md" />
        <Skeleton className="h-7 w-14 rounded-md" />
      </div>
      <Skeleton className="h-7 w-28" />
    </div>
  );
}

export function WeekGridSkeleton() {
  return (
    <Card padding="none" className="overflow-hidden">
      <div
        className="grid border-b border-paper-border dark:border-ink-border"
        style={{ gridTemplateColumns: '64px repeat(7, minmax(0, 1fr))' }}
      >
        <div />
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="px-2 py-3 border-l border-paper-border dark:border-ink-border"
          >
            <Skeleton className="h-3 w-8 mb-2" />
            <Skeleton className="h-5 w-6" />
          </div>
        ))}
      </div>
      <div
        className="relative"
        style={{ height: HOURS_PER_DAY * HOUR_PX }}
      >
        <Skeleton className="absolute inset-0 rounded-none" />
      </div>
    </Card>
  );
}
