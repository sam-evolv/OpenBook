import { createSupabaseServerClient } from '@/lib/supabase-server';
import { loadMetrics } from '@/lib/dashboard-v2/overview-queries';
import { MetricsGrid } from '@/components/dashboard-v2/overview/MetricsGrid';

export async function MetricsSection({
  businessId,
  businessSlug,
}: {
  businessId: string;
  businessSlug: string;
}) {
  const sb = createSupabaseServerClient();
  const data = await loadMetrics(sb, businessId);
  return <MetricsGrid data={data} businessSlug={businessSlug} />;
}
