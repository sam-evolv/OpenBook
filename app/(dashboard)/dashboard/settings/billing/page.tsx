import { CreditCard } from 'lucide-react';
import { TopBar } from '@/components/dashboard-v2/TopBar';
import { Card } from '@/components/dashboard-v2/Card';

export const dynamic = 'force-dynamic';

export default function BillingPage() {
  return (
    <>
      <TopBar title="Billing & subscription" subtitle="Manage your plan and payments" />
      <div className="mx-auto max-w-3xl px-8 py-8">
        <Card padding="lg">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gold-soft border border-gold-border text-gold">
              <CreditCard size={18} strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-semibold text-paper-text-1 dark:text-ink-text-1">
                Billing & subscription coming soon
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-paper-text-2 dark:text-ink-text-2">
                We're building plan upgrades, invoices and payment management here.
                For now, every business is on the Free plan with no charges.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
