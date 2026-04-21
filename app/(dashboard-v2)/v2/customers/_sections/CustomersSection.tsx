import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  loadCustomers,
  loadCustomerBookingHistory,
} from '@/lib/dashboard-v2/customers-queries';
import { CustomersClient } from '@/components/dashboard-v2/customers/CustomersClient';
import type { CohortFilter } from '@/components/dashboard-v2/customers/CustomerFilters';

interface CustomersSectionProps {
  businessId: string;
  businessSlug: string;
  cohort: CohortFilter;
  q: string;
}

export async function CustomersSection({
  businessId,
  businessSlug,
  cohort,
  q,
}: CustomersSectionProps) {
  const sb = createSupabaseServerClient();
  const payload = await loadCustomers(sb, businessId);

  // Pre-load history for the top 10 customers by LTV so the drawer opens
  // instantly for the most likely clicks. Remaining history loads via the
  // same helper if the owner clicks someone further down — small MVP
  // compromise vs one-drawer-one-roundtrip.
  const topIds = payload.customers.slice(0, 10).map((c) => c.id);
  const histories = await Promise.all(
    topIds.map((id) => loadCustomerBookingHistory(sb, businessId, id)),
  );
  const historyMap: Record<string, Awaited<ReturnType<typeof loadCustomerBookingHistory>>> = {};
  topIds.forEach((id, i) => {
    historyMap[id] = histories[i]!;
  });

  return (
    <CustomersClient
      payload={payload}
      cohort={cohort}
      q={q}
      businessSlug={businessSlug}
      previewHistory={historyMap}
    />
  );
}
