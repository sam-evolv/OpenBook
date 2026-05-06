import { cookies } from 'next/headers';
import Link from 'next/link';
import {
  Calendar,
  Shield,
  Wallet,
  HelpCircle,
  LogOut,
  ChevronRight,
  UserCircle2,
  MessageSquare,
  Building2,
} from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase';
import { ConsumerHeader } from '@/components/consumer/ConsumerHeader';
import { BottomTabBar } from '@/components/consumer/BottomTabBar';
import { DeleteAccountButton } from './DeleteAccountButton';

export const dynamic = 'force-dynamic';

async function getCustomer() {
  const customerId = cookies().get('ob_customer_id')?.value;
  if (!customerId) return null;
  const sb = supabaseAdmin();
  const { data } = await sb
    .from('customers')
    .select('id, full_name, email, phone, avatar_url, created_at')
    .eq('id', customerId)
    .maybeSingle();
  return data;
}

const ACCOUNT_ITEMS = [
  { href: '/consumer-bookings', icon: Calendar, label: 'My bookings' },
  { href: '/wallet', icon: Wallet, label: 'Wallet & credits' },
  { href: 'https://openbook.ie/privacy', icon: Shield, label: 'Privacy policy' },
];

const SUPPORT_ITEMS = [
  { href: 'mailto:support@openbook.ie', icon: HelpCircle, label: 'Help & support' },
  { href: 'mailto:feedback@openbook.ie', icon: MessageSquare, label: 'Send feedback' },
];

export default async function MePage() {
  const customer = await getCustomer();
  const name = customer?.full_name ?? 'Guest';
  const email = customer?.email ?? 'Sign in to sync your bookings';
  const initial = name[0]?.toUpperCase() ?? '?';

  return (
    <main className="relative min-h-[100dvh] text-white antialiased overflow-hidden">
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(800px 400px at 50% -10%, rgba(212,175,55,0.08), transparent 55%),' +
            'linear-gradient(180deg, #050505 0%, #020202 100%)',
        }}
      />

      <ConsumerHeader showClose={false} domain="openbook.ie" />

      <div className="px-5 pt-4 pb-36">
        {/* Identity card */}
        <div
          className="
            flex items-center gap-4 p-5 rounded-[24px]
            bg-white/[0.03] border border-white/[0.06]
          "
        >
          <div
            className="
              w-16 h-16 rounded-full flex items-center justify-center
              shadow-[0_8px_20px_rgba(212,175,55,0.35),inset_0_1px_0_rgba(255,255,255,0.3)]
              shrink-0
            "
            style={{
              background: 'linear-gradient(145deg, #E8C76B 0%, #B8923A 100%)',
            }}
          >
            <span className="text-[26px] font-bold text-black/80">{initial}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[22px] font-bold tracking-tight truncate leading-tight">
              {name}
            </h1>
            <p className="text-[13px] text-white/55 truncate">{email}</p>
          </div>
          {customer ? (
            <Link
              href="/me/edit"
              className="
                h-9 px-4 rounded-full text-[12px] font-semibold
                bg-white/[0.06] border border-white/[0.08]
                hover:border-white/20 active:scale-95 transition
                flex items-center
              "
            >
              Edit
            </Link>
          ) : (
            <Link
              href="/login"
              className="
                h-9 px-4 rounded-full text-[12px] font-semibold
                bg-[#D4AF37] text-black
                active:scale-95 transition
                flex items-center
              "
            >
              Sign in
            </Link>
          )}
        </div>

        {/* For businesses promo */}
        <Link
          href="/onboard"
          className="
            mt-4 flex items-center gap-3 p-4 rounded-2xl
            border border-[#D4AF37]/25 bg-[#D4AF37]/5
            hover:border-[#D4AF37]/40 active:scale-[0.99]
            transition-all
          "
        >
          <div
            className="
              w-10 h-10 rounded-xl flex items-center justify-center shrink-0
            "
            style={{
              background: 'linear-gradient(145deg, #E8C76B 0%, #B8923A 100%)',
            }}
          >
            <Building2 className="w-5 h-5 text-black/80" strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-white tracking-tight">
              Own a business?
            </p>
            <p className="text-[12px] text-white/55">
              Get your booking page live in 15 minutes.
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-[#D4AF37]" strokeWidth={2} />
        </Link>

        {/* Account */}
        <Section title="Account">
          {ACCOUNT_ITEMS.map((item) => (
            <MenuRow key={item.href} {...item} />
          ))}
        </Section>

        {/* Support */}
        <Section title="Support">
          {SUPPORT_ITEMS.map((item) => (
            <MenuRow key={item.href} {...item} />
          ))}
        </Section>

        {customer && (
          <Section>
            <Link
              href="/api/auth/signout"
              className="
                flex items-center gap-3 px-4 py-3.5 rounded-2xl
                bg-white/[0.03] border border-white/[0.06]
                hover:border-red-500/30 active:scale-[0.99] transition
                group
              "
            >
              <LogOut
                className="w-[18px] h-[18px] text-red-400 group-hover:text-red-300"
                strokeWidth={2}
              />
              <span className="text-[14px] font-semibold text-red-400 group-hover:text-red-300">
                Sign out
              </span>
            </Link>
          </Section>
        )}

        <Section title="Data & privacy">
          <MenuRow href="https://openbook.ie/terms" icon={Shield} label="Terms of service" />
          <DeleteAccountButton hasCustomer={Boolean(customer)} />
        </Section>

        <p className="mt-8 text-center text-[11px] text-white/30">
          OpenBook AI · A trading name of OpenHouse AI Limited
        </p>
      </div>

      <BottomTabBar />
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-7">
      {title && (
        <h2 className="text-[11px] font-semibold tracking-[0.16em] text-white/40 mb-3 uppercase">
          {title}
        </h2>
      )}
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

function MenuRow({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof UserCircle2;
  label: string;
}) {
  const isExternal = href.startsWith('http') || href.startsWith('mailto:');
  const classes = `
        flex items-center gap-3 px-4 py-3.5 rounded-2xl
        bg-white/[0.03] border border-white/[0.06]
        hover:border-white/[0.14] active:scale-[0.99] transition
      `;
  const content = (
    <>
      <Icon className="w-[18px] h-[18px] text-white/60" strokeWidth={2} />
      <span className="flex-1 text-[14px] font-medium text-white/90">
        {label}
      </span>
      <ChevronRight className="w-4 h-4 text-white/30" strokeWidth={2} />
    </>
  );

  if (isExternal) {
    return (
      <a href={href} className={classes}>
        {content}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className={classes}
    >
      {content}
    </Link>
  );
}
