import { createSupabaseServerClient, getCurrentOwner } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { HoursClient } from '@/components/dashboard/HoursClient';

export const dynamic = 'force-dynamic';

export default async function HoursPage() {
  const owner = await getCurrentOwner();
  if (!owner) redirect('/onboard');

  const sb = createSupabaseServerClient();
  const { data: business } = await sb
    .from('businesses')
    .select('id')
    .eq('owner_id', owner.id)
    .eq('is_live', true)
    .maybeSingle();

  if (!business) redirect('/onboard/flow');

  const { data: hours } = await sb
    .from('business_hours')
    .select('*')
    .eq('business_id', business.id)
    .order('day_of_week', { ascending: true });

  return <HoursClient businessId={business.id} initialHours={hours ?? []} />;
}
