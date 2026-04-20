export default function AnalyticsLoading() {
  return (
    <div className="min-h-screen bg-ink px-6 py-10">
      <div className="mx-auto max-w-[1360px] space-y-6">
        <HeroSkeleton />
        <CardSkeleton height="h-[360px]" />
        <CardSkeleton height="h-[440px]" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CardSkeleton height="h-[440px]" />
          <CardSkeleton height="h-[440px]" />
        </div>
        <CardSkeleton height="h-[280px]" />
      </div>
    </div>
  );
}

function HeroSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,420px)] gap-6">
      <div className="rounded-2xl border border-line bg-[#0f1115] p-6">
        <div className="h-3 w-24 bg-gold-100 rounded animate-pulse" />
        <div className="mt-6 grid grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <div className="h-3 w-20 bg-gold-100 rounded animate-pulse" />
              <div className="mt-3 h-10 w-28 bg-gold-100 rounded animate-pulse" />
              <div className="mt-2 h-3 w-16 bg-gold-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border-l-4 border-brand-500 border-t border-r border-b border-line bg-[#0f1115] p-6">
        <div className="h-3 w-24 bg-gold-100 rounded animate-pulse" />
        <div className="mt-4 h-5 w-48 bg-gold-100 rounded animate-pulse" />
        <div className="mt-3 h-4 w-full bg-gold-100 rounded animate-pulse" />
        <div className="mt-2 h-4 w-3/4 bg-gold-100 rounded animate-pulse" />
      </div>
    </div>
  );
}

function CardSkeleton({ height }: { height: string }) {
  return (
    <div
      className={`rounded-2xl border border-line bg-[#0f1115] p-6 ${height} animate-pulse`}
    >
      <div className="h-3 w-32 bg-gold-100 rounded" />
      <div className="mt-4 h-full w-full bg-gold-50 rounded" />
    </div>
  );
}
