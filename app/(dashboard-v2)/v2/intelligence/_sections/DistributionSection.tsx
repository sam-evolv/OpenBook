import { createSupabaseServerClient } from '@/lib/supabase-server';
import { loadDistribution } from '@/lib/dashboard-v2/intelligence-queries';
import { BookingSourceDonut } from '@/components/dashboard-v2/intelligence/BookingSourceDonut';
import { RevenueByService } from '@/components/dashboard-v2/intelligence/RevenueByService';
import { AIDistributionCard } from '@/components/dashboard-v2/intelligence/AIDistributionCard';

export async function DistributionSection({ businessId }: { businessId: string }) {
  const sb = createSupabaseServerClient();
  const data = await loadDistribution(sb, businessId);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BookingSourceDonut source={data.source} />
        <RevenueByService services={data.topServices} />
      </div>
      <AIDistributionCard />
    </div>
  );
}
