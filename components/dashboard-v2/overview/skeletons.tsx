import { Skeleton, MetricSkeleton, CardSkeleton } from '../Skeleton';
import { Card } from '../Card';

export function GoalCardSkeleton() {
  return (
    <Card variant="gold">
      <div className="flex items-center justify-between mb-2.5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-28" />
      </div>
      <Skeleton className="h-6 w-60 mb-3" />
      <Skeleton className="h-[6px] w-full" />
    </Card>
  );
}

export function MetricsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricSkeleton />
      <MetricSkeleton />
      <MetricSkeleton />
      <MetricSkeleton />
    </div>
  );
}

export function IntelligenceGridSkeleton() {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <CardSkeleton rows={2} />
        <CardSkeleton rows={2} />
        <CardSkeleton rows={2} />
      </div>
    </section>
  );
}

export function WaitlistCardSkeleton() {
  return <CardSkeleton rows={3} />;
}
