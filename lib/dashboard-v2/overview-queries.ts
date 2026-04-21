import type { SupabaseClient } from '@supabase/supabase-js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dayKey(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return startOfDay(date).toISOString().slice(0, 10);
}

export interface MetricsPayload {
  revenueToday: number;
  revenueTodayDelta: number | null;
  revenueTodaySparkline: { v: number }[];
  bookingsToday: number;
  bookingsTodayDelta: number | null;
  bookingsTodaySparkline: { v: number }[];
  revenueThisWeek: number;
  revenueThisWeekDelta: number | null;
  revenueThisWeekSparkline: { v: number }[];
  activeCustomers: number;
  activeCustomersDelta: number | null;
  activeCustomersSparkline: { v: number }[];
}

interface BookingRow {
  starts_at: string;
  price_cents: number;
  status: string | null;
  customer_id: string;
}

function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Fetch the last 60 days of bookings once and derive every Overview metric
 * from that single query. Computed server-side per request — see the
 * 2026-04-22 computed-field policy in docs/dashboard-v2-brief.md.
 */
export async function loadMetrics(
  sb: SupabaseClient,
  businessId: string,
): Promise<MetricsPayload> {
  const now = new Date();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * MS_PER_DAY);

  const { data } = await sb
    .from('bookings')
    .select('starts_at, price_cents, status, customer_id')
    .eq('business_id', businessId)
    .gte('starts_at', sixtyDaysAgo.toISOString())
    .neq('status', 'cancelled');

  const rows = (data ?? []) as BookingRow[];

  const todayKey = dayKey(now);
  const yesterdayKey = dayKey(new Date(now.getTime() - MS_PER_DAY));

  const dailyRevenue: Record<string, number> = {};
  const dailyCount: Record<string, number> = {};

  for (const r of rows) {
    const k = dayKey(r.starts_at);
    dailyRevenue[k] = (dailyRevenue[k] ?? 0) + r.price_cents;
    dailyCount[k] = (dailyCount[k] ?? 0) + 1;
  }

  const sparkDays = (extract: (key: string) => number): { v: number }[] => {
    const out: { v: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const k = dayKey(new Date(now.getTime() - i * MS_PER_DAY));
      out.push({ v: extract(k) });
    }
    return out;
  };

  const revenueToday = (dailyRevenue[todayKey] ?? 0) / 100;
  const revenueYesterday = (dailyRevenue[yesterdayKey] ?? 0) / 100;
  const bookingsToday = dailyCount[todayKey] ?? 0;
  const bookingsYesterday = dailyCount[yesterdayKey] ?? 0;

  const sumRange = (fromDays: number, toDays: number, kind: 'revenue' | 'count'): number => {
    let total = 0;
    for (let i = fromDays; i < toDays; i++) {
      const k = dayKey(new Date(now.getTime() - i * MS_PER_DAY));
      total += kind === 'revenue' ? dailyRevenue[k] ?? 0 : dailyCount[k] ?? 0;
    }
    return total;
  };

  const revenueThisWeek = sumRange(0, 7, 'revenue') / 100;
  const revenueLastWeek = sumRange(7, 14, 'revenue') / 100;

  // Active customers: distinct customer_id per 30-day window
  const activeSet30 = new Set<string>();
  const activeSet60to30 = new Set<string>();
  const thirtyDaysAgoMs = now.getTime() - 30 * MS_PER_DAY;
  for (const r of rows) {
    const ts = new Date(r.starts_at).getTime();
    if (ts >= thirtyDaysAgoMs) activeSet30.add(r.customer_id);
    else activeSet60to30.add(r.customer_id);
  }
  const activeCustomers = activeSet30.size;
  const activePrior = activeSet60to30.size;

  // Active-customers sparkline: weekly buckets over last 7 days (same-day
  // distinct count is low signal for active-customer metric). We fall back
  // to dailyCount as the visual — "activity intensity" proxy.
  const activeSpark = sparkDays((k) => dailyCount[k] ?? 0);

  return {
    revenueToday: Math.round(revenueToday),
    revenueTodayDelta: pctDelta(revenueToday, revenueYesterday),
    revenueTodaySparkline: sparkDays((k) => Math.round((dailyRevenue[k] ?? 0) / 100)),
    bookingsToday,
    bookingsTodayDelta: pctDelta(bookingsToday, bookingsYesterday),
    bookingsTodaySparkline: sparkDays((k) => dailyCount[k] ?? 0),
    revenueThisWeek: Math.round(revenueThisWeek),
    revenueThisWeekDelta: pctDelta(revenueThisWeek, revenueLastWeek),
    revenueThisWeekSparkline: sparkDays((k) => Math.round((dailyRevenue[k] ?? 0) / 100)),
    activeCustomers,
    activeCustomersDelta: pctDelta(activeCustomers, activePrior),
    activeCustomersSparkline: activeSpark,
  };
}

export interface GoalPayload {
  goal: number | null;
  monthToDate: number;
  expectedByNow: number | null;
  daysRemaining: number;
  monthLabel: string;
  pctComplete: number | null;
}

export async function loadGoal(
  sb: SupabaseClient,
  businessId: string,
  currentGoal: number | null,
): Promise<GoalPayload> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysInMonth = monthEnd.getDate();
  const daysElapsed = now.getDate();
  const daysRemaining = daysInMonth - daysElapsed;

  const { data } = await sb
    .from('bookings')
    .select('price_cents, status')
    .eq('business_id', businessId)
    .gte('starts_at', monthStart.toISOString())
    .lte('starts_at', now.toISOString())
    .neq('status', 'cancelled');

  const monthToDate =
    ((data ?? []) as { price_cents: number }[]).reduce((s, r) => s + r.price_cents, 0) / 100;

  const goal = currentGoal;
  const expectedByNow = goal != null ? Math.round((goal * daysElapsed) / daysInMonth) : null;
  const pctComplete = goal != null && goal > 0 ? Math.round((monthToDate / goal) * 100) : null;

  return {
    goal: goal ?? null,
    monthToDate: Math.round(monthToDate),
    expectedByNow,
    daysRemaining,
    monthLabel: monthStart.toLocaleString('en-IE', { month: 'long' }),
    pctComplete,
  };
}

export interface InsightRow {
  id: string;
  headline: string;
  body: string;
  insight_type: string;
  generated_at: string;
}

export interface InsightsPayload {
  insights: InsightRow[];
  newCount: number;
}

export async function loadInsights(
  sb: SupabaseClient,
  businessId: string,
): Promise<InsightsPayload> {
  const { data } = await sb
    .from('ai_insights')
    .select('id, headline, body, insight_type, generated_at')
    .eq('business_id', businessId)
    .eq('dismissed', false)
    .order('generated_at', { ascending: false })
    .limit(6);

  const insights = (data ?? []) as InsightRow[];
  const sevenDaysAgo = Date.now() - 7 * MS_PER_DAY;
  const newCount = insights.filter((i) => new Date(i.generated_at).getTime() > sevenDaysAgo).length;

  return { insights, newCount };
}

export interface WaitlistEntry {
  id: string;
  customer_name: string;
  service_name: string | null;
  requested_date: string;
  added_at: string;
  notified_at: string | null;
}

export async function loadWaitlist(
  sb: SupabaseClient,
  businessId: string,
): Promise<WaitlistEntry[]> {
  const { data } = await sb
    .from('waitlist')
    .select(
      'id, created_at, requested_date, notified_at, customers(full_name, name), services(name)',
    )
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(5);

  return ((data ?? []) as unknown as Array<{
    id: string;
    created_at: string | null;
    requested_date: string;
    notified_at: string | null;
    customers: { full_name: string | null; name: string | null } | null;
    services: { name: string | null } | null;
  }>).map((w) => ({
    id: w.id,
    customer_name:
      w.customers?.full_name?.trim() || w.customers?.name?.trim() || 'Guest',
    service_name: w.services?.name ?? null,
    requested_date: w.requested_date,
    added_at: w.created_at ?? new Date().toISOString(),
    notified_at: w.notified_at,
  }));
}
