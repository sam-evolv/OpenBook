import { createSupabaseServerClient, getCurrentOwner } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Euro, Users, TrendingUp, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
  const owner = await getCurrentOwner();
  if (!owner) redirect('/onboard');

  const sb = createSupabaseServerClient();

  const { data: business } = await sb
    .from('businesses')
    .select('id, name, slug')
    .eq('owner_id', owner.id)
    .eq('is_live', true)
    .maybeSingle();

  if (!business) redirect('/onboard/flow');

  /* Calculate stats in parallel */
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString();

  const [todayRes, weekRes, upcomingRes, customerCountRes] = await Promise.all([
    sb
      .from('bookings')
      .select('id, price_cents, status', { count: 'exact' })
      .eq('business_id', business.id)
      .gte('starts_at', startOfToday)
      .lt('starts_at', endOfToday)
      .neq('status', 'cancelled'),
    sb
      .from('bookings')
      .select('id, price_cents', { count: 'exact' })
      .eq('business_id', business.id)
      .gte('starts_at', startOfWeek)
      .neq('status', 'cancelled'),
    sb
      .from('bookings')
      .select('id, starts_at, status, price_cents, services(name), customers(first_name, last_name)')
      .eq('business_id', business.id)
      .gte('starts_at', now.toISOString())
      .neq('status', 'cancelled')
      .order('starts_at', { ascending: true })
      .limit(5),
    sb.from('customer_businesses').select('customer_id', { count: 'exact', head: true }).eq('business_id', business.id),
  ]);

  const todayCount = todayRes.count ?? 0;
  const todayRevenue = (todayRes.data ?? []).reduce((sum, b) => sum + (b.price_cents ?? 0), 0);
  const weekCount = weekRes.count ?? 0;
  const weekRevenue = (weekRes.data ?? []).reduce((sum, b) => sum + (b.price_cents ?? 0), 0);
  const upcoming = upcomingRes.data ?? [];
  const customerCount = customerCountRes.count ?? 0;

  const greeting = getGreeting();

  return (
    <div className="flex flex-col gap-8">
      {/* Greeting */}
      <div>
        <p
          className="text-[11px] font-semibold tracking-[0.14em] uppercase mb-1"
          style={{ color: '#D4AF37' }}
        >
          {greeting}
        </p>
        <h1 className="text-[28px] font-bold tracking-[-0.02em]">
          {owner.full_name ? `Welcome back, ${owner.full_name.split(' ')[0]}.` : 'Welcome back.'}
        </h1>
        <p className="mt-1 text-[14px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Here's what's happening at {business.name}.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard
          icon={Calendar}
          label="Bookings today"
          value={String(todayCount)}
        />
        <StatCard
          icon={Euro}
          label="Revenue today"
          value={`€${(todayRevenue / 100).toFixed(0)}`}
        />
        <StatCard
          icon={TrendingUp}
          label="This week"
          value={String(weekCount)}
          sublabel={`€${(weekRevenue / 100).toFixed(0)} revenue`}
        />
        <StatCard
          icon={Users}
          label="Total customers"
          value={String(customerCount)}
        />
      </div>

      {/* Upcoming bookings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-semibold">Upcoming bookings</h2>
          <Link
            href="/dashboard/bookings"
            className="flex items-center gap-1 text-[12px] font-medium"
            style={{ color: '#D4AF37' }}
          >
            View all
            <ArrowRight className="h-3 w-3" strokeWidth={2.2} />
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <div
            className="rounded-xl p-10 text-center"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '0.5px solid rgba(255,255,255,0.06)',
            }}
          >
            <Calendar
              className="mx-auto mb-3 h-6 w-6"
              style={{ color: 'rgba(255,255,255,0.3)' }}
              strokeWidth={1.5}
            />
            <p className="text-[14px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
              No upcoming bookings yet.
            </p>
            <p
              className="mt-1 text-[12px]"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              Share your booking link to start getting customers.
            </p>
          </div>
        ) : (
          <div
            className="rounded-xl overflow-hidden divide-y"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '0.5px solid rgba(255,255,255,0.06)',
            }}
          >
            {upcoming.map((b: any) => (
              <div key={b.id} className="flex items-center gap-4 p-4">
                <div
                  className="flex flex-col items-center justify-center rounded-lg px-3 py-2 shrink-0"
                  style={{ background: 'rgba(212,175,55,0.1)', minWidth: 52 }}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#D4AF37' }}>
                    {new Date(b.starts_at).toLocaleDateString('en-IE', { month: 'short' })}
                  </span>
                  <span className="text-[18px] font-bold leading-none mt-0.5" style={{ color: '#fff' }}>
                    {new Date(b.starts_at).getDate()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold truncate">
                    {b.customers?.first_name
                      ? `${b.customers.first_name} ${b.customers.last_name ?? ''}`.trim()
                      : 'Customer'}
                  </p>
                  <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {b.services?.name ?? 'Service'}
                    {' · '}
                    {new Date(b.starts_at).toLocaleTimeString('en-IE', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <span
                  className="text-[13px] font-semibold tabular-nums"
                  style={{ color: '#D4AF37' }}
                >
                  €{((b.price_cents ?? 0) / 100).toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-[16px] font-semibold mb-4">Quick actions</h2>
        <div className="grid grid-cols-3 gap-3">
          <QuickAction
            href="/dashboard/services"
            label="Edit services"
            description="Prices, duration, what you offer"
          />
          <QuickAction
            href="/dashboard/hours"
            label="Update hours"
            description="When you're open to customers"
          />
          <QuickAction
            href="/dashboard/settings"
            label="Business settings"
            description="Photos, info, payments"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
}: {
  icon: any;
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '0.5px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.5)' }} strokeWidth={1.8} />
        <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {label}
        </p>
      </div>
      <p className="text-[28px] font-bold tabular-nums leading-none">{value}</p>
      {sublabel && (
        <p className="mt-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {sublabel}
        </p>
      )}
    </div>
  );
}

function QuickAction({ href, label, description }: { href: string; label: string; description: string }) {
  return (
    <Link
      href={href}
      className="group block rounded-xl p-4 transition-colors"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '0.5px solid rgba(255,255,255,0.06)',
      }}
    >
      <p className="text-[14px] font-semibold mb-1">{label}</p>
      <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
        {description}
      </p>
    </Link>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
