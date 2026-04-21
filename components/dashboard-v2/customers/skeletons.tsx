import { MetricSkeleton, CardSkeleton, Skeleton } from '../Skeleton';

export function CustomerMetricsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricSkeleton />
      <MetricSkeleton />
      <MetricSkeleton />
      <MetricSkeleton />
    </div>
  );
}

export function CustomerListSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24" />
        ))}
      </div>
      <CardSkeleton rows={5} />
    </div>
  );
}
