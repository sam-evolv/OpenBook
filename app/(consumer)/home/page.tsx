import { supabaseAdmin } from '@/lib/supabase';
import { ConsumerHeader } from '@/components/consumer/ConsumerHeader';
import { BottomTabBar } from '@/components/consumer/BottomTabBar';
import { HomeWallpaper } from '@/components/consumer/HomeWallpaper';
import { HomeTileGrid, type HomeBusiness } from '@/components/consumer/HomeTileGrid';

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

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Late night';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default async function HomePage() {
  const businesses = await getBusinesses();
  const greeting = timeGreeting();

  return (
    <main
      className="relative text-white antialiased overflow-hidden"
      style={{ height: '100dvh' }}
    >
      <HomeWallpaper />

      {/* iPhone-shaped frame on every viewport. The whole consumer
          surface is capped at `max-w-md` (28 rem ≈ 448 px, just wider
          than an iPhone Pro Max) and centred with `mx-auto`, so on a
          desktop monitor the page reads as an iPhone home screen
          floating in the centre. The inner column is a flex layout
          that fills 100dvh: header → greeting → grid (vertically
          centred) → page dots, with the BottomTabBar fixed-positioned
          outside this frame. */}
      <div className="relative mx-auto flex h-full w-full max-w-md flex-col">
        <ConsumerHeader showClose={false} />

        {/* Greeting — `mb-10` gives the OpenBook wordmark proper
            breathing room before the first row of icons. */}
        <header className="px-6 pt-3 pb-1 mb-10 animate-reveal-up">
          <p
            className="text-caption-eyebrow"
            style={{ color: 'var(--label-3)' }}
          >
            {greeting}
          </p>
          <h1
            className="mt-1 text-display leading-[0.95]"
            style={{ fontSize: '36px', color: 'var(--label-1)' }}
          >
            OpenBook<span style={{ color: 'var(--brand-gold)' }}>.</span>
          </h1>
        </header>

        {/* App grid — `flex-1` fills the space between greeting and
            dock; `justify-center` parks the icons in the middle of
            that space, exactly like an iPhone home page where the
            dock is anchored bottom and apps sit centred above it.
            `items-center` belt-and-braces the horizontal centring
            (some iPhone PWA contexts shift content right because of
            asymmetric safe-area-insets). `pb-28` reserves room for
            the floating BottomTabBar. */}
        <section
          className="flex flex-1 flex-col items-center justify-center px-5 pb-28 animate-reveal-up"
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
