'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';
import { Card } from './Card';
import { cn } from '@/lib/utils';

interface SparklinePoint {
  v: number;
}

interface MetricProps {
  label: string;
  value: string | number;
  prefix?: string;
  suffix?: string;
  delta?: number;
  deltaLabel?: string;
  sparkline?: SparklinePoint[];
  accent?: boolean;
}

export function Metric({
  label,
  value,
  prefix = '',
  suffix = '',
  delta,
  deltaLabel = 'vs last week',
  sparkline,
  accent = false,
}: MetricProps) {
  const isUp = delta !== undefined && delta >= 0;

  return (
    <Card padding="sm">
      <div className="text-[11px] font-medium uppercase tracking-[0.6px] text-paper-text-3 dark:text-ink-text-3 mb-2.5">
        {label}
      </div>
      <div className="flex items-end justify-between gap-2.5">
        <div>
          <div
            className={cn(
              'text-[26px] leading-none font-semibold tracking-tight tabular-nums',
              accent ? 'text-gold' : 'text-paper-text-1 dark:text-ink-text-1',
            )}
          >
            {prefix}
            {value}
            {suffix}
          </div>
          {delta !== undefined && (
            <div
              className={cn(
                'inline-flex items-center gap-0.5 mt-2 text-[11.5px] font-medium tabular-nums',
                isUp ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400',
              )}
            >
              {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {isUp ? '+' : ''}
              {delta}%{' '}
              <span className="text-paper-text-3 dark:text-ink-text-3 font-normal">{deltaLabel}</span>
            </div>
          )}
        </div>
        {sparkline && (
          <div className="w-20 h-8">
            <ResponsiveContainer>
              <LineChart data={sparkline}>
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke={accent ? '#D4AF37' : '#4ADE80'}
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}
