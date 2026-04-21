import type { SupabaseClient } from '@supabase/supabase-js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface TeamStaffRow {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  email: string | null;
  avatar_url: string | null;
  instagram_handle: string | null;
  specialties: string[];
  is_active: boolean;
  sort_order: number | null;
  colour: string | null;
  is_owner: boolean;
  bookings_week: number;
  bookings_month: number;
  revenue_month_cents: number;
  utilisation_percent: number | null;
  rating: number | null;
  review_count: number;
  hours_label: string;
}

export interface TeamPayload {
  staff: TeamStaffRow[];
  totalBookingsMonth: number;
  totalRevenueMonthCents: number;
  avgUtilisationPercent: number | null;
}

interface BookingRow {
  id: string;
  staff_id: string | null;
  starts_at: string;
  ends_at: string;
  price_cents: number;
  status: string | null;
}

interface ReviewRow {
  booking_id: string | null;
  rating: number | null;
}

interface BusinessHourRow {
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean | null;
}

function parseHM(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * Business open minutes summed across the last 30 days. Used as the
 * utilisation denominator — see the 2026-04-24 caveat in
 * docs/dashboard-v2-brief.md: this overestimates for part-time staff
 * and is a known approximation until `staff_hours` exists.
 */
function computeOpenMinutesLast30Days(hours: BusinessHourRow[]): number {
  const minutesPerWeekday = new Map<number, number>();
  for (const h of hours) {
    if (h.is_closed || !h.open_time || !h.close_time) {
      minutesPerWeekday.set(h.day_of_week, 0);
      continue;
    }
    minutesPerWeekday.set(h.day_of_week, Math.max(0, parseHM(h.close_time) - parseHM(h.open_time)));
  }
  let total = 0;
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today.getTime() - i * MS_PER_DAY);
    total += minutesPerWeekday.get(d.getDay()) ?? 0;
  }
  return total;
}

function humaniseHours(hours: BusinessHourRow[]): string {
  const open = hours.filter((h) => !h.is_closed && h.open_time && h.close_time);
  if (open.length === 0) return 'Hours not set';
  // Group consecutive days with matching open/close times (Mon–Fri etc).
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const sorted = [...open].sort((a, b) => a.day_of_week - b.day_of_week);
  const first = sorted[0]!;
  const allSame = sorted.every(
    (h) => h.open_time === first.open_time && h.close_time === first.close_time,
  );
  if (allSame) {
    const firstDay = dayNames[sorted[0]!.day_of_week]!;
    const lastDay = dayNames[sorted[sorted.length - 1]!.day_of_week]!;
    return `${firstDay}–${lastDay} ${first.open_time}–${first.close_time}`;
  }
  return `${sorted.length} day${sorted.length === 1 ? '' : 's'} a week`;
}

export async function loadTeam(
  sb: SupabaseClient,
  businessId: string,
  ownerEmail: string | null,
): Promise<TeamPayload> {
  const thirtyDaysAgoIso = new Date(Date.now() - 30 * MS_PER_DAY).toISOString();
  const sevenDaysAgoIso = new Date(Date.now() - 7 * MS_PER_DAY).toISOString();

  const [staffRes, bookingsRes, reviewsRes, hoursRes] = await Promise.all([
    sb
      .from('staff')
      .select('id, name, title, bio, email, avatar_url, instagram_handle, specialties, is_active, sort_order, colour')
      .eq('business_id', businessId)
      .order('sort_order', { ascending: true, nullsFirst: false }),
    sb
      .from('bookings')
      .select('id, staff_id, starts_at, ends_at, price_cents, status')
      .eq('business_id', businessId)
      .gte('starts_at', thirtyDaysAgoIso)
      .neq('status', 'cancelled'),
    sb
      .from('reviews')
      .select('booking_id, rating')
      .eq('business_id', businessId),
    sb
      .from('business_hours')
      .select('day_of_week, open_time, close_time, is_closed')
      .eq('business_id', businessId),
  ]);

  const staff = (staffRes.data ?? []) as Array<Omit<TeamStaffRow, 'is_owner' | 'bookings_week' | 'bookings_month' | 'revenue_month_cents' | 'utilisation_percent' | 'rating' | 'review_count' | 'hours_label' | 'specialties' | 'is_active'> & {
    specialties: string[] | null;
    is_active: boolean | null;
  }>;
  const bookings = (bookingsRes.data ?? []) as BookingRow[];
  const reviews = (reviewsRes.data ?? []) as ReviewRow[];
  const hours = (hoursRes.data ?? []) as BusinessHourRow[];

  // Per-staff booking aggregates over the 30-day window.
  type Agg = {
    countMonth: number;
    countWeek: number;
    revenueCents: number;
    bookedMinutes: number;
    bookingIds: Set<string>;
  };
  const aggByStaff = new Map<string, Agg>();
  for (const b of bookings) {
    if (!b.staff_id) continue;
    let agg = aggByStaff.get(b.staff_id);
    if (!agg) {
      agg = {
        countMonth: 0,
        countWeek: 0,
        revenueCents: 0,
        bookedMinutes: 0,
        bookingIds: new Set(),
      };
      aggByStaff.set(b.staff_id, agg);
    }
    agg.countMonth++;
    agg.revenueCents += b.price_cents;
    agg.bookedMinutes += Math.max(
      0,
      (new Date(b.ends_at).getTime() - new Date(b.starts_at).getTime()) / 60_000,
    );
    agg.bookingIds.add(b.id);
    if (b.starts_at >= sevenDaysAgoIso) agg.countWeek++;
  }

  // Reviews aggregated per staff via booking_id → staff_id.
  const bookingToStaff = new Map<string, string>();
  for (const b of bookings) {
    if (b.staff_id) bookingToStaff.set(b.id, b.staff_id);
  }
  type ReviewAgg = { sum: number; count: number };
  const reviewsByStaff = new Map<string, ReviewAgg>();
  for (const r of reviews) {
    if (r.rating == null || !r.booking_id) continue;
    const staffId = bookingToStaff.get(r.booking_id);
    if (!staffId) continue;
    const cur = reviewsByStaff.get(staffId) ?? { sum: 0, count: 0 };
    cur.sum += r.rating;
    cur.count += 1;
    reviewsByStaff.set(staffId, cur);
  }

  const openMinutes30 = computeOpenMinutesLast30Days(hours);
  const hoursLabel = humaniseHours(hours);

  const rows: TeamStaffRow[] = staff.map((s) => {
    const agg = aggByStaff.get(s.id);
    const rev = reviewsByStaff.get(s.id);
    const utilisation =
      openMinutes30 > 0 && agg
        ? Math.min(100, Math.round((agg.bookedMinutes / openMinutes30) * 100))
        : null;
    return {
      id: s.id,
      name: s.name,
      title: s.title,
      bio: s.bio,
      email: s.email,
      avatar_url: s.avatar_url,
      instagram_handle: s.instagram_handle,
      specialties: s.specialties ?? [],
      is_active: s.is_active ?? true,
      sort_order: s.sort_order,
      colour: s.colour,
      is_owner: Boolean(
        ownerEmail && s.email && s.email.trim().toLowerCase() === ownerEmail.trim().toLowerCase(),
      ),
      bookings_week: agg?.countWeek ?? 0,
      bookings_month: agg?.countMonth ?? 0,
      revenue_month_cents: agg?.revenueCents ?? 0,
      utilisation_percent: utilisation,
      rating: rev ? Math.round((rev.sum / rev.count) * 10) / 10 : null,
      review_count: rev?.count ?? 0,
      hours_label: hoursLabel,
    };
  });

  const totalBookingsMonth = rows.reduce((s, r) => s + r.bookings_month, 0);
  const totalRevenueMonthCents = rows.reduce((s, r) => s + r.revenue_month_cents, 0);
  const utilValues = rows.map((r) => r.utilisation_percent).filter((v): v is number => v !== null);
  const avgUtilisationPercent =
    utilValues.length === 0
      ? null
      : Math.round(utilValues.reduce((s, v) => s + v, 0) / utilValues.length);

  return {
    staff: rows,
    totalBookingsMonth,
    totalRevenueMonthCents,
    avgUtilisationPercent,
  };
}
