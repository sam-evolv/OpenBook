import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { BottomTabBar } from '@/components/consumer/BottomTabBar';
import { HomeWallpaper } from '@/components/consumer/HomeWallpaper';
import { HomeTileGrid, type HomeBusiness } from '@/components/consumer/HomeTileGrid';
import {
  firstNameFrom,
  formatGreeting,
  getDublinHour,
  getGreetingBucket,
} from '@/lib/greeting';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

async function getBusinesses(): Promise<HomeBusiness[]> {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from('businesses')
    .select(
      'id, slug, name, category, city, primary_colour, cover_image_url, logo_url, processed_icon_url, description, price_tier, rating, is_live, business_hours(day_of_week, open_time, close_time)'
    )
    .eq('is_live', true)
    .order('name', { ascending: true });
  return (data ?? []) as unknown as HomeBusiness[];
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
  const [businesses, firstName] = await Promise.all([
    getBusinesses(),
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

      {/* iPhone-shaped frame on every viewport. The whole consumer
          surface is capped at `max-w-md` (28 rem ~= 448 px, just wider
          than an iPhone Pro Max) and centred with `mx-auto`, so on a
          desktop monitor the page reads as an iPhone home screen
          floating in the centre. The inner column is a flex layout
          that fills 100dvh: safe-area → greeting → grid (vertically
          centred) → page dots, with the BottomTabBar fixed-positioned
          outside this frame. */}
      <div className="relative mx-auto flex h-full w-full max-w-md flex-col">
        {/* Greeting — single-line headline. No second-line wordmark; "OpenBook"
            in the greeting slot read like the product greeting itself. The
            body element already applies env(safe-area-inset-top) globally
            (see app/globals.css), so no per-page pt-safe is needed here. */}
        <header className="mx-auto w-[336px] max-w-[calc(100%-40px)] px-0 pt-7 pb-1 mb-8 animate-reveal-up">
          <h1
            className="text-display leading-[0.95]"
            style={{ fontSize: '36px', color: 'var(--label-1)' }}
          >
            {greeting}
          </h1>
        </header>

        {/* App grid — `justify-start` anchors the icons just below the
            greeting (iPhone home-screen pattern: apps near the top, dock
            anchored bottom). `pb-36` reserves room for the floating
            BottomTabBar so the page-dots indicator clears it. */}
        <section
          className="flex flex-1 flex-col items-center justify-start px-5 pb-36 animate-reveal-up"
          style={{ animationDelay: '60ms' }}
        >
          <HomeTileGrid businesses={businesses} />

          {/* iOS page dots */}
          <div className="mt-10 flex items-center justify-center gap-1.5">
            <span
              className="w-[7px] h-[7px] rounded-full"
              style={{ background: 'rgba(255,255,255,0.9)' }}
            />
            <span
              className="w-[7px] h-[7px] rounded-full"
              style={{ background: 'rgba(255,255,255,0.28)' }}
            />
          </div>
        </section>
      </div>

      <BottomTabBar />
    </main>
  );
}
