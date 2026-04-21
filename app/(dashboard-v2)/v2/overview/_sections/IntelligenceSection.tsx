import { createSupabaseServerClient } from '@/lib/supabase-server';
import { loadInsights } from '@/lib/dashboard-v2/overview-queries';
import { IntelligenceGrid } from '@/components/dashboard-v2/overview/IntelligenceGrid';

const KNOWN_INSIGHT_TYPES = new Set(['opportunity', 'warning', 'trend']);

export async function IntelligenceSection({ businessId }: { businessId: string }) {
  const sb = createSupabaseServerClient();
  const data = await loadInsights(sb, businessId);

  for (const i of data.insights) {
    if (!KNOWN_INSIGHT_TYPES.has(i.insight_type)) {
      console.warn('Unknown insight_type:', i.insight_type);
    }
  }

  return <IntelligenceGrid data={data} />;
}
