import Link from 'next/link';
import { supabaseAdmin, type Business } from '@/lib/supabase';
import { ConsumerHeader } from '@/components/consumer/ConsumerHeader';
import { BottomTabBar } from '@/components/consumer/BottomTabBar';
import { GlassAppIcon } from '@/components/consumer/GlassAppIcon';
import { AssistantCard } from '@/components/consumer/AssistantCard';

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
      {/* Atmospheric background */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(1000px 600px at 20% -10%, rgba(212,175,55,0.10), transparent 60%),' +
            'radial-gradient(800px 500px at 90% 20%, rgba(60,60,80,0.35), transparent 55%),' +
            'linear-gradient(180deg, #050505 0%, #020202 100%)',
        }}
      />
      <div
        aria-hidden
        className="fixed inset-0 -z-10 opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'><filter id=\'n\'><feTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'2\'/></filter><rect width=\'100%\' height=\'100%\' filter=\'url(%23n)\'/></svg>")',
        }}
      />

      <ConsumerHeader showClose={false} />

      {/* Greeting */}
      <div className="px-6 pt-5 pb-3">
        <p className="text-[13px] font-medium tracking-[0.12em] text-white/45 uppercase">
          Welcome to
        </p>
        <h1 className="mt-1 text-[34px] font-bold tracking-tight leading-none">
          OpenBook
          <span className="text-[#D4AF37]">.</span>
        </h1>
        <p className="mt-2 text-[15px] text-white/60 leading-snug">
          Your local businesses, one tap away.
        </p>
      </div>

      {/* Assistant hero card */}
      <div className="px-5 mt-2">
        <AssistantCard />
      </div>

      {/* App grid */}
      <section className="px-5 mt-8 pb-32">
        <h2 className="text-[11px] font-semibold tracking-[0.16em] text-white/35 mb-4 uppercase">
          Your Apps
        </h2>
        <div className="grid grid-cols-4 gap-x-3 gap-y-6">
          {businesses.map((biz) => (
            <GlassAppIcon key={biz.id} biz={biz} />
          ))}
          <AddAppIcon />
        </div>

        {/* Explore shortcut */}
        <div className="mt-10">
          <Link
            href="/explore"
            className="
              flex items-center justify-between
              px-5 py-4 rounded-2xl
              bg-white/[0.03] border border-white/[0.06]
              hover:border-white/[0.12] active:scale-[0.99]
              transition-all
            "
          >
            <div>
              <p className="text-[15px] font-semibold tracking-tight">
                Discover more nearby
              </p>
              <p className="mt-0.5 text-[13px] text-white/55">
                Browse every business on OpenBook
              </p>
            </div>
            <div className="text-[#D4AF37] text-[20px]">→</div>
          </Link>
        </div>
      </section>

      <BottomTabBar />
    </main>
  );
}

function AddAppIcon() {
  return (
    <Link href="/explore" className="group flex flex-col items-center">
      <div
        className="
          w-[62px] h-[62px] rounded-[18px]
          flex items-center justify-center
          bg-white/[0.04] border border-dashed border-white/[0.12]
          active:scale-95 transition
          text-white/40 text-[26px] font-light
        "
      >
        +
      </div>
      <span className="mt-2 text-[11px] font-medium text-white/50 text-center max-w-[78px] truncate">
        Add app
      </span>
    </Link>
  );
}
