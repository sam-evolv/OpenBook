'use client';

import { useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { LineChart as LineIcon, Target } from 'lucide-react';
import { formatCompactEuro, formatEuro } from '@/lib/analytics/summary';
import type { ForecastSummary } from '@/lib/analytics/computeForecast';

type Props = {
  summary: ForecastSummary;
  hasEnoughData: boolean;
};

type ChartRow = {
  label: string;
  historyCents?: number;
  projectedCents?: number;
  band?: [number, number];
  isProjection: boolean;
};

export function RevenueForecast({ summary, hasEnoughData }: Props) {
  const rows: ChartRow[] = useMemo(() => {
    const history: ChartRow[] = summary.history.map((h) => ({
      label: h.weekLabel,
      historyCents: h.projectedCents,
      isProjection: false,
    }));
    const projection: ChartRow[] = summary.projection.map((p, i) => {
      const prev = i === 0 ? summary.history[summary.history.length - 1] : null;
      const linkPoint: ChartRow | null = prev && i === 0
        ? {
            label: prev.weekLabel,
            historyCents: prev.projectedCents,
            projectedCents: prev.projectedCents,
            band: [prev.projectedCents, prev.projectedCents],
            isProjection: false,
          }
        : null;
      const row: ChartRow = {
        label: p.weekLabel,
        projectedCents: p.projectedCents,
        band: [p.lowCents, p.highCents],
        isProjection: true,
      };
      return linkPoint
        ? // attach synthetic join point via array then flatten below
          ({ ...row, _join: linkPoint } as unknown as ChartRow)
        : row;
    });
    // flatten join points
    const flat: ChartRow[] = [];
    for (const r of projection) {
      const joined = (r as unknown as { _join?: ChartRow })._join;
      if (joined) {
        // replace last history entry with join point for continuity
        if (history.length > 0) {
          const lastIdx = history.length - 1;
          history[lastIdx] = { ...history[lastIdx], ...joined };
        }
        const cleaned: ChartRow = {
          label: r.label,
          projectedCents: r.projectedCents,
          band: r.band,
          isProjection: true,
        };
        flat.push(cleaned);
      } else {
        flat.push(r);
      }
    }
    return [...history, ...flat];
  }, [summary]);

  const projectedTotal = summary.projection.reduce(
    (s, p) => s + p.projectedCents,
    0,
  );

  return (
    <section className="rounded-2xl border border-line bg-[#0f1115] shadow-premium overflow-hidden">
      <header className="px-6 py-5 border-b border-line">
        <div className="flex items-center gap-2">
          <LineIcon className="h-3.5 w-3.5 text-gold" />
          <span className="font-mono text-[10.5px] tracking-[0.24em] uppercase text-gold">
            Revenue forecast
          </span>
        </div>
        <h2 className="mt-2 font-display text-[22px] text-paper leading-tight tracking-tight">
          The next 4 weeks, as far as we can see.
        </h2>
        <p className="mt-1 text-[12.5px] text-paper/55 max-w-xl">
          Projection blends confirmed bookings with your 8-week trend. Band = 80%
          confidence.
        </p>
      </header>

      {!hasEnoughData ? (
        <div className="px-6 py-10 text-[13px] text-paper/55">
          We&apos;ll plot your forecast once you have 2 weeks of bookings. Until then, keep adding services and opening up slots.
        </div>
      ) : (
        <div className="px-2 pt-4">
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rows} margin={{ top: 12, right: 18, left: 18, bottom: 0 }}>
                <defs>
                  <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#D4AF37" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'rgba(240,240,240,0.45)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => formatCompactEuro(Number(v))}
                  tick={{ fill: 'rgba(240,240,240,0.35)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                />
                <Tooltip content={<ForecastTooltip />} cursor={{ stroke: 'rgba(212,175,55,0.3)' }} />
                <ReferenceLine
                  x={rows.find((r) => r.isProjection)?.label}
                  stroke="rgba(212,175,55,0.3)"
                  strokeDasharray="3 4"
                />
                <Area
                  type="monotone"
                  dataKey="band"
                  stroke="none"
                  fill="url(#forecastBand)"
                  isAnimationActive
                  animationDuration={900}
                  animationEasing="ease-out"
                />
                <Line
                  type="monotone"
                  dataKey="historyCents"
                  stroke="#D4AF37"
                  strokeWidth={2}
                  dot={{ r: 3, stroke: '#D4AF37', strokeWidth: 1.5, fill: '#0f1115' }}
                  activeDot={{ r: 5 }}
                  isAnimationActive
                  animationDuration={900}
                />
                <Line
                  type="monotone"
                  dataKey="projectedCents"
                  stroke="#D4AF37"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  dot={{ r: 3, stroke: '#D4AF37', strokeWidth: 1.5, fill: '#0f1115' }}
                  activeDot={{ r: 5 }}
                  isAnimationActive
                  animationDuration={1200}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <GoalTile
            goalCents={summary.goalCents}
            projectedTotal={projectedTotal}
            gap={summary.goalGapCents}
            bookingsNeeded={summary.bookingsNeededForGoal}
            avgBookingCents={summary.avgBookingValueCents}
          />
        </div>
      )}
    </section>
  );
}

function GoalTile({
  goalCents,
  projectedTotal,
  gap,
  bookingsNeeded,
  avgBookingCents,
}: {
  goalCents: number;
  projectedTotal: number;
  gap: number;
  bookingsNeeded: number;
  avgBookingCents: number;
}) {
  const onTrack = gap === 0;
  return (
    <div className="m-4 rounded-xl border border-gold-300 bg-gradient-to-b from-gold-100 to-transparent p-5">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gold-100 border border-gold-300 text-gold shrink-0">
          <Target className="h-4 w-4" />
        </span>
        <div className="flex-1">
          <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-paper/50">
            4-week goal
          </div>
          <p className="mt-1 text-[14px] leading-[1.55] text-paper">
            {onTrack ? (
              <>
                You&apos;re on track to clear{' '}
                <span className="text-gold font-semibold">{formatEuro(goalCents)}</span>{' '}
                over the next 4 weeks. Nice.
              </>
            ) : (
              <>
                To hit{' '}
                <span className="text-gold font-semibold">{formatEuro(goalCents)}</span>{' '}
                over the next 4 weeks, you need{' '}
                <span className="text-gold font-semibold">{bookingsNeeded}</span>{' '}
                more bookings — that&apos;s{' '}
                {avgBookingCents > 0
                  ? `${formatEuro(avgBookingCents)} apiece`
                  : 'at your average booking value'}
                .
              </>
            )}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Mini label="Projected" value={formatCompactEuro(projectedTotal)} />
            <Mini label="Goal" value={formatCompactEuro(goalCents)} />
            <Mini label="Gap" value={formatCompactEuro(gap)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-paper/45">
        {label}
      </div>
      <div className="mt-0.5 text-[15px] text-paper tabular-nums">{value}</div>
    </div>
  );
}

type TooltipPayload = {
  active?: boolean;
  label?: string;
  payload?: Array<{
    payload?: ChartRow;
  }>;
};

function ForecastTooltip({ active, payload, label }: TooltipPayload) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  if (!row) return null;
  return (
    <div className="rounded-lg border border-line bg-[#0b0d12] px-3 py-2 shadow-premium text-[12px]">
      <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-paper/45">
        {label}
      </div>
      {row.historyCents !== undefined && !row.isProjection && (
        <div className="mt-1 text-paper">
          Actual:{' '}
          <span className="text-gold tabular-nums">
            {formatEuro(row.historyCents)}
          </span>
        </div>
      )}
      {row.projectedCents !== undefined && row.isProjection && (
        <>
          <div className="mt-1 text-paper">
            Projected:{' '}
            <span className="text-gold tabular-nums">
              {formatEuro(row.projectedCents)}
            </span>
          </div>
          {row.band && (
            <div className="text-paper/55 tabular-nums">
              80% band {formatCompactEuro(row.band[0])} –{' '}
              {formatCompactEuro(row.band[1])}
            </div>
          )}
        </>
      )}
    </div>
  );
}
