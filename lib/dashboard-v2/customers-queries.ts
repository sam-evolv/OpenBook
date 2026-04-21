import type { SupabaseClient } from '@supabase/supabase-js';
import { displayCustomerName } from './customer';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type CohortStatus = 'new' | 'regular' | 'slipping' | 'churned';

export interface CustomerRow {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  notes: string | null;
  favourited: boolean;
  booking_count: number;
  lifetime_value_cents: number;
  last_booking_at: string | null;
  first_booking_at: string | null;
  cohort: CohortStatus;
}

export interface CustomersPayload {
  customers: CustomerRow[];
  totalCustomers: number;
  totalFavourites: number;
  onPackages: number; // 0 in v1 — wired up in Phase 4 Packages
  avgLifetimeValueCents: number;
  cohortCounts: Record<CohortStatus | 'favourites' | 'all', number>;
}

/**
 * Per the 2026-04-24 heuristic documented in
 * docs/dashboard-v2-brief.md. Fallthrough is `slipping`, not `regular` —
 * ambiguous customers surface for owner attention rather than hide as
 * "regular".
 */
export function deriveCohort(
  bookingCount: number,
  firstBookingAt: string | null,
  lastBookingAt: string | null,
): CohortStatus {
  if (!lastBookingAt) {
    return 'slipping';
  }
  const now = Date.now();
  const daysSinceLast = (now - new Date(lastBookingAt).getTime()) / MS_PER_DAY;

  if (daysSinceLast > 60) return 'churned';

  if (bookingCount <= 3 && firstBookingAt) {
    const daysSinceFirst = (now - new Date(firstBookingAt).getTime()) / MS_PER_DAY;
    if (daysSinceFirst <= 30) return 'new';
  }

  if (bookingCount >= 3 && daysSinceLast <= 30) return 'regular';

  return 'slipping';
}

interface BookingRow {
  customer_id: string;
  starts_at: string;
  price_cents: number;
  status: string | null;
}

/**
 * Load every customer who's booked with this business + their favourite
 * flag from the customer_businesses pivot + their aggregates computed
 * server-side from the bookings table. Single pass.
 */
export async function loadCustomers(
  sb: SupabaseClient,
  businessId: string,
): Promise<CustomersPayload> {
  const [bookingsRes, pivotRes] = await Promise.all([
    sb
      .from('bookings')
      .select('customer_id, starts_at, price_cents, status')
      .eq('business_id', businessId)
      .neq('status', 'cancelled')
      .limit(5000),
    sb
      .from('customer_businesses')
      .select('customer_id, is_favourite')
      .eq('business_id', businessId),
  ]);

  const bookings = (bookingsRes.data ?? []) as BookingRow[];

  const favByCustomer = new Map<string, boolean>();
  for (const row of (pivotRes.data ?? []) as Array<{ customer_id: string; is_favourite: boolean | null }>) {
    favByCustomer.set(row.customer_id, !!row.is_favourite);
  }

  const aggMap = new Map<
    string,
    {
      count: number;
      ltv: number;
      first: string;
      last: string;
    }
  >();

  for (const b of bookings) {
    const cur = aggMap.get(b.customer_id);
    if (!cur) {
      aggMap.set(b.customer_id, {
        count: 1,
        ltv: b.price_cents,
        first: b.starts_at,
        last: b.starts_at,
      });
      continue;
    }
    cur.count += 1;
    cur.ltv += b.price_cents;
    if (b.starts_at < cur.first) cur.first = b.starts_at;
    if (b.starts_at > cur.last) cur.last = b.starts_at;
  }

  const customerIds = Array.from(aggMap.keys());
  if (customerIds.length === 0) {
    return {
      customers: [],
      totalCustomers: 0,
      totalFavourites: 0,
      onPackages: 0,
      avgLifetimeValueCents: 0,
      cohortCounts: { all: 0, favourites: 0, new: 0, regular: 0, slipping: 0, churned: 0 },
    };
  }

  const { data: custRows } = await sb
    .from('customers')
    .select('id, full_name, name, email, phone, whatsapp_number, notes')
    .in('id', customerIds);

  const customers: CustomerRow[] = ((custRows ?? []) as Array<{
    id: string;
    full_name: string | null;
    name: string | null;
    email: string | null;
    phone: string | null;
    whatsapp_number: string | null;
    notes: string | null;
  }>).map((c) => {
    const agg = aggMap.get(c.id)!;
    const cohort = deriveCohort(agg.count, agg.first, agg.last);
    return {
      id: c.id,
      display_name: displayCustomerName({ full_name: c.full_name, name: c.name }),
      email: c.email,
      phone: c.phone,
      whatsapp_number: c.whatsapp_number,
      notes: c.notes,
      favourited: favByCustomer.get(c.id) ?? false,
      booking_count: agg.count,
      lifetime_value_cents: agg.ltv,
      last_booking_at: agg.last,
      first_booking_at: agg.first,
      cohort,
    };
  });

  // Sort by LTV desc — high-value first.
  customers.sort((a, b) => b.lifetime_value_cents - a.lifetime_value_cents);

  const totalCustomers = customers.length;
  const totalFavourites = customers.filter((c) => c.favourited).length;
  const avgLifetimeValueCents =
    totalCustomers === 0
      ? 0
      : Math.round(
          customers.reduce((s, c) => s + c.lifetime_value_cents, 0) / totalCustomers,
        );

  const cohortCounts: CustomersPayload['cohortCounts'] = {
    all: totalCustomers,
    favourites: totalFavourites,
    new: 0,
    regular: 0,
    slipping: 0,
    churned: 0,
  };
  for (const c of customers) cohortCounts[c.cohort]++;

  return {
    customers,
    totalCustomers,
    totalFavourites,
    onPackages: 0, // Phase 4
    avgLifetimeValueCents,
    cohortCounts,
  };
}

/**
 * Last 5 bookings for a single customer — used by the CustomerDrawer.
 */
export async function loadCustomerBookingHistory(
  sb: SupabaseClient,
  businessId: string,
  customerId: string,
): Promise<
  Array<{
    id: string;
    starts_at: string;
    service_name: string | null;
    status: string | null;
    price_cents: number;
  }>
> {
  const { data } = await sb
    .from('bookings')
    .select('id, starts_at, status, price_cents, services(name)')
    .eq('business_id', businessId)
    .eq('customer_id', customerId)
    .order('starts_at', { ascending: false })
    .limit(5);

  return ((data ?? []) as unknown as Array<{
    id: string;
    starts_at: string;
    status: string | null;
    price_cents: number;
    services: { name: string | null } | null;
  }>).map((b) => ({
    id: b.id,
    starts_at: b.starts_at,
    service_name: b.services?.name ?? null,
    status: b.status,
    price_cents: b.price_cents,
  }));
}
