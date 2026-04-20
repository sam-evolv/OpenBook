import { getOpenAI, OPENAI_MODEL } from './openai';
import { createServiceRoleClient } from './serviceRoleClient';
import type {
  AnalyticsBooking,
  AnalyticsCustomer,
  AnalyticsReview,
  AnalyticsService,
} from '@/lib/analytics/types';

const SYSTEM_PROMPT = `You are a senior business analyst for a small local service business in Ireland (gym, salon, barber, spa, physio, or similar). You are given the business's raw booking data for the last 90 days and must surface ONE unexpected, specific, actionable observation in plain English.

RULES:
- One insight only. Never a list.
- Maximum 2 sentences. Under 280 characters.
- Be specific: reference actual day names, actual service names, actual customer patterns.
- Never generic advice ("consider running a promotion"). Always specific ("Clients who book a 60-min massage within 14 days of a 30-min intro are 3.2x more likely to buy a package — you have 4 such clients right now who haven't been offered one.").
- If the data doesn't support a confident insight, return the string "INSUFFICIENT_DATA" and nothing else.
- Tone: calm, confident, like a trusted operator — not a cheerleader, not a consultant trying to sound smart.
- Never mention AI, algorithms, or how you arrived at the insight. The owner should just see a useful observation.

OUTPUT FORMAT: two fields as JSON — {"headline": "short 5-10 word headline", "body": "the 1-2 sentence insight"}.`;

type Summary = {
  business_name: string;
  windowDays: 90;
  totals: {
    bookings: number;
    completed: number;
    cancelled: number;
    no_shows: number;
    revenueCents: number;
  };
  topServices: Array<{ name: string; bookings: number; revenueCents: number }>;
  dayOfWeekPattern: Array<{ day: string; bookings: number }>;
  hourOfDayPattern: Array<{ hour: number; bookings: number }>;
  customerCohorts: {
    repeaters: number;
    oneAndDone: number;
    avgLifetimeBookings: number;
  };
  reviewSnapshot: { count: number; avgRating: number | null };
  sundayBookings: number;
  eveningBookings: number; // >= 17h
  firstBookingDayMix: Array<{ day: string; firstBookings: number }>;
  servicePairings: Array<{
    first: string;
    then: string;
    within14d: number;
  }>;
};

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const MAX_PAIRINGS_TO_KEEP = 5;

function shapeSummary(args: {
  businessName: string;
  bookings: AnalyticsBooking[];
  customers: AnalyticsCustomer[];
  services: AnalyticsService[];
  reviews: AnalyticsReview[];
}): Summary {
  const { businessName, bookings, customers, services, reviews } = args;
  const serviceById = new Map(services.map((s) => [s.id, s]));

  const completed = bookings.filter((b) => b.status === 'completed');
  const cancelled = bookings.filter((b) => b.status === 'cancelled');
  const noShows = bookings.filter((b) => b.status === 'no_show');

  const revenueCents = completed.reduce(
    (s, b) => s + (b.price_cents ?? 0),
    0,
  );

  const serviceCounts = new Map<string, { bookings: number; revenueCents: number }>();
  for (const b of completed) {
    if (!b.service_id) continue;
    const name = serviceById.get(b.service_id)?.name ?? 'Unknown';
    const entry = serviceCounts.get(name) ?? { bookings: 0, revenueCents: 0 };
    entry.bookings += 1;
    entry.revenueCents += b.price_cents ?? 0;
    serviceCounts.set(name, entry);
  }
  const topServices = Array.from(serviceCounts.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 6);

  const dayOfWeekCounts = new Array(7).fill(0) as number[];
  const hourCounts = new Array(24).fill(0) as number[];
  let sundayBookings = 0;
  let eveningBookings = 0;
  for (const b of bookings) {
    const d = new Date(b.start_at);
    dayOfWeekCounts[d.getDay()] += 1;
    hourCounts[d.getHours()] += 1;
    if (d.getDay() === 0) sundayBookings += 1;
    if (d.getHours() >= 17) eveningBookings += 1;
  }

  const repeaters = customers.filter((c) => {
    const cb = bookings.filter((b) => b.customer_id === c.id);
    return cb.filter((b) => b.status === 'completed').length >= 2;
  }).length;
  const oneAndDone = customers.length - repeaters;
  const avgLifetimeBookings =
    customers.length > 0 ? completed.length / customers.length : 0;

  const firstBookingByCustomer = new Map<string, string>();
  for (const c of customers) {
    if (c.first_booked_at) {
      firstBookingByCustomer.set(c.id, c.first_booked_at);
    }
  }
  const firstBookingDayCounts = new Array(7).fill(0) as number[];
  for (const iso of Array.from(firstBookingByCustomer.values())) {
    firstBookingDayCounts[new Date(iso).getDay()] += 1;
  }

  // service pairings: did a customer do service A then B within 14d?
  const pairingMap = new Map<string, number>();
  const byCustomer = new Map<string, AnalyticsBooking[]>();
  for (const b of completed) {
    if (!b.customer_id) continue;
    const arr = byCustomer.get(b.customer_id) ?? [];
    arr.push(b);
    byCustomer.set(b.customer_id, arr);
  }
  Array.from(byCustomer.values()).forEach((custBookings) => {
    const sorted = [...custBookings].sort((a, b) =>
      a.start_at < b.start_at ? -1 : 1,
    );
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      const dt =
        (new Date(b.start_at).getTime() - new Date(a.start_at).getTime()) /
        (24 * 60 * 60 * 1000);
      if (dt > 14) continue;
      const aName = a.service_id ? serviceById.get(a.service_id)?.name : null;
      const bName = b.service_id ? serviceById.get(b.service_id)?.name : null;
      if (!aName || !bName || aName === bName) continue;
      const key = `${aName}→${bName}`;
      pairingMap.set(key, (pairingMap.get(key) ?? 0) + 1);
    }
  });
  const servicePairings = Array.from(pairingMap.entries())
    .map(([k, v]) => {
      const [first, then] = k.split('→');
      return { first, then, within14d: v };
    })
    .sort((a, b) => b.within14d - a.within14d)
    .slice(0, MAX_PAIRINGS_TO_KEEP);

  const ratings = reviews.map((r) => r.rating);
  const avgRating =
    ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) /
        10
      : null;

  return {
    business_name: businessName,
    windowDays: 90,
    totals: {
      bookings: bookings.length,
      completed: completed.length,
      cancelled: cancelled.length,
      no_shows: noShows.length,
      revenueCents,
    },
    topServices,
    dayOfWeekPattern: dayOfWeekCounts.map((c, i) => ({
      day: DAY_NAMES[i],
      bookings: c,
    })),
    hourOfDayPattern: hourCounts.map((c, i) => ({ hour: i, bookings: c })),
    customerCohorts: {
      repeaters,
      oneAndDone,
      avgLifetimeBookings:
        Math.round(avgLifetimeBookings * 100) / 100,
    },
    reviewSnapshot: { count: reviews.length, avgRating },
    sundayBookings,
    eveningBookings,
    firstBookingDayMix: firstBookingDayCounts.map((c, i) => ({
      day: DAY_NAMES[i],
      firstBookings: c,
    })),
    servicePairings,
  };
}

export type GeneratedInsight = {
  headline: string;
  body: string;
};

export async function generateWeeklyInsight(businessId: string): Promise<
  | (GeneratedInsight & { id: string })
  | null
> {
  const supabase = createServiceRoleClient();

  // gather the last 90d of data — same shape as the analytics bundle but
  // fetched with service role so cron can run without a signed-in user.
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const [businessRes, bookingsRes, customerJoinRes, servicesRes, reviewsRes] =
    await Promise.all([
      supabase
        .from('businesses')
        .select('id, name')
        .eq('id', businessId)
        .maybeSingle(),
      supabase
        .from('bookings')
        .select(
          'id, business_id, customer_id, service_id, start_at, end_at, status, price_cents',
        )
        .eq('business_id', businessId)
        .gte('start_at', since),
      supabase
        .from('customer_businesses')
        .select(
          'customer_id, first_booked_at, last_booked_at, customer:customers(id, name, email, phone)',
        )
        .eq('business_id', businessId),
      supabase
        .from('services')
        .select('id, name, duration_minutes, price_cents, capacity')
        .eq('business_id', businessId),
      supabase
        .from('reviews')
        .select('id, customer_id, rating, body, created_at')
        .eq('business_id', businessId)
        .gte('created_at', since),
    ]);

  if (!businessRes.data) return null;
  const businessName = businessRes.data.name;
  const bookings = (bookingsRes.data ?? []) as AnalyticsBooking[];

  if (bookings.length < 20) {
    // Not enough signal to run GPT on. Cheaper to skip entirely than burn a token.
    return null;
  }

  type JoinRow = {
    customer_id: string;
    first_booked_at: string | null;
    last_booked_at: string | null;
    customer:
      | { id: string; name: string; email: string | null; phone: string | null }
      | { id: string; name: string; email: string | null; phone: string | null }[]
      | null;
  };
  const customers: AnalyticsCustomer[] = ((customerJoinRes.data ?? []) as JoinRow[])
    .map((row) => {
      const c = Array.isArray(row.customer) ? row.customer[0] : row.customer;
      if (!c) return null;
      return {
        id: c.id,
        name: '', // strip PII before sending to GPT
        email: null,
        phone: null,
        first_booked_at: row.first_booked_at,
        last_booked_at: row.last_booked_at,
      };
    })
    .filter((c): c is AnalyticsCustomer => c !== null);
  const services = (servicesRes.data ?? []) as AnalyticsService[];
  const reviews = (reviewsRes.data ?? []) as AnalyticsReview[];

  const summary = shapeSummary({
    businessName,
    bookings,
    customers,
    services,
    reviews,
  });

  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Here is the last 90 days of data for "${businessName}":\n\n${JSON.stringify(summary)}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? '';
  if (!raw || raw.includes('INSUFFICIENT_DATA')) return null;

  let parsed: GeneratedInsight;
  try {
    parsed = JSON.parse(raw) as GeneratedInsight;
  } catch {
    return null;
  }
  if (!parsed.headline || !parsed.body) return null;

  const { data: inserted, error } = await supabase
    .from('ai_insights')
    .insert({
      business_id: businessId,
      insight_type: 'weekly',
      headline: parsed.headline,
      body: parsed.body,
      data_snapshot: summary as unknown as Record<string, unknown>,
      model: OPENAI_MODEL,
    })
    .select('id')
    .single();

  if (error || !inserted) return null;

  return { id: inserted.id, headline: parsed.headline, body: parsed.body };
}
