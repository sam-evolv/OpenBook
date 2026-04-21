'use client';

import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Card } from '../Card';
import { formatPrice } from '@/lib/supabase';
import type { RevenuePoint } from '@/lib/dashboard-v2/intelligence-queries';

interface RevenueChartProps {
  series: RevenuePoint[];
  forecastCents: number | null;
}

export function RevenueChart({ series, forecastCents }: RevenueChartProps) {
  const totalActual = series
    .filter((s, i) => i < series.length - 1 || forecastCents === null)
    .reduce((s, p) => s + p.revenueCents, 0);
  const currentMonth = series[series.length - 1];
  const hasAnyRevenue = series.some((s) => s.revenueCents > 0);

  // Chart data: for the current month, if we have a forecast, split the
  // bar into an "actual" segment + a faint "forecast" segment on top.
  const chartData = series.map((p, i) => {
    const isCurrent = i === series.length - 1;
    if (isCurrent && forecastCents !== null && forecastCents > p.revenueCents) {
      return {
        month: p.month,
        actual: p.revenueCents / 100,
        forecast: (forecastCents - p.revenueCents) / 100,
      };
    }
    return { month: p.month, actual: p.revenueCents / 100, forecast: 0 };
  });

  return (
    <Card padding="none">
      <div className="px-5 pt-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.3px] text-paper-text-3 dark:text-ink-text-3">
          Monthly revenue
        </div>
        {hasAnyRevenue ? (
          <div className="mt-2 flex items-baseline gap-3 flex-wrap">
            <div className="text-[28px] font-semibold tabular-nums tracking-tight text-paper-text-1 dark:text-ink-text-1">
              {formatPrice(currentMonth?.revenueCents ?? 0)}
            </div>
            <div className="text-[13px] text-paper-text-2 dark:text-ink-text-2">→</div>
            <div className="text-[22px] font-medium tabular-nums tracking-tight text-gold">
              {forecastCents !== null ? formatPrice(forecastCents) : '—'}
            </div>
            <div className="text-[12px] italic text-paper-text-3 dark:text-ink-text-3">
              {forecastCents !== null
                ? `forecast for ${currentMonth?.month}`
                : `${currentMonth?.month} so far`}
            </div>
          </div>
        ) : (
          <div className="mt-2 text-[13px] text-paper-text-3 dark:text-ink-text-3">
            No revenue recorded yet. Your first booking is where this chart starts.
          </div>
        )}
      </div>
      <div className="h-56 px-2 pt-3 pb-2">
        <ResponsiveContainer>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="2 4" className="stroke-paper-border dark:stroke-ink-border" vertical={false} />
            <XAxis
              dataKey="month"
              className="fill-paper-text-3 dark:fill-ink-text-3"
              fontSize={11}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              className="fill-paper-text-3 dark:fill-ink-text-3"
              fontSize={11}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `€${v / 1000}k`}
            />
            <Tooltip
              cursor={{ fill: 'rgba(212, 175, 55, 0.06)' }}
              contentStyle={{
                background: 'var(--tw-bg-opacity) #0F1115',
                border: '1px solid rgba(212,175,55,0.25)',
                borderRadius: 8,
                fontSize: 12,
                color: '#ECEEF2',
              }}
              formatter={(value, name) => [
                `€${Number(value ?? 0).toLocaleString()}`,
                name === 'actual' ? 'Actual' : 'Forecast',
              ]}
            />
            <Bar dataKey="actual" stackId="rev" radius={[0, 0, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill="#D4AF37" />
              ))}
            </Bar>
            <Bar dataKey="forecast" stackId="rev" radius={[4, 4, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell
                  key={i}
                  fill="rgba(212, 175, 55, 0.25)"
                  stroke="#D4AF37"
                  strokeDasharray="3 3"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
