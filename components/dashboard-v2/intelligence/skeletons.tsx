import { Skeleton, CardSkeleton } from '../Skeleton';
import { Card } from '../Card';

export function HealthScoreSkeleton() {
  return (
    <Card variant="gold" padding="none">
      <div className="p-6 grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-8">
        <div>
          <Skeleton className="h-3 w-40 mb-2" />
          <Skeleton className="h-12 w-24 mb-3" />
          <Skeleton className="h-3 w-60" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg bg-paper-surface2 dark:bg-ink-surface2 p-3.5"
            >
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-6 w-20 mb-1.5" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function RevenueChartSkeleton() {
  return (
    <Card padding="none">
      <div className="px-5 pt-5 pb-3">
        <Skeleton className="h-3 w-32 mb-3" />
        <Skeleton className="h-8 w-52" />
      </div>
      <div className="h-56 px-3 pb-3">
        <Skeleton className="h-full w-full" />
      </div>
    </Card>
  );
}

export function DistributionSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <CardSkeleton rows={4} />
      <CardSkeleton rows={4} />
    </div>
  );
}

export function InsightsArchiveSkeleton() {
  return <CardSkeleton rows={5} />;
}
