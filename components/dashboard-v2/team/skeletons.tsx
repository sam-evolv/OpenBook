import { MetricSkeleton, Skeleton } from '../Skeleton';
import { Card } from '../Card';

export function TeamMetricsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricSkeleton />
      <MetricSkeleton />
      <MetricSkeleton />
      <MetricSkeleton />
    </div>
  );
}

export function StaffListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <div className="flex items-center gap-4">
            <Skeleton className="h-11 w-11 rounded-[10px]" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </Card>
      ))}
    </div>
  );
}
