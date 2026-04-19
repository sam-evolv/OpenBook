import { createSupabaseServerClient, getCurrentOwner } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { SettingsEditor } from '@/components/dashboard/SettingsEditor';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const owner = await getCurrentOwner();
  if (!owner) redirect('/onboard');

  const sb = createSupabaseServerClient();
  const { data: business } = await sb
    .from('businesses')
    .select('*')
    .eq('owner_id', owner.id)
    .eq('is_live', true)
    .maybeSingle();

  if (!business) redirect('/onboard/flow');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[24px] font-bold tracking-[-0.02em]">Settings</h1>
        <p className="mt-1 text-[13px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Update your business info, branding, and photos.
        </p>
      </div>

      <SettingsEditor initialBusiness={business} />
    </div>
  );
}
