import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { getCurrentOwner } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function DashboardV2Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const owner = await getCurrentOwner();
  if (!owner) redirect('/onboard');
  if (!owner.onboarding_completed) redirect('/onboard/flow');

  const themeCookie = cookies().get('theme')?.value;
  const theme = themeCookie === 'light' ? 'light' : 'dark';

  return (
    <div
      data-theme={theme}
      className={`${GeistSans.variable} ${GeistMono.variable} font-sans min-h-[100dvh] bg-white text-neutral-900 dark:bg-[#08090B] dark:text-neutral-50`}
    >
      {children}
    </div>
  );
}
