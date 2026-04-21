import { createSupabaseServerClient } from '@/lib/supabase-server';
import { loadRecentInsights } from '@/lib/dashboard-v2/intelligence-queries';
import { RecentInsights } from '@/components/dashboard-v2/intelligence/RecentInsights';

export async function InsightsSection({ businessId }: { businessId: string }) {
  const sb = createSupabaseServerClient();
  const insights = await loadRecentInsights(sb, businessId);
  return <RecentInsights insights={insights} />;
}
