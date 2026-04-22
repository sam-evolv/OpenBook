import { ExternalLink, ChevronRight } from 'lucide-react';
import { Card } from '../Card';
import { Button } from '../Button';
import { StatusPill } from '../StatusPill';
import { formatPrice } from '@/lib/supabase';
import type { FinancePayload } from '@/lib/dashboard-v2/finance-queries';

type PayoutStatus = FinancePayload['payouts'][number]['status'];

const STATUS_TONE: Record<PayoutStatus, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  paid: 'success',
  pending: 'warning',
  in_transit: 'info',
  canceled: 'danger',
  failed: 'danger',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function PayoutsTable({
  payouts,
  scheduleLabel,
  stripeAccountId,
}: {
  payouts: FinancePayload['payouts'];
  scheduleLabel: string | null;
  stripeAccountId: string | null;
}) {
  return (
    <Card padding="none">
      <div className="flex items-center justify-between px-5 py-4 border-b border-paper-border dark:border-ink-border">
        <div>
          <div className="text-[14px] font-semibold tracking-tight text-paper-text-1 dark:text-ink-text-1">
            Stripe payouts
          </div>
          <div className="mt-0.5 text-[11.5px] text-paper-text-3 dark:text-ink-text-3">
            {scheduleLabel ?? 'Schedule managed in Stripe'}
          </div>
        </div>
        {stripeAccountId && (
          <a
            href={`https://dashboard.stripe.com/${stripeAccountId}/payouts`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              variant="ghost"
              size="sm"
              icon={<ExternalLink size={13} strokeWidth={2} />}
              iconPosition="right"
            >
              Open Stripe
            </Button>
          </a>
        )}
      </div>
      {payouts.length === 0 ? (
        <div className="px-5 py-8 text-center text-[13px] text-paper-text-3 dark:text-ink-text-3">
          No payouts yet.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[1fr_auto_100px_110px_110px] gap-3 px-5 py-2.5 border-b border-paper-border dark:border-ink-border text-[10.5px] font-semibold uppercase tracking-[0.3px] text-paper-text-3 dark:text-ink-text-3">
            <div>Arrives</div>
            <div>Status</div>
            <div className="text-right">Bookings</div>
            <div className="text-right">Fees</div>
            <div className="text-right">Net</div>
          </div>
          <ul className="divide-y divide-paper-border dark:divide-ink-border">
            {payouts.map((p) => (
              <li
                key={p.id}
                className="grid grid-cols-[1fr_auto_100px_110px_110px] gap-3 items-center px-5 py-3"
              >
                <div className="text-[13px] font-medium text-paper-text-1 dark:text-ink-text-1">
                  {formatDate(p.arrivalDate)}
                </div>
                <div>
                  <StatusPill status={STATUS_TONE[p.status] ?? 'neutral'}>{p.status}</StatusPill>
                </div>
                <div className="text-[13px] text-paper-text-2 dark:text-ink-text-2 text-right tabular-nums">
                  {p.bookingCount || '—'}
                </div>
                <div className="text-[13px] text-paper-text-3 dark:text-ink-text-3 text-right tabular-nums">
                  {p.feeCents > 0 ? `−${formatPrice(p.feeCents)}` : '—'}
                </div>
                <div className="text-[14px] font-semibold tabular-nums text-paper-text-1 dark:text-ink-text-1 text-right">
                  {formatPrice(p.amountCents)}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
