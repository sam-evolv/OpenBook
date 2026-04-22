import { createSupabaseServerClient } from '@/lib/supabase-server';
import { loadRevenueSeries } from '@/lib/dashboard-v2/intelligence-queries';
import { RevenueChart } from '@/components/dashboard-v2/intelligence/RevenueChart';

export async function RevenueSection({ businessId }: { businessId: string }) {
  const sb = createSupabaseServerClient();
  const { series, forecastCents } = await loadRevenueSeries(sb, businessId);
  return <RevenueChart series={series} forecastCents={forecastCents} />;
}
