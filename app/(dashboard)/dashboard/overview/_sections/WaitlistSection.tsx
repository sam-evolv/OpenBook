import { createSupabaseServerClient } from '@/lib/supabase-server';
import { loadWaitlist } from '@/lib/dashboard-v2/overview-queries';
import { WaitlistCard } from '@/components/dashboard-v2/overview/WaitlistCard';

export async function WaitlistSection({ businessId }: { businessId: string }) {
  const sb = createSupabaseServerClient();
  const entries = await loadWaitlist(sb, businessId);
  return <WaitlistCard entries={entries} />;
}
