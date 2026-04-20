import { redirect } from 'next/navigation';
import { getCurrentOwner, createSupabaseServerClient } from '@/lib/supabase-server';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { DashboardThemeProvider } from '@/components/dashboard/ThemeProvider';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import './dashboard.css';

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
    <div
      className={`dashboard-root min-h-[100dvh] flex ${GeistSans.variable} ${GeistMono.variable}`}
      data-theme="dark"
      style={{ background: 'var(--bg-0)', color: 'var(--fg-0)' }}
    >
      <DashboardThemeProvider>
        <DashboardNav business={business} ownerName={owner.full_name ?? undefined} />
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
        </main>
      </DashboardThemeProvider>
    </div>
  );
}
