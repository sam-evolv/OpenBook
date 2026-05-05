import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentOwner } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * Lives in (dashboard-public) — outside the (dashboard) route group —
 * so the layout's requireCurrentBusiness gate doesn't fire and loop us
 * back here. Reached when a signed-in owner has no live business
 * (e.g. seeded data missing, business toggled off, owner_id mismatch).
 */
export default async function NoBusinessPage() {
  const owner = await getCurrentOwner();
  if (!owner) redirect('/onboard');

  return (
    <main className="min-h-[100dvh] bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div
          aria-hidden
          className="mx-auto h-16 w-16 rounded-2xl flex items-center justify-center"
          style={{
            background:
              'radial-gradient(ellipse at 30% 20%, #F6D77C 0%, #D4AF37 45%, #7A5418 100%)',
          }}
        >
          <span className="text-2xl font-bold text-black">!</span>
        </div>
        <h1 className="text-2xl font-semibold">No business found</h1>
        <p className="text-sm text-white/70 leading-relaxed">
          You're signed in as <span className="text-white">{owner.full_name ?? 'this account'}</span>,
          but no live business is linked to your account. If you've just signed
          in and expected to see your dashboard, your owner profile may not
          match the business record.
        </p>
        <div className="flex flex-col gap-2">
          <Link
            href="/onboard/flow"
            className="h-11 rounded-full bg-[#D4AF37] text-black font-semibold flex items-center justify-center active:scale-95 transition"
          >
            Set up a business
          </Link>
          <a
            href="/api/auth/signout"
            className="h-11 rounded-full bg-white/[0.06] border border-white/[0.08] text-white text-sm font-medium hover:border-white/20 active:scale-95 transition flex items-center justify-center"
          >
            Sign out and try a different account
          </a>
        </div>
        <p className="text-xs text-white/40">
          Need help? Email{' '}
          <a className="underline" href="mailto:support@openbook.ie">
            support@openbook.ie
          </a>
        </p>
      </div>
    </main>
  );
}
