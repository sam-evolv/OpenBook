import { Suspense } from 'react';
import { requireCurrentBusiness } from '@/lib/queries/business';
import { OverviewTopBar } from '@/components/dashboard-v2/overview/OverviewTopBar';
import {
  GoalCardSkeleton,
  MetricsGridSkeleton,
  IntelligenceGridSkeleton,
  WaitlistCardSkeleton,
} from '@/components/dashboard-v2/overview/skeletons';
import { GoalSection } from './_sections/GoalSection';
import { MetricsSection } from './_sections/MetricsSection';
import { IntelligenceSection } from './_sections/IntelligenceSection';
import { WaitlistSection } from './_sections/WaitlistSection';

export const dynamic = 'force-dynamic';

interface BusinessContext {
  id: string;
  name: string;
  slug: string;
  monthly_revenue_goal: number | null;
}

export default async function OverviewV2Page() {
  const { owner, business } = await requireCurrentBusiness<BusinessContext>(
    'id, name, slug, monthly_revenue_goal',
  );

  return (
    <>
      <OverviewTopBar
        ownerFullName={owner.full_name ?? null}
        businessName={business.name}
        businessSlug={business.slug}
      />
      <div className="mx-auto max-w-6xl px-8 py-6 space-y-6">
        <Suspense fallback={<GoalCardSkeleton />}>
          <GoalSection businessId={business.id} currentGoal={business.monthly_revenue_goal} />
        </Suspense>
        <Suspense fallback={<MetricsGridSkeleton />}>
          <MetricsSection businessId={business.id} businessSlug={business.slug} />
        </Suspense>
        <Suspense fallback={<IntelligenceGridSkeleton />}>
          <IntelligenceSection businessId={business.id} />
        </Suspense>
        <Suspense fallback={<WaitlistCardSkeleton />}>
          <WaitlistSection businessId={business.id} />
        </Suspense>
      </div>
    </>
  );
}
