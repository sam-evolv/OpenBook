import { Download, FileText, AlertTriangle } from 'lucide-react';
import { TopBar } from '@/components/dashboard-v2/TopBar';
import { Button } from '@/components/dashboard-v2/Button';
import { Card } from '@/components/dashboard-v2/Card';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { loadFinance, type FinanceBusiness } from '@/lib/dashboard-v2/finance-queries';
import { HeadlineMetrics } from '@/components/dashboard-v2/finance/HeadlineMetrics';
import { VatTracker } from '@/components/dashboard-v2/finance/VatTracker';
import { MonthlyPnL } from '@/components/dashboard-v2/finance/MonthlyPnL';
import { RevenueMix } from '@/components/dashboard-v2/finance/RevenueMix';
import { PayoutsTable } from '@/components/dashboard-v2/finance/PayoutsTable';
import { TransactionsTable } from '@/components/dashboard-v2/finance/TransactionsTable';
import { ConnectStripePrompt } from '@/components/dashboard-v2/finance/ConnectStripePrompt';

export async function FinanceSection({ business }: { business: FinanceBusiness }) {
  const sb = createSupabaseServerClient();
  const payload = await loadFinance(sb, business);

  return (
    <>
      <TopBar
        title="Finance"
        subtitle="Payouts, refunds, VAT — everything your accountant needs"
        actions={
          <>
            <a href="/api/dashboard/finance/export">
              <Button
                variant="ghost"
                size="md"
                icon={<Download size={13} strokeWidth={2} />}
              >
                Export CSV
              </Button>
            </a>
            <Button
              variant="secondary"
              size="md"
              icon={<FileText size={13} strokeWidth={2} />}
              disabled
              title="Email-to-accountant flow coming in the next cycle"
            >
              Send to accountant
            </Button>
          </>
        }
      />
      <div className="mx-auto max-w-6xl px-8 py-6 space-y-6">
        {payload.warnings.length > 0 && (
          <Card variant="warning" padding="sm">
            <div className="flex items-start gap-2 text-[12.5px] text-amber-700 dark:text-amber-300">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <div className="space-y-1">
                {payload.warnings.map((w, i) => (
                  <div key={i}>{w}</div>
                ))}
              </div>
            </div>
          </Card>
        )}

        <HeadlineMetrics headline={payload.headline} connected={payload.connected} />

        <VatTracker vat={payload.vat} />

        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4">
          <MonthlyPnL pnl={payload.pnl} />
          <RevenueMix mix={payload.revenueMix} />
        </div>

        {payload.connected ? (
          <>
            <PayoutsTable
              payouts={payload.payouts}
              scheduleLabel={
                payload.schedule.interval && payload.schedule.bankLabel
                  ? `${capitalise(payload.schedule.interval)} to ${payload.schedule.bankLabel}`
                  : payload.schedule.interval
                    ? `${capitalise(payload.schedule.interval)}`
                    : payload.schedule.bankLabel
              }
              stripeAccountId={business.stripe_account_id}
            />
            <TransactionsTable transactions={payload.transactions} />
          </>
        ) : (
          <ConnectStripePrompt businessId={business.id} />
        )}
      </div>
    </>
  );
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
