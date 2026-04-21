import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '../Card';
import { EmptyState } from '../EmptyState';
import { BarChart3 } from 'lucide-react';
import {
  benchmarkFor,
  BENCHMARK_DISCLAIMER,
} from '@/lib/dashboard-v2/intelligence-benchmarks';
import type { HealthScorePayload } from '@/lib/dashboard-v2/intelligence-queries';
import { formatPrice } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface HealthScoreHeroProps {
  health: HealthScorePayload;
  category: string | null;
}

interface TileProps {
  label: string;
  value: string;
  benchmarkLabel: string;
  better: boolean;
  same?: boolean;
}

function Tile({ label, value, benchmarkLabel, better, same }: TileProps) {
  return (
    <div className="rounded-lg bg-paper-surface2 dark:bg-ink-surface2 border border-paper-border dark:border-ink-border p-3.5">
      <div className="text-[10.5px] font-medium uppercase tracking-[0.3px] text-paper-text-3 dark:text-ink-text-3">
        {label}
      </div>
      <div className="mt-1.5 text-[22px] font-semibold tracking-tight tabular-nums text-paper-text-1 dark:text-ink-text-1">
        {value}
      </div>
      <div
        className={cn(
          'mt-1 text-[10.5px] font-medium',
          same
            ? 'text-paper-text-3 dark:text-ink-text-3'
            : better
              ? 'text-emerald-500 dark:text-emerald-400'
              : 'text-red-500 dark:text-red-400',
        )}
      >
        {same ? '=' : better ? '↑' : '↓'} vs avg {benchmarkLabel}
      </div>
    </div>
  );
}

export function HealthScoreHero({ health, category }: HealthScoreHeroProps) {
  const belowThreshold = health.score === null;

  if (belowThreshold) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Your health score calibrates after ~10 bookings"
        description={`You have ${health.thirtyDayBookingCount} non-cancelled booking${health.thirtyDayBookingCount === 1 ? '' : 's'} in the last 30 days. Keep going — numbers land here once there's enough to score. Benchmarks below show what to aim for.`}
      />
    );
  }

  const { benchmark, label } = benchmarkFor(category);
  const delta =
    health.previousScore === null ? null : health.score! - health.previousScore;

  const highlights = [
    {
      label: 'Utilisation',
      value: `${health.highlights.utilisationPercent}%`,
      benchmarkValue: benchmark.utilisationPercent,
      raw: health.highlights.utilisationPercent,
      inverted: false,
      format: (n: number) => `${n}%`,
    },
    {
      label: 'Retention',
      value: `${health.highlights.retentionPercent}%`,
      benchmarkValue: benchmark.showRatePercent, // using show-rate bench as proxy — see brief
      raw: health.highlights.retentionPercent,
      inverted: false,
      format: (n: number) => `${n}%`,
    },
    {
      label: 'MRR',
      value: formatPrice(health.highlights.monthlyRevenueCents),
      benchmarkValue: benchmark.avgMonthlyRevenueCents / 100,
      raw: health.highlights.monthlyRevenueCents / 100,
      inverted: false,
      format: (n: number) => `€${Math.round(n).toLocaleString()}`,
    },
    {
      label: 'No-show rate',
      value: `${health.highlights.noShowRatePercent}%`,
      benchmarkValue: 100 - benchmark.showRatePercent,
      raw: health.highlights.noShowRatePercent,
      inverted: true, // lower is better
      format: (n: number) => `${n}%`,
    },
  ];

  return (
    <div className="space-y-2">
      <Card variant="gold" padding="none">
        <div className="p-6 grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-8">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.6px] text-gold mb-2">
              Business health score
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <div className="text-[56px] leading-none font-semibold tabular-nums tracking-tight text-paper-text-1 dark:text-ink-text-1">
                {health.score}
              </div>
              <div className="text-[18px] font-medium text-paper-text-3 dark:text-ink-text-3">
                / 100
              </div>
            </div>
            {delta !== null && (
              <div
                className={cn(
                  'flex items-center gap-1.5 text-[12.5px] font-medium',
                  delta > 0
                    ? 'text-emerald-500 dark:text-emerald-400'
                    : delta < 0
                      ? 'text-red-500 dark:text-red-400'
                      : 'text-paper-text-3 dark:text-ink-text-3',
                )}
              >
                {delta > 0 ? (
                  <TrendingUp size={12} />
                ) : delta < 0 ? (
                  <TrendingDown size={12} />
                ) : (
                  <Minus size={12} />
                )}
                {delta > 0 ? '+' : ''}
                {delta} point{Math.abs(delta) === 1 ? '' : 's'} this month
              </div>
            )}
            <div className="mt-3 text-[12.5px] leading-relaxed text-paper-text-2 dark:text-ink-text-2">
              Composite of show rate, retention, utilisation, booking velocity, and review signal.
              Compared against industry estimates for {label}.
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {highlights.map((h) => {
              const better = h.inverted ? h.raw < h.benchmarkValue : h.raw > h.benchmarkValue;
              const same = Math.abs(h.raw - h.benchmarkValue) < 0.5;
              return (
                <Tile
                  key={h.label}
                  label={h.label}
                  value={h.value}
                  benchmarkLabel={h.format(h.benchmarkValue)}
                  better={better}
                  same={same}
                />
              );
            })}
          </div>
        </div>
      </Card>
      <p className="text-[11.5px] text-paper-text-3 dark:text-ink-text-3 px-1">
        {BENCHMARK_DISCLAIMER}
      </p>
    </div>
  );
}
