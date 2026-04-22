import { createSupabaseServerClient } from '@/lib/supabase-server';
import { loadGoal } from '@/lib/dashboard-v2/overview-queries';
import { GoalCard } from '@/components/dashboard-v2/overview/GoalCard';

export async function GoalSection({
  businessId,
  currentGoal,
}: {
  businessId: string;
  currentGoal: number | null;
}) {
  const sb = createSupabaseServerClient();
  const data = await loadGoal(sb, businessId, currentGoal);
  return <GoalCard data={data} />;
}
