import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { BottomTabBar } from '@/components/consumer/BottomTabBar';
import { HomeWallpaper } from '@/components/consumer/HomeWallpaper';
import { HomeSystemTilesRow } from '@/components/consumer/HomeSystemTilesRow';
import {
  HomePinnedTiles,
  HomePinnedTilesSkeleton,
} from '@/components/consumer/HomePinnedTiles';
import { fetchHomePins } from '@/lib/home-pins';
import {
  firstNameFrom,
  formatGreeting,
  getDublinHour,
  getGreetingBucket,
} from '@/lib/greeting';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getCustomerFirstName(): Promise<string | null> {
  const customerId = (await cookies()).get('ob_customer_id')?.value;
  if (!customerId) return null;
  const sb = supabaseAdmin();
  const { data } = await sb
    .from('customers')
    .select('full_name')
    .eq('id', customerId)
    .maybeSingle();
  return firstNameFrom(data?.full_name as string | null | undefined);
}

async function PinnedTilesSection() {
  const customerId = (await cookies()).get('ob_customer_id')?.value;
  if (!customerId) {
    return <HomePinnedTiles pins={[]} />;
  }
  const sb = supabaseAdmin();
  const pins = await fetchHomePins(sb, customerId);
  return <HomePinnedTiles pins={pins} />;
}

export default async function HomePage() {
  const firstName = await getCustomerFirstName();
  const greeting = formatGreeting(
    getGreetingBucket(getDublinHour(new Date())),
    firstName,
  );

  return (
    <main
      className="relative text-white antialiased overflow-hidden"
      style={{ height: '100dvh' }}
    >
      <HomeWallpaper />

      {/* iPhone-shaped frame. The whole consumer surface is capped at
          max-w-md (~448 px, just wider than an iPhone Pro Max) and centred,
          so on desktop the page reads as an iPhone home screen. The inner
          column is a flex layout that fills 100dvh: greeting → system tiles
          → pinned tiles (suspended), with BottomTabBar fixed outside. */}
      <div className="relative mx-auto flex h-full w-full max-w-md flex-col">
        <header className="mx-auto w-[336px] max-w-[calc(100%-40px)] px-0 pt-7 pb-1 mb-8 animate-reveal-up">
          <h1
            className="text-display leading-[0.95]"
            style={{ fontSize: '36px', color: 'var(--label-1)' }}
          >
            {greeting}
          </h1>
        </header>

        <section
          className="flex flex-1 flex-col items-center justify-start px-5 with-dock animate-reveal-up"
          style={{ animationDelay: '60ms', gap: 28 }}
        >
          <HomeSystemTilesRow />
          <Suspense fallback={<HomePinnedTilesSkeleton />}>
            <PinnedTilesSection />
          </Suspense>
        </section>
      </div>

      <BottomTabBar />
    </main>
  );
}
