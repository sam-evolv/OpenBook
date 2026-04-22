import { Skeleton } from '../Skeleton';

export function MessagesSkeleton() {
  return (
    <div className="flex h-[calc(100dvh-0px)]">
      <aside className="w-[320px] border-r border-paper-border dark:border-ink-border p-4 space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-full" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-44" />
            </div>
          </div>
        ))}
      </aside>
      <section className="flex-1 p-6 space-y-3">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-2/3" />
        <Skeleton className="h-16 w-3/4" />
      </section>
      <aside className="w-[320px] border-l border-paper-border dark:border-ink-border p-5 space-y-4">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </aside>
    </div>
  );
}
