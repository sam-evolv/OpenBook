import { cookies } from 'next/headers';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { requireCurrentBusiness } from '@/lib/queries/business';
import { Sidebar } from '@/components/dashboard-v2/Sidebar';
import { ThemeProvider } from '@/components/dashboard-v2/ThemeProvider';

export const dynamic = 'force-dynamic';

interface BusinessContext {
  id: string;
  name: string;
  slug: string;
}

/**
 * Fixes the cutover gap from PR #30: v5b.2 DashboardNav was deleted but
 * the v2 Sidebar was never mounted in the route-group layout. Phase 1–3
 * pages rendered in isolation (TopBar + content only), so the missing
 * cross-page nav didn't surface until Messages needed the unread counter.
 *
 * Pages still fetch their own business context via requireCurrentBusiness —
 * the layout's fetch is not shared with them. Minor perf cost, kept for
 * simplicity. Unread / upcoming-bookings / flash-sale signals are passed
 * as zero/false placeholders here; the Messages PR wires them up properly.
 */
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
    'id, name, slug',
  );

  const themeCookie = cookies().get('theme')?.value;
  const theme: 'dark' | 'light' = themeCookie === 'light' ? 'light' : 'dark';

  const ownerName = owner.full_name ?? 'You';
  const initials = initialsFor(owner.full_name ?? null);

  return (
    <div
      data-theme={theme}
      className={`${GeistSans.variable} ${GeistMono.variable} font-sans min-h-[100dvh] bg-paper-bg text-paper-text-1 dark:bg-ink-bg dark:text-ink-text-1`}
    >
      <ThemeProvider initialMode={theme}>
        <div className="flex min-h-[100dvh]">
          <Sidebar
            businessName={business.name}
            businessSlug={business.slug}
            userName={ownerName}
            userInitials={initials}
            plan="Free"
            unreadMessagesCount={0}
            upcomingBookingsCount={0}
            hasLiveFlashSale={false}
          />
          <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
        </div>
      </ThemeProvider>
    </div>
  );
}
