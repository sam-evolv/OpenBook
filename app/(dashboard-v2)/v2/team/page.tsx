import { Suspense } from 'react';
import { requireCurrentBusiness } from '@/lib/queries/business';
import {
  TeamMetricsSkeleton,
  StaffListSkeleton,
} from '@/components/dashboard-v2/team/skeletons';
import { TeamSection } from './_sections/TeamSection';

export const dynamic = 'force-dynamic';

export default async function TeamV2Page() {
  const { owner, business } = await requireCurrentBusiness<{ id: string }>('id');

  const ownerEmail = (owner as { email?: string | null }).email ?? null;

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-8 py-6 space-y-5">
          <TeamMetricsSkeleton />
          <StaffListSkeleton />
        </div>
      }
    >
      <TeamSection businessId={business.id} ownerEmail={ownerEmail} />
    </Suspense>
  );
}
