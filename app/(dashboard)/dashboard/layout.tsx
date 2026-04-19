import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentOwner, createSupabaseServerClient } from '@/lib/supabase-server';
import { DashboardNav } from '@/components/dashboard/DashboardNav';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const owner = await getCurrentOwner();
  if (!owner) redirect('/onboard');
  if (!owner.onboarding_completed) redirect('/onboard/flow');

  const sb = createSupabaseServerClient();
  const { data: business } = await sb
    .from('businesses')
    .select('id, name, slug, processed_icon_url, primary_colour')
    .eq('owner_id', owner.id)
    .eq('is_live', true)
    .maybeSingle();

  if (!business) redirect('/onboard/flow');

  return (
    <div className="min-h-[100dvh] bg-[#050505] text-white flex">
      <DashboardNav business={business} />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
