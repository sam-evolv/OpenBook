import { cookies } from 'next/headers';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { requireCurrentBusiness } from '@/lib/queries/business';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { Sidebar, type SidebarPlan } from '@/components/dashboard-v2/Sidebar';
import { ThemeProvider } from '@/components/dashboard-v2/ThemeProvider';

export const dynamic = 'force-dynamic';

interface BusinessContext {
  id: string;
  name: string;
  slug: string;
  plan: string | null;
}

function normalisePlan(raw: string | null | undefined): SidebarPlan {
  if (raw === 'pro' || raw === 'complete') return raw;
  return 'free';
}

/**
 * Pages still fetch their own business context via requireCurrentBusiness —
 * the layout's fetch is not shared with them. Minor perf cost, kept for
 * simplicity. The Messages unread count is fetched here because the
 * Sidebar badge needs it on every dashboard page; upcoming-bookings /
 * flash-sale signals are still zero/false placeholders until their
 * respective PRs.
 */
async function countUnreadMessages(businessId: string): Promise<number> {
  const sb = createSupabaseServerClient();
  // PostgREST can't compare two columns in one filter, so we fetch the
  // bounded set (≤200 rows per business in practice) and count in-memory.
  // This is the same shape loadInbox uses; consolidating into one loader
  // is polish.
  const { data } = await sb
    .from('whatsapp_conversations')
    .select('last_message_at, last_read_at')
    .eq('business_id', businessId)
    .limit(500);

  const rows = (data ?? []) as Array<{
    last_message_at: string | null;
    last_read_at: string | null;
  }>;
  return rows.filter(
    (r) => r.last_message_at && (!r.last_read_at || r.last_message_at > r.last_read_at),
  ).length;
}

function initialsFor(name: string | null | undefined): string {
  if (!name) return 'YO';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'YO';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { owner, business } = await requireCurrentBusiness<BusinessContext>(
    'id, name, slug, plan',
  );

  const themeCookie = cookies().get('theme')?.value;
  const theme: 'dark' | 'light' = themeCookie === 'light' ? 'light' : 'dark';

  const ownerName = owner.full_name ?? 'You';
  const initials = initialsFor(owner.full_name ?? null);

  const unreadMessagesCount = await countUnreadMessages(business.id);

  return (
    <ThemeProvider
      initialMode={theme}
      className={`${GeistSans.variable} ${GeistMono.variable} font-sans min-h-[100dvh] bg-paper-bg text-paper-text-1 dark:bg-ink-bg dark:text-ink-text-1`}
    >
      <div className="flex min-h-[100dvh]">
        <Sidebar
          businessName={business.name}
          businessSlug={business.slug}
          userName={ownerName}
          userInitials={initials}
          plan={normalisePlan(business.plan)}
          unreadMessagesCount={unreadMessagesCount}
          upcomingBookingsCount={0}
        />
        <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
      </div>
    </ThemeProvider>
  );
}
