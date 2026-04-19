import { createSupabaseServerClient, getCurrentOwner } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { ServicesEditor } from '@/components/dashboard/ServicesEditor';

export const dynamic = 'force-dynamic';

export default async function ServicesPage() {
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

  const { data: services } = await sb
    .from('services')
    .select('*')
    .eq('business_id', business.id)
    .order('created_at', { ascending: true });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[24px] font-bold tracking-[-0.02em]">Services</h1>
        <p className="mt-1 text-[13px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Add, edit, or remove what customers can book.
        </p>
      </div>

      <ServicesEditor businessId={business.id} initialServices={services ?? []} />
    </div>
  );
}
