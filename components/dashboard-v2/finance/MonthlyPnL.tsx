import { Card } from '../Card';
import { formatPrice } from '@/lib/supabase';
import type { FinancePayload } from '@/lib/dashboard-v2/finance-queries';
import { cn } from '@/lib/utils';

export function MonthlyPnL({ pnl }: { pnl: FinancePayload['pnl'] }) {
  return (
    <Card padding="none">
      <div className="flex items-center justify-between px-5 py-4 border-b border-paper-border dark:border-ink-border">
        <div>
          <div className="text-[14px] font-semibold tracking-tight text-paper-text-1 dark:text-ink-text-1">
            {pnl.monthLabel} P&amp;L
          </div>
          <div className="mt-0.5 text-[11.5px] text-paper-text-3 dark:text-ink-text-3">
            Running month, computed on every load
          </div>
        </div>
      </div>
      <div className="py-2">
        {pnl.rows.length === 0 ? (
          <div className="px-5 py-8 text-center text-[13px] text-paper-text-3 dark:text-ink-text-3">
            No revenue this month yet.
          </div>
        ) : (
          pnl.rows.map((row, i) => (
            <div
              key={i}
              className={cn(
                'flex items-center justify-between px-5 py-2.5',
                i < pnl.rows.length - 1 && 'border-b border-paper-border dark:border-ink-border',
              )}
            >
              <div>
                <div className="text-[12.5px] text-paper-text-1 dark:text-ink-text-1">
                  {row.label}
                </div>
                <div className="mt-0.5 text-[11px] text-paper-text-3 dark:text-ink-text-3">
                  {row.sub}
                </div>
              </div>
              <div
                className={cn(
                  'text-[14px] font-semibold tabular-nums',
                  row.negative
                    ? 'text-red-500 dark:text-red-400'
                    : 'text-paper-text-1 dark:text-ink-text-1',
                )}
              >
                {row.negative ? '−' : ''}
                {formatPrice(row.amountCents)}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="flex items-center justify-between px-5 py-3.5 bg-paper-surface2 dark:bg-ink-surface2 border-t border-paper-borderStrong dark:border-ink-borderStrong">
        <div className="text-[13px] font-semibold text-paper-text-1 dark:text-ink-text-1">
          Net this month
        </div>
        <div
          className={cn(
            'text-[22px] font-semibold tabular-nums tracking-tight',
            pnl.netCents < 0 ? 'text-red-500 dark:text-red-400' : 'text-gold',
          )}
        >
          {pnl.netCents < 0 ? '−' : ''}
          {formatPrice(Math.abs(pnl.netCents))}
        </div>
      </div>
    </Card>
  );
}
