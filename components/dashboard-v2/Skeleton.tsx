import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-paper-surface2 dark:bg-ink-surface2',
        className,
      )}
    />
  );
}

export function MetricSkeleton() {
  return (
    <div className="rounded-xl border border-paper-border dark:border-ink-border bg-paper-surface dark:bg-ink-surface p-4">
      <Skeleton className="h-3 w-20 mb-3" />
      <Skeleton className="h-7 w-24 mb-2" />
      <Skeleton className="h-3 w-28" />
    </div>
  );
}

export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-paper-border dark:border-ink-border bg-paper-surface dark:bg-ink-surface p-5">
      <Skeleton className="h-4 w-40 mb-4" />
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 py-3 border-t border-paper-border dark:border-ink-border first:border-t-0"
        >
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-3.5 w-32 mb-1.5" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-3.5 w-16" />
        </div>
      ))}
    </div>
  );
}
