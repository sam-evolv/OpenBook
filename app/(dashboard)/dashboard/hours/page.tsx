import { createSupabaseServerClient, getCurrentOwner } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { HoursEditor } from '@/components/dashboard/HoursEditor';

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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[24px] font-bold tracking-[-0.02em]">Hours</h1>
        <p className="mt-1 text-[13px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
          When you're open to take bookings.
        </p>
      </div>

      <HoursEditor businessId={business.id} initialHours={hours ?? []} />
    </div>
  );
}
