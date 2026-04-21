import { cookies } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';
import { Gift, Package, Coins } from 'lucide-react';
import { supabaseAdmin, formatPrice } from '@/lib/supabase';
import { ConsumerHeader } from '@/components/consumer/ConsumerHeader';
import { BottomTabBar } from '@/components/consumer/BottomTabBar';
import { getTileColour } from '@/lib/tile-palette';
import { EmptyState, WalletEmptyIcon } from '@/components/EmptyState';

export const dynamic = 'force-dynamic';

type CreditRow = {
  id: string;
  amount_cents: number;
  reason: string | null;
  expires_at: string | null;
  businesses: {
    slug: string;
    name: string;
    primary_colour: string;
    cover_image_url: string | null;
  };
};

type PackageRow = {
  id: string;
  sessions_remaining: number;
  total_sessions: number;
  expires_at: string | null;
  package_name: string | null;
  businesses: {
    slug: string;
    name: string;
    primary_colour: string;
    cover_image_url: string | null;
  };
};

async function getWalletData() {
  const customerId = cookies().get('ob_customer_id')?.value;
  if (!customerId) return { credits: [], packages: [], totalCents: 0 };

  const sb = supabaseAdmin();
  const [{ data: credits }, { data: packages }] = await Promise.all([
    sb
      .from('customer_credits')
      .select(
        `
        id, amount_cents, reason, expires_at,
        businesses (slug, name, primary_colour, cover_image_url)
      `
      )
      .eq('customer_id', customerId)
      .gt('amount_cents', 0),
    sb
      .from('packages')
      .select(
        `
        id, sessions_remaining, total_sessions, expires_at, package_name,
        businesses (slug, name, primary_colour, cover_image_url)
      `
      )
      .eq('customer_id', customerId)
      .gt('sessions_remaining', 0),
  ]);

  const creditRows = (credits ?? []) as unknown as CreditRow[];
  const packageRows = (packages ?? []) as unknown as PackageRow[];
  const totalCents = creditRows.reduce((sum, c) => sum + c.amount_cents, 0);

  return { credits: creditRows, packages: packageRows, totalCents };
}

export default async function WalletPage() {
  const { credits, packages, totalCents } = await getWalletData();
  const walletIsEmpty = credits.length === 0 && packages.length === 0;

  return (
    <main className="relative min-h-[100dvh] text-white antialiased overflow-hidden">
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(900px 500px at 50% -10%, rgba(212,175,55,0.12), transparent 55%),' +
            'linear-gradient(180deg, #050505 0%, #020202 100%)',
        }}
      />

      <ConsumerHeader showClose={false} domain="openbook.ie" />

      <div className="px-5 pt-4 pb-36">
        <h1 className="text-[28px] font-bold tracking-tight leading-none">
          My <span className="text-[#D4AF37]">wallet</span>
        </h1>

        {walletIsEmpty ? (
          <EmptyState
            icon={<WalletEmptyIcon />}
            title="Your wallet's ready when you are"
            description="Credits and packages you buy from your favourite businesses show up here. Use them like cash."
          />
        ) : (
          <>
        {/* Balance hero */}
        <div
          className="
            mt-5 relative overflow-hidden rounded-[24px]
            border border-white/[0.08] p-5
          "
          style={{
            background:
              'radial-gradient(120% 140% at 100% 0%, rgba(212,175,55,0.25) 0%, rgba(212,175,55,0.04) 40%, rgba(10,10,10,0.6) 70%)',
          }}
        >
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none opacity-60"
            style={{
              background:
                'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.05) 50%, transparent 70%)',
            }}
          />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.14em] text-[#D4AF37] uppercase">
                Total credit
              </p>
              <p className="mt-2 text-[38px] font-bold tracking-tight leading-none">
                {formatPrice(totalCents)}
              </p>
              <p className="mt-2 text-[13px] text-white/60">
                Across {credits.length} {credits.length === 1 ? 'business' : 'businesses'}
              </p>
            </div>
            <div
              className="
                w-12 h-12 rounded-2xl flex items-center justify-center
                shadow-[0_8px_20px_rgba(212,175,55,0.35),inset_0_1px_0_rgba(255,255,255,0.3)]
              "
              style={{
                background: 'linear-gradient(145deg, #E8C76B 0%, #B8923A 100%)',
              }}
            >
              <Coins className="w-[22px] h-[22px] text-black/80" strokeWidth={2.2} />
            </div>
          </div>
        </div>

        {/* Credits by business */}
        <section className="mt-8">
          <h2 className="text-[11px] font-semibold tracking-[0.16em] text-white/40 mb-3 uppercase">
            Store credit
          </h2>
          {credits.length === 0 ? (
            <EmptyTile
              icon={<Gift className="w-7 h-7 text-white/25" strokeWidth={1.5} />}
              title="No credits yet"
              subtitle="Credits from cancellations or promos appear here."
            />
          ) : (
            <div className="flex flex-col gap-2.5">
              {credits.map((c) => (
                <Link
                  key={c.id}
                  href={`/business/${c.businesses.slug}`}
                  className="
                    flex items-center gap-3 p-3 rounded-2xl
                    bg-white/[0.03] border border-white/[0.06]
                    hover:border-white/[0.14] active:scale-[0.99] transition
                  "
                >
                  <div
                    className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0"
                    style={{
                      background: (() => {
                        const mid = getTileColour(c.businesses.primary_colour).mid;
                        return `linear-gradient(145deg, ${mid} 0%, ${mid}55 100%)`;
                      })(),
                    }}
                  >
                    {c.businesses.cover_image_url && (
                      <Image
                        src={c.businesses.cover_image_url}
                        alt={c.businesses.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-semibold tracking-tight truncate">
                      {c.businesses.name}
                    </h3>
                    {c.reason && (
                      <p className="text-[12px] text-white/50 truncate mt-0.5">
                        {c.reason}
                      </p>
                    )}
                  </div>
                  <span
                    className="text-[16px] font-bold tracking-tight"
                    style={{ color: getTileColour(c.businesses.primary_colour).mid }}
                  >
                    {formatPrice(c.amount_cents)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Packages */}
        <section className="mt-8">
          <h2 className="text-[11px] font-semibold tracking-[0.16em] text-white/40 mb-3 uppercase">
            Packages
          </h2>
          {packages.length === 0 ? (
            <EmptyTile
              icon={<Package className="w-7 h-7 text-white/25" strokeWidth={1.5} />}
              title="No active packages"
              subtitle="Buy a package of sessions from any business."
            />
          ) : (
            <div className="flex flex-col gap-2.5">
              {packages.map((p) => {
                const pct = Math.round(
                  (p.sessions_remaining / Math.max(1, p.total_sessions)) * 100
                );
                const colour = getTileColour(p.businesses.primary_colour).mid;
                return (
                  <Link
                    key={p.id}
                    href={`/business/${p.businesses.slug}`}
                    className="
                      block p-4 rounded-2xl
                      bg-white/[0.03] border border-white/[0.06]
                      hover:border-white/[0.14] active:scale-[0.99] transition
                    "
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0"
                        style={{
                          background: `linear-gradient(145deg, ${colour} 0%, ${colour}55 100%)`,
                        }}
                      >
                        {p.businesses.cover_image_url && (
                          <Image
                            src={p.businesses.cover_image_url}
                            alt={p.businesses.name}
                            fill
                            sizes="44px"
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-white/55">
                          {p.businesses.name}
                        </p>
                        <h3 className="text-[14px] font-semibold tracking-tight truncate">
                          {p.package_name ?? `${p.total_sessions}-session package`}
                        </h3>
                      </div>
                      <span className="text-[14px] font-bold" style={{ color: colour }}>
                        {p.sessions_remaining}/{p.total_sessions}
                      </span>
                    </div>
                    <div className="h-[6px] rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: colour,
                        }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
          </>
        )}
      </div>

      <BottomTabBar />
    </main>
  );
}

function EmptyTile({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div
      className="
        flex flex-col items-center justify-center
        py-10 px-6 rounded-2xl
        bg-white/[0.02] border border-dashed border-white/[0.08]
        text-center
      "
    >
      {icon}
      <p className="mt-3 text-[14px] font-medium text-white/70">{title}</p>
      <p className="mt-1 text-[12px] text-white/45 max-w-[240px]">{subtitle}</p>
    </div>
  );
}
