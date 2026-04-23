import { Suspense } from 'react';
import { requireCurrentBusiness } from '@/lib/queries/business';
import { FlashSalesSection } from './_sections/FlashSalesSection';
import { FlashSalesSkeleton } from '@/components/dashboard-v2/flash-sales/skeletons';

export const dynamic = 'force-dynamic';

export default async function FlashSalesV2Page() {
  const { business } = await requireCurrentBusiness<{ id: string; name: string }>(
    'id, name',
  );

  return (
    <Suspense fallback={<FlashSalesSkeleton />}>
      <FlashSalesSection businessId={business.id} businessName={business.name} />
    </Suspense>
  );
}
