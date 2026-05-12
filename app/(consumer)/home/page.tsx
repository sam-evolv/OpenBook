import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { BottomTabBar } from '@/components/consumer/BottomTabBar';
import { HomeWallpaper } from '@/components/consumer/HomeWallpaper';
import { HomeTileGrid } from '@/components/consumer/HomeTileGrid';
import { fetchHomePins, type HomePinWithBusiness } from '@/lib/home-pins';
import {
  firstNameFrom,
  formatGreeting,
  getDublinHour,
  getGreetingBucket,
} from '@/lib/greeting';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getPins(): Promise<HomePinWithBusiness[]> {
  const customerId = (await cookies()).get('ob_customer_id')?.value;
  if (!customerId) return [];
  const sb = supabaseAdmin();
  return fetchHomePins(sb, customerId);
}

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

export default async function HomePage() {
  const [pins, firstName] = await Promise.all([
    getPins(),
    getCustomerFirstName(),
  ]);
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
          column is a flex layout that fills 100dvh: greeting → grid
          (anchored top) → empty space, with BottomTabBar fixed outside. */}
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
          className="flex flex-1 flex-col items-center justify-start px-5 pb-36 animate-reveal-up"
          style={{ animationDelay: '60ms' }}
        >
          <HomeTileGrid pins={pins} />
        </section>
      </div>

      <BottomTabBar />
    </main>
  );
}
