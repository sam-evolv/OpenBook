import { Sparkles } from 'lucide-react';
import { formatCompactEuro, percent } from '@/lib/analytics/summary';
import type { TodayMetrics } from '@/lib/analytics/summary';
import type { AIInsight } from '@/lib/analytics/types';
import { AIInsightCard } from './AIInsightCard';

type Props = {
  metrics: TodayMetrics;
  weeklyInsight: AIInsight | null;
  hasEnoughData: boolean;
};

export function HeroBand({ metrics, weeklyInsight, hasEnoughData }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,440px)] gap-6">
      <div className="rounded-2xl border border-line bg-[#0f1115] p-6 shadow-premium">
        <div className="font-mono text-[10.5px] tracking-[0.24em] uppercase text-paper/45">
          Today
        </div>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Metric
            label="Bookings today"
            value={String(metrics.bookingsToday)}
            delta={deltaLabel(metrics.bookingsDelta, 'count')}
            tone={metrics.bookingsDelta >= 0 ? 'up' : 'down'}
          />
          <Metric
            label="Revenue today"
            value={formatCompactEuro(metrics.revenueTodayCents)}
            delta={deltaLabel(metrics.revenueDeltaPct, 'pct')}
            tone={metrics.revenueDeltaPct >= 0 ? 'up' : 'down'}
          />
          <Metric
            label="Utilisation today"
            value={percent(metrics.utilisationToday, 0)}
            delta={deltaLabel(metrics.utilisationDeltaPts, 'pts')}
            tone={metrics.utilisationDeltaPts >= 0 ? 'up' : 'down'}
          />
        </div>
      </div>

      <div>
        {weeklyInsight ? (
          <AIInsightCard
            headline={weeklyInsight.headline}
            body={weeklyInsight.body}
            date={weeklyInsight.generated_at}
          />
        ) : (
          <NoInsightYet hasEnoughData={hasEnoughData} />
        )}
      </div>
    </div>
  );
}

function deltaLabel(value: number, kind: 'count' | 'pct' | 'pts'): string {
  if (kind === 'count') {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value} vs yesterday`;
  }
  if (kind === 'pct') {
    const sign = value > 0 ? '+' : '';
    return `${sign}${Math.round(value * 100)}% vs yesterday`;
  }
  const sign = value > 0 ? '+' : '';
  return `${sign}${Math.round(value * 100)} pts vs yesterday`;
}

function Metric({
  label,
  value,
  delta,
  tone,
}: {
  label: string;
  value: string;
  delta: string;
  tone: 'up' | 'down';
}) {
  return (
    <div>
      <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-paper/40">
        {label}
      </div>
      <div className="mt-3 font-display text-display-lg text-paper tabular-nums">
        {value}
      </div>
      <div
        className={`mt-1 text-[12px] font-mono tracking-wide ${tone === 'up' ? 'text-gold' : 'text-paper/45'}`}
      >
        {delta}
      </div>
    </div>
  );
}

function NoInsightYet({ hasEnoughData }: { hasEnoughData: boolean }) {
  return (
    <div className="h-full rounded-2xl border-l-4 border-brand-500 border-t border-r border-b border-line bg-[#0f1115] p-6 shadow-premium">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-gold" />
        <span className="font-mono text-[10.5px] tracking-[0.24em] uppercase text-gold">
          Weekly insight
        </span>
      </div>
      <h3 className="mt-3 font-display text-[20px] text-paper leading-tight">
        {hasEnoughData ? 'Your first insight is on its way.' : 'Coming in two weeks.'}
      </h3>
      <p className="mt-2 text-[14px] leading-[1.55] text-paper/60">
        {hasEnoughData
          ? 'The weekly job runs every Monday at 08:00. Check back after then for an unexpected observation written just for your business.'
          : 'We need about two weeks of bookings before we can pull a genuinely useful pattern. Keep the bookings coming.'}
      </p>
    </div>
  );
}
