import { Metric } from '../Metric';
import type { FinancePayload } from '@/lib/dashboard-v2/finance-queries';

export function HeadlineMetrics({ headline, connected }: {
  headline: FinancePayload['headline'];
  connected: boolean;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Metric
        label="Next payout"
        prefix="€"
        value={Math.round(headline.nextPayoutCents / 100).toLocaleString()}
        deltaLabel={connected ? 'Pending from Stripe' : 'Stripe not connected'}
        accent
      />
      <Metric
        label="Available balance"
        prefix="€"
        value={Math.round(headline.availableBalanceCents / 100).toLocaleString()}
        deltaLabel={connected ? 'On Stripe' : 'Stripe not connected'}
      />
      <Metric
        label="Gross this month"
        prefix="€"
        value={Math.round(headline.grossThisMonthCents / 100).toLocaleString()}
        deltaLabel="Month-to-date · non-cancelled bookings"
      />
      <Metric
        label="Stripe fees"
        prefix="€"
        value={Math.round(headline.stripeFees30dCents / 100).toLocaleString()}
        deltaLabel={connected ? 'Last 30 days' : 'Stripe not connected'}
      />
    </div>
  );
}
