import { createSupabaseServerClient, getCurrentOwner } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { ServicesClient } from '@/components/dashboard/ServicesClient';

export const dynamic = 'force-dynamic';

export default async function ServicesPage() {
  const owner = await getCurrentOwner();
  if (!owner) redirect('/onboard');

  const sb = createSupabaseServerClient();
  const { data: business } = await sb
    .from('businesses')
    .select('id, category')
    .eq('owner_id', owner.id)
    .eq('is_live', true)
    .maybeSingle();

  if (!business) redirect('/onboard/flow');

  const { data: services } = await sb
    .from('services')
    .select('*')
    .eq('business_id', business.id)
    .order('created_at', { ascending: true });

  return (
    <ServicesClient
      businessId={business.id}
      businessCategory={business.category}
      initialServices={services ?? []}
    />
  );
}
