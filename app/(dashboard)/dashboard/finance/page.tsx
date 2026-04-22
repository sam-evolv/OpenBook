import { Suspense } from 'react';
import { requireCurrentBusiness } from '@/lib/queries/business';
import {
  FinanceHeadlineSkeleton,
  VatTrackerSkeleton,
  PnLSkeleton,
  PayoutsSkeleton,
  TransactionsSkeleton,
} from '@/components/dashboard-v2/finance/skeletons';
import { FinanceSection } from './_sections/FinanceSection';

export const dynamic = 'force-dynamic';

export default async function FinancePage() {
  const { business } = await requireCurrentBusiness<{
    id: string;
    stripe_account_id: string | null;
    stripe_charges_enabled: boolean | null;
  }>('id, stripe_account_id, stripe_charges_enabled');

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-8 py-6 space-y-6">
          <FinanceHeadlineSkeleton />
          <VatTrackerSkeleton />
          <PnLSkeleton />
          <PayoutsSkeleton />
          <TransactionsSkeleton />
        </div>
      }
    >
      <FinanceSection business={business} />
    </Suspense>
  );
}
