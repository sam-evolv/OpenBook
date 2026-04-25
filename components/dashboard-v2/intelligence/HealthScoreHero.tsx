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
  description: string;
  better: boolean;
  same?: boolean;
  unavailable?: string | null;
}

function Tile({ label, value, benchmarkLabel, description, better, same, unavailable }: TileProps) {
  return (
    <div className="rounded-lg bg-paper-surface2 dark:bg-ink-surface2 border border-paper-border dark:border-ink-border p-3.5">
      <div className="text-[10.5px] font-medium uppercase tracking-[0.3px] text-paper-text-3 dark:text-ink-text-3">
        {label}
      </div>
      {unavailable ? (
        <div className="mt-1.5 text-[12.5px] leading-snug text-paper-text-2 dark:text-ink-text-2">
          {unavailable}
        </div>
      ) : (
        <>
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
        </>
      )}
      <div className="mt-2 text-[10.5px] leading-snug text-paper-text-3 dark:text-ink-text-3">
        {description}
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

  const retentionPct = health.highlights.retentionPercent;
  const highlights = [
    {
      label: 'Utilisation',
      value: `${health.highlights.utilisationPercent}%`,
      benchmarkValue: benchmark.utilisationPercent,
      raw: health.highlights.utilisationPercent,
      inverted: false,
      format: (n: number) => `${n}%`,
      description: 'Booked time vs open business hours, last 30 days',
      unavailable: null as string | null,
    },
    {
      label: 'Retention',
      value: retentionPct === null ? '—' : `${retentionPct}%`,
      benchmarkValue: benchmark.showRatePercent, // using show-rate bench as proxy — see brief
      raw: retentionPct ?? 0,
      inverted: false,
      format: (n: number) => `${n}%`,
      description: 'Customers who booked in the last 30 days, having booked the prior month',
      unavailable: retentionPct === null ? 'Need 60 days of bookings' : null,
    },
    {
      label: 'MRR',
      value: formatPrice(health.highlights.monthlyRevenueCents),
      benchmarkValue: benchmark.avgMonthlyRevenueCents / 100,
      raw: health.highlights.monthlyRevenueCents / 100,
      inverted: false,
      format: (n: number) => `€${Math.round(n).toLocaleString()}`,
      description: 'Monthly recurring revenue, last 30 days',
      unavailable: null as string | null,
    },
    {
      label: 'No-show rate',
      value: `${health.highlights.noShowRatePercent}%`,
      benchmarkValue: 100 - benchmark.showRatePercent,
      raw: health.highlights.noShowRatePercent,
      inverted: true, // lower is better
      format: (n: number) => `${n}%`,
      description: 'Cancelled or no-show bookings, last 30 days',
      unavailable: null as string | null,
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
                <span>
                  {delta > 0 ? '+' : ''}
                  {delta} point{Math.abs(delta) === 1 ? '' : 's'}
                  <span className="font-normal text-paper-text-3 dark:text-ink-text-3">
                    {' '}from {health.previousScore} last month
                  </span>
                </span>
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
                  description={h.description}
                  better={better}
                  same={same}
                  unavailable={h.unavailable}
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
