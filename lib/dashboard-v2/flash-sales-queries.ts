import type { SupabaseClient } from '@supabase/supabase-js';
import { deriveCohort, type CohortStatus } from './customers-queries';

/**
 * Flash Sales data layer — Stage 1.
 *
 * Stage 1 is a dry-run product: owners can create, view, and discard
 * drafts; "Publish (dry run)" materialises flash_sale_notifications
 * rows but never hits the WhatsApp API. Stage 2 wires the send.
 *
 * Derived state lives here, not in the DB. The `flash_sales.status`
 * column stores the authoritative value (`draft | scheduled | deleted`
 * for Stage 1); the UI-level "Upcoming / Active / Past" classification
 * is computed from (status, slot_time, expires_at, bookings_taken).
 */

export type FlashSaleUiState = 'draft' | 'upcoming' | 'past';

export type TargetAudience = 'all' | 'favourites' | 'slipping' | 'churned';

export const TARGET_AUDIENCES: ReadonlyArray<{
  value: TargetAudience;
  label: string;
  hint: string;
}> = [
  { value: 'all', label: 'All customers', hint: 'Everyone who has booked with you' },
  { value: 'favourites', label: 'Favourites', hint: 'Customers you\u2019ve starred' },
  {
    value: 'slipping',
    label: 'Slipping',
    hint: 'Used to come regularly, showing early signs of dropping off',
  },
  {
    value: 'churned',
    label: 'Churned',
    hint: 'Haven\u2019t booked in 60+ days',
  },
];

export interface FlashSaleRow {
  id: string;
  service_id: string | null;
  service_name: string | null;
  slot_time: string;
  expires_at: string;
  discount_percent: number;
  original_price_cents: number;
  sale_price_cents: number;
  max_bookings: number | null;
  bookings_taken: number | null;
  message: string | null;
  status: string | null;
  created_at: string | null;
  ui_state: FlashSaleUiState;
  notifications_total: number;
  notifications_queued: number;
  notifications_blocked: number;
}

export interface QuietSuggestion {
  /** ISO datetime of the proposed slot. */
  slot_time: string;
  /** Which 2-hour window this was picked from, for UX copy. */
  window_label: string;
  /** Bookings already on the Calendar for that slot's hour-bucket. */
  existing_bookings: number;
}

export interface FlashSalesPayload {
  services: Array<{
    id: string;
    name: string;
    price_cents: number;
    duration_minutes: number;
  }>;
  sales: FlashSaleRow[];
  countsByUiState: Record<FlashSaleUiState, number>;
  suggestions: QuietSuggestion[];
  audienceCounts: Record<TargetAudience, number>;
  optedInCount: number;
  totalCustomerCount: number;
}

interface FlashSaleRaw {
  id: string;
  service_id: string | null;
  slot_time: string;
  expires_at: string;
  discount_percent: number;
  original_price_cents: number;
  sale_price_cents: number;
  max_bookings: number | null;
  bookings_taken: number | null;
  message: string | null;
  status: string | null;
  created_at: string | null;
  services: { name: string | null } | null;
}

interface NotificationRollup {
  sale_id: string;
  status: string;
}

function classifyUiState(row: FlashSaleRaw): FlashSaleUiState | 'deleted' {
  if (row.status === 'deleted') return 'deleted';
  if (row.status === 'draft') return 'draft';
  const now = Date.now();
  const expiresMs = new Date(row.expires_at).getTime();
  const soldOut =
    row.max_bookings != null && (row.bookings_taken ?? 0) >= row.max_bookings;
  if (expiresMs <= now || soldOut) return 'past';
  return 'upcoming';
}

export async function loadFlashSales(
  sb: SupabaseClient,
  businessId: string,
): Promise<FlashSalesPayload> {
  const [salesRes, servicesRes, customersAgg, pivotRes] = await Promise.all([
    sb
      .from('flash_sales')
      .select(
        'id, service_id, slot_time, expires_at, discount_percent, original_price_cents, sale_price_cents, max_bookings, bookings_taken, message, status, created_at, services(name)',
      )
      .eq('business_id', businessId)
      .neq('status', 'deleted')
      .order('slot_time', { ascending: true })
      .limit(200),
    sb
      .from('services')
      .select('id, name, price_cents, duration_minutes')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true, nullsFirst: false }),
    loadCustomerAudienceAggregates(sb, businessId),
    sb
      .from('customer_businesses')
      .select('customer_id, promo_opt_in')
      .eq('business_id', businessId),
  ]);

  const salesRaw = (salesRes.data ?? []) as unknown as FlashSaleRaw[];
  const services = ((servicesRes.data ?? []) as Array<{
    id: string;
    name: string;
    price_cents: number;
    duration_minutes: number;
  }>).map((s) => s);

  const pivotRows = (pivotRes.data ?? []) as Array<{
    customer_id: string;
    promo_opt_in: boolean;
  }>;
  const totalCustomerCount = pivotRows.length;
  const optedInCount = pivotRows.filter((r) => r.promo_opt_in).length;

  // Notification roll-up per sale (status counts).
  const saleIds = salesRaw.map((s) => s.id);
  let notificationsBySale = new Map<string, { total: number; queued: number; blocked: number }>();
  if (saleIds.length > 0) {
    const { data: notifData } = await sb
      .from('flash_sale_notifications')
      .select('sale_id, status')
      .in('sale_id', saleIds);
    const rows = (notifData ?? []) as unknown as NotificationRollup[];
    for (const r of rows) {
      const entry = notificationsBySale.get(r.sale_id) ?? {
        total: 0,
        queued: 0,
        blocked: 0,
      };
      entry.total += 1;
      if (r.status === 'queued') entry.queued += 1;
      if (r.status === 'blocked') entry.blocked += 1;
      notificationsBySale.set(r.sale_id, entry);
    }
  }

  const sales: FlashSaleRow[] = [];
  for (const raw of salesRaw) {
    const ui = classifyUiState(raw);
    if (ui === 'deleted') continue;
    const notif = notificationsBySale.get(raw.id);
    sales.push({
      id: raw.id,
      service_id: raw.service_id,
      service_name: raw.services?.name ?? null,
      slot_time: raw.slot_time,
      expires_at: raw.expires_at,
      discount_percent: raw.discount_percent,
      original_price_cents: raw.original_price_cents,
      sale_price_cents: raw.sale_price_cents,
      max_bookings: raw.max_bookings,
      bookings_taken: raw.bookings_taken,
      message: raw.message,
      status: raw.status,
      created_at: raw.created_at,
      ui_state: ui,
      notifications_total: notif?.total ?? 0,
      notifications_queued: notif?.queued ?? 0,
      notifications_blocked: notif?.blocked ?? 0,
    });
  }

  const countsByUiState: Record<FlashSaleUiState, number> = {
    draft: 0,
    upcoming: 0,
    past: 0,
  };
  for (const s of sales) countsByUiState[s.ui_state] += 1;

  const suggestions = await loadQuietSuggestions(sb, businessId);

  return {
    services,
    sales,
    countsByUiState,
    suggestions,
    audienceCounts: customersAgg.audienceCounts,
    optedInCount,
    totalCustomerCount,
  };
}

/**
 * Aggregate customers per target audience bucket for the preview count
 * in the create drawer. Reuses the cohort heuristic from
 * customers-queries. Bounded in-memory — fine under a few thousand
 * customers per business.
 */
async function loadCustomerAudienceAggregates(
  sb: SupabaseClient,
  businessId: string,
): Promise<{ audienceCounts: Record<TargetAudience, number> }> {
  const [bookingsRes, pivotRes] = await Promise.all([
    sb
      .from('bookings')
      .select('customer_id, starts_at, status')
      .eq('business_id', businessId)
      .neq('status', 'cancelled')
      .limit(5000),
    sb
      .from('customer_businesses')
      .select('customer_id, is_favourite')
      .eq('business_id', businessId),
  ]);

  const bookings = (bookingsRes.data ?? []) as Array<{
    customer_id: string;
    starts_at: string;
  }>;
  const pivotRows = (pivotRes.data ?? []) as Array<{
    customer_id: string;
    is_favourite: boolean | null;
  }>;

  const aggByCustomer = new Map<string, { count: number; first: string; last: string }>();
  for (const b of bookings) {
    const cur = aggByCustomer.get(b.customer_id);
    if (!cur) {
      aggByCustomer.set(b.customer_id, {
        count: 1,
        first: b.starts_at,
        last: b.starts_at,
      });
      continue;
    }
    cur.count += 1;
    if (b.starts_at < cur.first) cur.first = b.starts_at;
    if (b.starts_at > cur.last) cur.last = b.starts_at;
  }

  let all = 0;
  let favourites = 0;
  const cohortCounts: Record<CohortStatus, number> = {
    new: 0,
    regular: 0,
    slipping: 0,
    churned: 0,
  };

  const favByCustomer = new Map<string, boolean>();
  for (const p of pivotRows) favByCustomer.set(p.customer_id, !!p.is_favourite);

  for (const [customerId, agg] of aggByCustomer) {
    all += 1;
    if (favByCustomer.get(customerId)) favourites += 1;
    const cohort = deriveCohort(agg.count, agg.first, agg.last);
    cohortCounts[cohort] += 1;
  }

  return {
    audienceCounts: {
      all,
      favourites,
      slipping: cohortCounts.slipping,
      churned: cohortCounts.churned,
    },
  };
}

/**
 * Top 3 quiet-window suggestions over the next 7 days.
 *
 * Extends the Calendar's QuietZoneNudge heuristic:
 *  - Look at weekday afternoons (Mon–Sat, 13:00–17:00)
 *  - Count confirmed/pending bookings in that window per upcoming date
 *  - Rank ascending, take top 3 with 0–2 bookings
 *
 * Returns the mid-window slot time (15:00) as the proposed sale slot.
 * Owner can edit in the create drawer before saving. Cap: 3 to match
 * the sub-prereq decision.
 */
export async function loadQuietSuggestions(
  sb: SupabaseClient,
  businessId: string,
): Promise<QuietSuggestion[]> {
  const now = new Date();
  const in7 = new Date(now);
  in7.setDate(in7.getDate() + 7);

  const { data: bookingsData } = await sb
    .from('bookings')
    .select('starts_at, status')
    .eq('business_id', businessId)
    .neq('status', 'cancelled')
    .gte('starts_at', now.toISOString())
    .lte('starts_at', in7.toISOString())
    .limit(2000);

  const bookings = (bookingsData ?? []) as Array<{ starts_at: string }>;

  // Bucket by date (YYYY-MM-DD) → count of bookings in 13:00–17:00.
  const countsByDate = new Map<string, number>();
  for (const b of bookings) {
    const d = new Date(b.starts_at);
    const hour = d.getHours();
    if (hour < 13 || hour >= 17) continue;
    if (d.getDay() === 0) continue; // Sun — closed by default
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    countsByDate.set(key, (countsByDate.get(key) ?? 0) + 1);
  }

  // Enumerate upcoming weekday afternoons over the next 7 days.
  const candidates: Array<{ key: string; slot: Date; count: number }> = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    if (d.getDay() === 0) continue;
    d.setHours(15, 0, 0, 0);
    if (d.getTime() <= now.getTime()) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    candidates.push({ key, slot: d, count: countsByDate.get(key) ?? 0 });
  }

  candidates.sort((a, b) => a.count - b.count);

  return candidates
    .filter((c) => c.count <= 2)
    .slice(0, 3)
    .map((c) => ({
      slot_time: c.slot.toISOString(),
      window_label: `${c.slot.toLocaleDateString('en-IE', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
      })} · 13:00\u201317:00`,
      existing_bookings: c.count,
    }));
}
