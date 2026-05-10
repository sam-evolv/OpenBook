import { requireCurrentBusiness } from '@/lib/queries/business';
import { CatalogClient, type CatalogTabId } from '@/components/dashboard-v2/CatalogClient';
import type { ServiceRow } from '@/components/dashboard-v2/ServiceDrawer';

export const dynamic = 'force-dynamic';

const VALID_TABS: CatalogTabId[] = ['services'];

export default async function CatalogV2Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const { business, sb } = await requireCurrentBusiness<{ id: string }>('id');
  const activeTab: CatalogTabId = VALID_TABS.includes(sp.tab as CatalogTabId)
    ? (sp.tab as CatalogTabId)
    : 'services';

  // `services` has no `created_at` column — ordering by it silently
  // returned zero rows (PostgREST 42703 swallowed by the client + our
  // `data ?? []` fallback). Owners saw an empty Catalog despite
  // services existing. `sort_order` is the semantically-correct key
  // anyway — owners can manually reorder services from the editor.
  const { data: servicesData } = await sb
    .from('services')
    .select('id, name, description, duration_minutes, price_cents, is_active')
    .eq('business_id', business.id)
    .order('sort_order', { ascending: true, nullsFirst: false });
  const services = (servicesData ?? []) as ServiceRow[];

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recent } = await sb
    .from('bookings')
    .select('service_id')
    .eq('business_id', business.id)
    .gte('created_at', thirtyDaysAgo)
    .neq('status', 'cancelled');

  const bookingCounts: Record<string, number> = {};
  for (const row of (recent ?? []) as { service_id: string | null }[]) {
    if (!row.service_id) continue;
    bookingCounts[row.service_id] = (bookingCounts[row.service_id] ?? 0) + 1;
  }
  const totalRecentBookings = Object.values(bookingCounts).reduce((a, b) => a + b, 0);

  return (
    <CatalogClient
      activeTab={activeTab}
      services={services}
      bookingCounts={bookingCounts}
      totalRecentBookings={totalRecentBookings}
    />
  );
}
