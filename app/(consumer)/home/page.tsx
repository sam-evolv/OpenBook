import { supabaseAdmin, type Business } from '@/lib/supabase';
import { ConsumerHeader } from '@/components/consumer/ConsumerHeader';
import { BottomTabBar } from '@/components/consumer/BottomTabBar';
import { GlassAppIcon } from '@/components/consumer/GlassAppIcon';
import { SystemAppIcon } from '@/components/consumer/SystemAppIcon';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

async function getBusinesses(): Promise<Business[]> {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from('businesses')
    .select(
      'id, slug, name, category, city, primary_colour, cover_image_url, logo_url, description, price_tier, rating, is_live'
    )
    .eq('is_live', true)
    .order('name', { ascending: true });
  return (data ?? []) as Business[];
}

export default async function HomePage() {
  const businesses = await getBusinesses();

  return (
    <main className="relative min-h-[100dvh] text-white antialiased overflow-hidden">
      {/* iPhone-style wallpaper: dark with subtle gold glow */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(1200px 700px at 20% 0%, rgba(212,175,55,0.08), transparent 55%),
            radial-gradient(900px 500px at 90% 100%, rgba(60,60,80,0.25), transparent 60%),
            linear-gradient(180deg, #050505 0%, #000000 100%)
          `,
        }}
      />
      {/* Subtle grain */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'><filter id=\'n\'><feTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'2\'/></filter><rect width=\'100%\' height=\'100%\' filter=\'url(%23n)\'/></svg>")',
        }}
      />

      <ConsumerHeader showClose={false} />

      {/* Minimal greeting */}
      <div className="px-6 pt-4 pb-2">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-white/40 uppercase">
          Welcome to
        </p>
        <h1 className="mt-1 text-[32px] font-bold tracking-tight leading-none">
          OpenBook<span className="text-[#D4AF37]">.</span>
        </h1>
      </div>

      {/* Pure 4-across app grid — iPhone home screen feel */}
      <section className="mt-8 px-5 pb-40">
        <div className="grid grid-cols-4 gap-x-4 gap-y-7">
          {/* Discover — first system app */}
          <SystemAppIcon kind="discover" />

          {/* All live businesses as their own "apps" */}
          {businesses.map((biz) => (
            <GlassAppIcon key={biz.id} biz={biz} />
          ))}

          {/* Wallet + Me as trailing system apps */}
          <SystemAppIcon kind="wallet" />
          <SystemAppIcon kind="me" />
        </div>

        {/* Page indicator dots (iOS-style) */}
        <div className="mt-10 flex items-center justify-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/25" />
        </div>
      </section>

      <BottomTabBar />
    </main>
  );
}
