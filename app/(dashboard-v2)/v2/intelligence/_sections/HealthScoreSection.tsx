import { createSupabaseServerClient } from '@/lib/supabase-server';
import { loadHealthScore } from '@/lib/dashboard-v2/intelligence-queries';
import { HealthScoreHero } from '@/components/dashboard-v2/intelligence/HealthScoreHero';

export async function HealthScoreSection({
  businessId,
  category,
}: {
  businessId: string;
  category: string | null;
}) {
  const sb = createSupabaseServerClient();
  const health = await loadHealthScore(sb, businessId);
  return <HealthScoreHero health={health} category={category} />;
}
