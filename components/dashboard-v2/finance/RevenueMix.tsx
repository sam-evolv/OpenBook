import { Card } from '../Card';
import { formatPrice } from '@/lib/supabase';
import type { FinancePayload } from '@/lib/dashboard-v2/finance-queries';

const COLOURS = ['#D4AF37', '#3B82F6', '#7C3AED', '#10B981', '#D97706', '#EC4899'];

export function RevenueMix({ mix }: { mix: FinancePayload['revenueMix'] }) {
  return (
    <Card padding="md">
      <div className="text-[11px] font-semibold uppercase tracking-[0.3px] text-paper-text-3 dark:text-ink-text-3">
        Revenue mix
      </div>
      <div className="mt-1 text-[14px] font-semibold tracking-tight text-paper-text-1 dark:text-ink-text-1 mb-4">
        This month
      </div>
      {mix.length === 0 ? (
        <div className="py-6 text-[13px] text-paper-text-3 dark:text-ink-text-3 text-center">
          No revenue recorded this month.
        </div>
      ) : (
        <div className="space-y-3">
          {mix.map((row, i) => (
            <div key={row.label}>
              <div className="flex items-baseline justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2 w-2 rounded-sm shrink-0"
                    style={{ background: COLOURS[i % COLOURS.length] }}
                    aria-hidden
                  />
                  <div className="text-[12px] text-paper-text-1 dark:text-ink-text-1 truncate">
                    {row.label}
                  </div>
                </div>
                <div className="text-[12px] font-semibold tabular-nums text-paper-text-1 dark:text-ink-text-1">
                  {formatPrice(row.valueCents)}
                  <span className="ml-1.5 text-[11px] font-normal text-paper-text-3 dark:text-ink-text-3">
                    {row.percent}%
                  </span>
                </div>
              </div>
              <div className="mt-1 h-[3px] rounded bg-paper-border dark:bg-ink-border overflow-hidden">
                <div
                  className="h-full rounded"
                  style={{
                    width: `${row.percent}%`,
                    background: COLOURS[i % COLOURS.length],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
