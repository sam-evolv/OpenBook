import { redirect } from 'next/navigation';
import { createSupabaseServerClient, getCurrentOwner } from '@/lib/supabase-server';
import { ExternalLink, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const owner = await getCurrentOwner();
  if (!owner) redirect('/onboard');
  if (!owner.onboarding_completed) redirect('/onboard/flow');

  const sb = createSupabaseServerClient();
  const { data: business } = await sb
    .from('businesses')
    .select('name, slug, tagline, processed_icon_url, primary_colour')
    .eq('owner_id', owner.id)
    .maybeSingle();

  return (
    <main className="relative min-h-[100dvh] text-white">
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(900px 500px at 50% 0%, rgba(212,175,55,0.08), transparent 55%), linear-gradient(180deg, #050505 0%, #000 100%)',
        }}
      />

      <div className="mx-auto max-w-2xl px-6 pt-safe pb-12">
        <div className="pt-12 text-center animate-reveal-up">
          {business?.processed_icon_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={business.processed_icon_url}
              alt=""
              className="mx-auto mb-6 h-[88px] w-[88px] rounded-[20px]"
              style={{ boxShadow: '0 16px 40px rgba(0,0,0,0.5)' }}
            />
          )}
          <p className="text-caption-eyebrow mb-2" style={{ color: 'var(--brand-gold)' }}>
            Welcome back
          </p>
          <h1 className="text-display leading-[0.98]" style={{ fontSize: '38px' }}>
            {business?.name ?? 'Your dashboard'}
          </h1>
          {business?.tagline && (
            <p className="mt-3 text-[16px]" style={{ color: 'var(--label-2)' }}>
              {business.tagline}
            </p>
          )}
        </div>

        <div className="mt-12 rounded-[22px] p-8 mat-card-elevated text-center">
          <Sparkles className="mx-auto mb-4 h-8 w-8" style={{ color: 'var(--brand-gold)' }} strokeWidth={1.5} />
          <h2 className="text-title text-[20px]">Dashboard coming soon</h2>
          <p className="mt-2 text-[14px] max-w-[360px] mx-auto" style={{ color: 'var(--label-2)' }}>
            Your full business dashboard — bookings, services, calendar, insights — is being built. For now, your app is live.
          </p>

          {business?.slug && (
            <a
              href={`https://app.openbook.ie/business/${business.slug}`}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14px] font-semibold text-black active:scale-[0.98] transition-all"
              style={{
                background: 'linear-gradient(145deg, #F6D77C 0%, #D4AF37 50%, #8B6428 100%)',
                boxShadow: '0 8px 20px rgba(212, 175, 55, 0.3)',
              }}
            >
              View my live app
              <ExternalLink className="h-4 w-4" strokeWidth={2.2} />
            </a>
          )}
        </div>

        <p className="mt-8 text-center text-[12px]" style={{ color: 'var(--label-3)' }}>
          Signed in as {owner.email} ·{' '}
          <a href="/api/auth/signout" className="underline">
            Sign out
          </a>
        </p>
      </div>
    </main>
  );
}
