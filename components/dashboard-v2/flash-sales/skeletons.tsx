import { Skeleton } from '../Skeleton';

export function FlashSalesSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-8 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="space-y-3">
        <Skeleton className="h-6 w-28" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
