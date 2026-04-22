import { MetricSkeleton, CardSkeleton, Skeleton } from '../Skeleton';
import { Card } from '../Card';

export function FinanceHeadlineSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricSkeleton />
      <MetricSkeleton />
      <MetricSkeleton />
      <MetricSkeleton />
    </div>
  );
}

export function VatTrackerSkeleton() {
  return (
    <Card padding="none">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr]">
        <div className="p-5 border-b lg:border-b-0 lg:border-r border-paper-border dark:border-ink-border">
          <Skeleton className="h-3 w-32 mb-3" />
          <Skeleton className="h-8 w-28 mb-3" />
          <Skeleton className="h-1.5 w-full" />
        </div>
        <div className="p-5">
          <Skeleton className="h-4 w-3/4 mb-3" />
          <Skeleton className="h-3 w-full mb-1" />
          <Skeleton className="h-3 w-full mb-1" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      </div>
    </Card>
  );
}

export function PnLSkeleton() {
  return <CardSkeleton rows={5} />;
}

export function PayoutsSkeleton() {
  return <CardSkeleton rows={3} />;
}

export function TransactionsSkeleton() {
  return <CardSkeleton rows={4} />;
}
