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
    <main className="relative min-h-[100dvh] text-white antialiased">
      <HomeWallpaper />
      <ConsumerHeader showClose={false} />

      {/* Greeting — real typography, not just "bold" */}
      <header className="px-6 pt-3 pb-1 animate-reveal-up">
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

      {/* App grid */}
      <section
        className="mt-10 px-5 pb-44 animate-reveal-up"
        style={{ animationDelay: '60ms' }}
      >
        <HomeTileGrid businesses={businesses} />

        {/* iOS page dots */}
        <div className="mt-12 flex items-center justify-center gap-1.5">
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

      <BottomTabBar />
    </main>
  );
}
