import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Card } from '../Card';
import { Button } from '../Button';
import { StatusPill } from '../StatusPill';
import { formatPrice } from '@/lib/supabase';
import type { FinancePayload } from '@/lib/dashboard-v2/finance-queries';

type Status = FinancePayload['transactions'][number]['status'];

const STATUS_TONE: Record<Status, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  confirmed: 'success',
  completed: 'info',
  pending: 'warning',
  cancelled: 'neutral',
  refunded: 'danger',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IE', {
    day: 'numeric',
    month: 'short',
  });
}

export function TransactionsTable({
  transactions,
}: {
  transactions: FinancePayload['transactions'];
}) {
  const top20 = transactions.slice(0, 20);

  return (
    <Card padding="none">
      <div className="flex items-center justify-between px-5 py-4 border-b border-paper-border dark:border-ink-border">
        <div className="text-[14px] font-semibold tracking-tight text-paper-text-1 dark:text-ink-text-1">
          Recent transactions
        </div>
        <Link href="/dashboard/bookings">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowRight size={11} strokeWidth={2} />}
            iconPosition="right"
          >
            View all in Bookings
          </Button>
        </Link>
      </div>
      {top20.length === 0 ? (
        <div className="px-5 py-8 text-center text-[13px] text-paper-text-3 dark:text-ink-text-3">
          No transactions yet.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[1fr_1fr_90px_80px_90px_100px] gap-3 px-5 py-2.5 border-b border-paper-border dark:border-ink-border text-[10.5px] font-semibold uppercase tracking-[0.3px] text-paper-text-3 dark:text-ink-text-3">
            <div>Customer</div>
            <div>Service</div>
            <div className="text-right">Amount</div>
            <div className="text-right">Fee</div>
            <div className="text-right">Net</div>
            <div>Status</div>
          </div>
          <ul className="divide-y divide-paper-border dark:divide-ink-border">
            {top20.map((t) => {
              const refunded = t.refundedCents > 0;
              return (
                <li
                  key={t.bookingId}
                  className="grid grid-cols-[1fr_1fr_90px_80px_90px_100px] gap-3 items-center px-5 py-3"
                >
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-paper-text-1 dark:text-ink-text-1 truncate">
                      {t.customerName}
                    </div>
                    <div className="text-[11px] text-paper-text-3 dark:text-ink-text-3">
                      {formatDate(t.startsAt)}
                    </div>
                  </div>
                  <div className="text-[12.5px] text-paper-text-2 dark:text-ink-text-2 truncate">
                    {t.serviceName ?? '—'}
                  </div>
                  <div
                    className={
                      refunded
                        ? 'text-[13px] text-red-500 dark:text-red-400 text-right tabular-nums font-medium'
                        : 'text-[13px] text-paper-text-1 dark:text-ink-text-1 text-right tabular-nums font-medium'
                    }
                  >
                    {refunded ? '−' : ''}
                    {formatPrice(t.amountCents)}
                  </div>
                  <div className="text-[12.5px] text-paper-text-3 dark:text-ink-text-3 text-right tabular-nums">
                    {t.feeCents > 0 ? formatPrice(t.feeCents) : '—'}
                  </div>
                  <div
                    className={
                      refunded
                        ? 'text-[13px] text-red-500 dark:text-red-400 text-right tabular-nums font-semibold'
                        : 'text-[13px] text-gold text-right tabular-nums font-semibold'
                    }
                  >
                    {refunded ? '−' : ''}
                    {formatPrice(Math.abs(t.netCents))}
                  </div>
                  <div>
                    <StatusPill status={STATUS_TONE[t.status] ?? 'neutral'}>
                      {t.status}
                    </StatusPill>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Card>
  );
}
