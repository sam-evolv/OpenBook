import { createClient } from '@/lib/supabase/server';
import type {
  AIInsight,
  AnalyticsBooking,
  AnalyticsBundle,
  AnalyticsCustomer,
  AnalyticsReview,
  AnalyticsService,
  BusinessHour,
} from './types';

const DAY = 24 * 60 * 60 * 1000;

function isoOffsetDays(days: number): string {
  return new Date(Date.now() + days * DAY).toISOString();
}

function startOfDay(d = new Date()): string {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}

function endOfDay(d = new Date()): string {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.toISOString();
}

/**
 * Resolves the business owned by the signed-in user. RLS on `businesses`
 * restricts this row to `owner_id = auth.uid()` automatically.
 */
export async function getOwnerBusiness(): Promise<{
  id: string;
  name: string;
} | null> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data, error } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('owner_id', auth.user.id)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function loadAnalyticsBundle(
  businessId: string,
): Promise<AnalyticsBundle> {
  const supabase = createClient();

  const since90 = isoOffsetDays(-90);
  const todayStart = startOfDay();
  const todayEnd = endOfDay();
  const yStart = startOfDay(new Date(Date.now() - DAY));
  const yEnd = endOfDay(new Date(Date.now() - DAY));

  const [
    bookings90Res,
    bookingsTodayRes,
    bookingsYesterdayRes,
    bookingsFutureRes,
    customerBusinessRes,
    servicesRes,
    reviewsRes,
    businessHoursRes,
    insightsRes,
    businessRes,
  ] = await Promise.all([
    supabase
      .from('bookings')
      .select(
        'id, business_id, customer_id, service_id, start_at, end_at, status, price_cents',
      )
      .eq('business_id', businessId)
      .gte('start_at', since90)
      .order('start_at', { ascending: true }),
    supabase
      .from('bookings')
      .select(
        'id, business_id, customer_id, service_id, start_at, end_at, status, price_cents',
      )
      .eq('business_id', businessId)
      .gte('start_at', todayStart)
      .lte('start_at', todayEnd),
    supabase
      .from('bookings')
      .select(
        'id, business_id, customer_id, service_id, start_at, end_at, status, price_cents',
      )
      .eq('business_id', businessId)
      .gte('start_at', yStart)
      .lte('start_at', yEnd),
    supabase
      .from('bookings')
      .select(
        'id, business_id, customer_id, service_id, start_at, end_at, status, price_cents',
      )
      .eq('business_id', businessId)
      .gte('start_at', todayEnd)
      .lte('start_at', isoOffsetDays(35))
      .in('status', ['confirmed', 'pending', 'completed']),
    supabase
      .from('customer_businesses')
      .select(
        'customer_id, first_booked_at, last_booked_at, customer:customers(id, name, email, phone)',
      )
      .eq('business_id', businessId),
    supabase
      .from('services')
      .select('id, name, duration_minutes, price_cents, capacity')
      .eq('business_id', businessId)
      .eq('is_active', true),
    supabase
      .from('reviews')
      .select('id, customer_id, rating, body, created_at')
      .eq('business_id', businessId)
      .gte('created_at', since90),
    supabase
      .from('business_hours')
      .select('day_of_week, opens_at, closes_at')
      .eq('business_id', businessId),
    supabase
      .from('ai_insights')
      .select(
        'id, business_id, insight_type, headline, body, generated_at, model, dismissed',
      )
      .eq('business_id', businessId)
      .eq('dismissed', false)
      .order('generated_at', { ascending: false })
      .limit(40),
    supabase
      .from('businesses')
      .select('id, name')
      .eq('id', businessId)
      .maybeSingle(),
  ]);

  const bookings90 = (bookings90Res.data ?? []) as AnalyticsBooking[];
  const bookingsToday = (bookingsTodayRes.data ?? []) as AnalyticsBooking[];
  const bookingsYesterday = (bookingsYesterdayRes.data ?? []) as AnalyticsBooking[];
  const bookingsFuture = (bookingsFutureRes.data ?? []) as AnalyticsBooking[];

  type CustomerJoinRow = {
    customer_id: string;
    first_booked_at: string | null;
    last_booked_at: string | null;
    customer:
      | { id: string; name: string; email: string | null; phone: string | null }
      | { id: string; name: string; email: string | null; phone: string | null }[]
      | null;
  };

  const customers: AnalyticsCustomer[] = ((customerBusinessRes.data ?? []) as CustomerJoinRow[])
    .map((row) => {
      const c = Array.isArray(row.customer) ? row.customer[0] : row.customer;
      if (!c) return null;
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        first_booked_at: row.first_booked_at,
        last_booked_at: row.last_booked_at,
      };
    })
    .filter((c): c is AnalyticsCustomer => c !== null);

  const services = (servicesRes.data ?? []) as AnalyticsService[];
  const reviews = (reviewsRes.data ?? []) as AnalyticsReview[];
  const businessHours = (businessHoursRes.data ?? []) as BusinessHour[];
  const insightLog = (insightsRes.data ?? []) as AIInsight[];

  const latestWeeklyInsight =
    insightLog.find((i) => i.insight_type === 'weekly') ?? null;
  const heatmapCallouts = insightLog.filter(
    (i) => i.insight_type === 'heatmap_callout',
  );

  return {
    business: businessRes.data ?? null,
    bookings90,
    bookingsToday,
    bookingsYesterday,
    bookingsFuture,
    customers,
    services,
    reviews,
    businessHours,
    latestWeeklyInsight,
    insightLog,
    heatmapCallouts,
    hasEnoughData: bookings90.length >= 20,
  };
}
