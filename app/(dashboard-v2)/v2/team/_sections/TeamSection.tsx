import { createSupabaseServerClient } from '@/lib/supabase-server';
import { loadTeam } from '@/lib/dashboard-v2/team-queries';
import { TeamClient } from '@/components/dashboard-v2/team/TeamClient';

export async function TeamSection({
  businessId,
  ownerEmail,
}: {
  businessId: string;
  ownerEmail: string | null;
}) {
  const sb = createSupabaseServerClient();
  const payload = await loadTeam(sb, businessId, ownerEmail);
  return <TeamClient payload={payload} />;
}
