'use client';

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Card } from '../Card';
import type { DistributionPayload } from '@/lib/dashboard-v2/intelligence-queries';

interface BookingSourceDonutProps {
  source: DistributionPayload['source'];
}

const COLOURS = ['#D4AF37', '#7C3AED', '#10B981', '#3B82F6', '#9B9B98', '#A17050'];

export function BookingSourceDonut({ source }: BookingSourceDonutProps) {
  const total = source.reduce((s, r) => s + r.count, 0);

  return (
    <Card padding="md">
      <div className="text-[11px] font-semibold uppercase tracking-[0.3px] text-paper-text-3 dark:text-ink-text-3">
        Booking sources
      </div>
      <div className="mt-1 mb-3 text-[12px] text-paper-text-3 dark:text-ink-text-3">
        Last 30 days · how customers actually reach you
      </div>

      {total === 0 ? (
        <div className="py-8 text-center text-[13px] text-paper-text-3 dark:text-ink-text-3">
          No bookings in the last 30 days.
        </div>
      ) : (
        <div className="grid grid-cols-[180px_1fr] gap-5 items-center">
          <div className="h-44">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={source}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  stroke="none"
                >
                  {source.map((_, i) => (
                    <Cell key={i} fill={COLOURS[i % COLOURS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, _name, item) => {
                    const payload = (item as { payload?: { label?: string; percent?: number } })
                      ?.payload;
                    return [
                      `${value} (${payload?.percent ?? 0}%)`,
                      payload?.label ?? '',
                    ];
                  }}
                  contentStyle={{
                    background: '#0F1115',
                    border: '1px solid rgba(212,175,55,0.25)',
                    borderRadius: 8,
                    fontSize: 12,
                    color: '#ECEEF2',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="space-y-1.5">
            {source.map((s, i) => (
              <li key={s.label} className="flex items-center gap-2 text-[13px]">
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 rounded-sm shrink-0"
                  style={{ background: COLOURS[i % COLOURS.length] }}
                />
                <span className="flex-1 text-paper-text-1 dark:text-ink-text-1">{s.label}</span>
                <span className="tabular-nums text-paper-text-2 dark:text-ink-text-2">
                  {s.count}
                </span>
                <span className="tabular-nums text-[11px] text-paper-text-3 dark:text-ink-text-3 w-10 text-right">
                  {s.percent}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
