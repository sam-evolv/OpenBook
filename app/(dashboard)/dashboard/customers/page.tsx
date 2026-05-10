import { Suspense } from 'react';
import { requireCurrentBusiness } from '@/lib/queries/business';
import {
  CustomerMetricsSkeleton,
  CustomerListSkeleton,
} from '@/components/dashboard-v2/customers/skeletons';
import { CustomersSection } from './_sections/CustomersSection';
import type { CohortFilter } from '@/components/dashboard-v2/customers/CustomerFilters';

export const dynamic = 'force-dynamic';

const VALID_COHORTS: CohortFilter[] = [
  'all',
  'favourites',
  'new',
  'regular',
  'slipping',
  'churned',
];

export default async function CustomersV2Page({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const { business } = await requireCurrentBusiness<{ id: string; slug: string }>('id, slug');

  const cohort: CohortFilter = VALID_COHORTS.includes(sp.cohort as CohortFilter)
    ? (sp.cohort as CohortFilter)
    : 'all';
  const q = (sp.q ?? '').trim();

  return (
    <Suspense
      fallback={
        <>
          <div className="mx-auto max-w-6xl px-8 py-6 space-y-5">
            <CustomerMetricsSkeleton />
            <CustomerListSkeleton />
          </div>
        </>
      }
    >
      <CustomersSection
        businessId={business.id}
        businessSlug={business.slug}
        cohort={cohort}
        q={q}
      />
    </Suspense>
  );
}
