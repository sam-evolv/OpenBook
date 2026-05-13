import { cookies } from 'next/headers';
import Link from 'next/link';
import {
  Calendar,
  Shield,
  Wallet,
  HelpCircle,
  LogOut,
  ChevronRight,
  MessageSquare,
  Building2,
  type LucideIcon,
} from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase';
import { BottomTabBar } from '@/components/consumer/BottomTabBar';
import { AlertsList, type AlertSlot } from '@/components/consumer/AlertsList';
import { DeleteAccountButton } from './DeleteAccountButton';

export const dynamic = 'force-dynamic';

async function getCustomer() {
  const customerId = (await cookies()).get('ob_customer_id')?.value;
  if (!customerId) return null;
  const sb = supabaseAdmin();
  const { data } = await sb
    .from('customers')
    .select('id, full_name, email, phone, avatar_url, created_at')
    .eq('id', customerId)
    .maybeSingle();
  return data;
}

async function getAlertsForCustomer(customerId: string | null): Promise<AlertSlot[]> {
  if (!customerId) return [];
  const sb = supabaseAdmin();
  const { data } = await sb
    .from('standing_slots')
    .select(
      'id, business_id, category, city, max_price_cents, day_mask, time_start, time_end, active, paused_until, businesses:business_id(id, name, slug)',
    )
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  return (data ?? []) as unknown as AlertSlot[];
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
  const alerts = await getAlertsForCustomer(customer?.id ?? null);
  const name = customer?.full_name ?? 'Guest';
  const email = customer?.email ?? 'Sign in to sync your bookings';
  const initial = name[0]?.toUpperCase() ?? '?';
  const memberSince = customer?.created_at
    ? new Intl.DateTimeFormat('en-IE', {
        month: 'short',
        year: 'numeric',
      }).format(new Date(customer.created_at))
    : null;

  return (
    <main className="relative min-h-[100dvh] text-white antialiased overflow-hidden">
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(760px 420px at 50% -8%, rgba(212,175,55,0.14), transparent 58%),' +
            'radial-gradient(580px 340px at 8% 74%, rgba(212,175,55,0.06), transparent 62%),' +
            'linear-gradient(180deg, #050505 0%, #020202 100%)',
        }}
      />

      <div className="mx-auto max-w-md px-5 pb-40 pt-safe">
        <div className="pt-8" />

        {/* Identity card */}
        <div
          className="relative overflow-hidden rounded-[30px] p-5"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.075) 0%, rgba(255,255,255,0.035) 100%)',
            border: '0.5px solid rgba(255,255,255,0.12)',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.10), 0 18px 52px rgba(0,0,0,0.42)',
          }}
        >
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-px"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(246,215,124,0.46), transparent)',
            }}
          />
          <div className="flex items-center gap-4">
            <div
              className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full shadow-[0_16px_38px_rgba(212,175,55,0.28),inset_0_1px_0_rgba(255,255,255,0.32)]"
              style={{
                background:
                  'radial-gradient(circle at 30% 20%, #F6D77C 0%, #D4AF37 48%, #8A6429 100%)',
              }}
            >
              <span className="text-[28px] font-bold text-black/80">{initial}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#D4AF37]">
                {customer ? 'OpenBook account' : 'Welcome'}
              </p>
              <h1 className="mt-1 truncate text-[25px] font-bold leading-tight tracking-tight">
                {name}
              </h1>
              <p className="mt-0.5 truncate text-[13px] text-white/58">{email}</p>
            </div>
            {customer ? (
              <Link
                href="/me/edit"
                className="flex h-10 items-center rounded-full border border-white/[0.10] bg-white/[0.055] px-4 text-[12px] font-semibold text-white/90 transition hover:border-white/20 active:scale-95"
              >
                Edit
              </Link>
            ) : (
              <Link
                href="/login"
                className="flex h-10 items-center rounded-full bg-[#D4AF37] px-4 text-[12px] font-semibold text-black shadow-[0_8px_20px_rgba(212,175,55,0.28)] transition active:scale-95"
              >
                Sign in
              </Link>
            )}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <ProfilePill
              label={customer ? 'Bookings' : 'Sync'}
              value={customer ? 'Synced' : 'Sign in'}
            />
            <ProfilePill
              label={customer ? 'Member since' : 'Status'}
              value={memberSince ?? 'Guest'}
            />
          </div>
        </div>

        {/* For businesses promo */}
        <Link
          href="/onboard"
          className="
            mt-4 flex items-center gap-3 rounded-[24px] p-4
            border border-[#D4AF37]/28 bg-[#D4AF37]/[0.07]
            hover:border-[#D4AF37]/40 active:scale-[0.99]
            transition-all shadow-[0_14px_38px_rgba(0,0,0,0.22)]
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

        {/* Your alerts */}
        {customer && (
          <Section title="Your alerts">
            <AlertsList initialAlerts={alerts} />
          </Section>
        )}

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
      <div className="flex flex-col gap-2.5">{children}</div>
    </section>
  );
}

function ProfilePill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-white/[0.07] bg-black/20 px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/36">
        {label}
      </p>
      <p className="mt-1 truncate text-[13px] font-semibold text-white/86">
        {value}
      </p>
    </div>
  );
}

function MenuRow({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  const isExternal = href.startsWith('http') || href.startsWith('mailto:');
  const classes = `
        flex items-center gap-3 rounded-[20px] px-4 py-3.5
        bg-white/[0.04] border border-white/[0.075]
        hover:border-white/[0.16] active:scale-[0.99] transition
        shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]
      `;
  const content = (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.055]">
        <Icon className="h-[17px] w-[17px] text-white/66" strokeWidth={2} />
      </span>
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
