import { Suspense } from 'react';
import { TopBar } from '@/components/dashboard-v2/TopBar';
import { requireCurrentBusiness } from '@/lib/queries/business';
import {
  HealthScoreSkeleton,
  RevenueChartSkeleton,
  DistributionSkeleton,
  InsightsArchiveSkeleton,
} from '@/components/dashboard-v2/intelligence/skeletons';
import { HealthScoreSection } from './_sections/HealthScoreSection';
import { RevenueSection } from './_sections/RevenueSection';
import { DistributionSection } from './_sections/DistributionSection';
import { InsightsSection } from './_sections/InsightsSection';

export const dynamic = 'force-dynamic';

export default async function IntelligenceV2Page() {
  const { business } = await requireCurrentBusiness<{ id: string; category: string | null }>(
    'id, category',
  );

  return (
    <>
      <TopBar
        title="Intelligence"
        subtitle="Insights that used to need a business consultant"
      />
      <div className="mx-auto max-w-6xl px-8 py-6 space-y-6">
        <Suspense fallback={<HealthScoreSkeleton />}>
          <HealthScoreSection businessId={business.id} category={business.category} />
        </Suspense>
        <Suspense fallback={<RevenueChartSkeleton />}>
          <RevenueSection businessId={business.id} />
        </Suspense>
        <Suspense fallback={<DistributionSkeleton />}>
          <DistributionSection businessId={business.id} />
        </Suspense>
        <Suspense fallback={<InsightsArchiveSkeleton />}>
          <InsightsSection businessId={business.id} />
        </Suspense>
      </div>
    </>
  );
}
