import type { SupabaseClient } from '@supabase/supabase-js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseHM(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

// ============================================================
// Health score — see 2026-04-25 brief change-log entry
// ============================================================

export interface HealthScorePayload {
  score: number | null; // null when below signal threshold
  previousScore: number | null;
  components: {
    showRate: number;
    retention: number;
    utilisation: number;
    velocity: number;
    reviewSignal: number;
  };
  highlights: {
    utilisationPercent: number;
    retentionPercent: number | null; // null = <60 days of history
    monthlyRevenueCents: number;
    noShowRatePercent: number;
  };
  thirtyDayBookingCount: number; // drives the calibration threshold
}

interface BookingForScore {
  id: string;
  starts_at: string;
  ends_at: string;
  price_cents: number;
  status: string | null;
  customer_id: string;
  staff_id: string | null;
}

interface ReviewForScore {
  rating: number | null;
  created_at: string | null;
}

interface HourRow {
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean | null;
}

function computeOpenMinutes(hours: HourRow[], daysBack: number): number {
  const perDow = new Map<number, number>();
  for (const h of hours) {
    if (h.is_closed || !h.open_time || !h.close_time) {
      perDow.set(h.day_of_week, 0);
      continue;
    }
    perDow.set(h.day_of_week, Math.max(0, parseHM(h.close_time) - parseHM(h.open_time)));
  }
  const today = new Date();
  let total = 0;
  for (let i = 0; i < daysBack; i++) {
    const d = new Date(today.getTime() - i * MS_PER_DAY);
    total += perDow.get(d.getDay()) ?? 0;
  }
  return total;
}

/**
 * Rolling cohort retention: of customers who booked during the cohort
 * window, what % also booked during the returner window? Returns null
 * when the cohort is empty (caller decides whether to show 0% or an
 * "insufficient history" empty state).
 */
function cohortRetention(
  bookings: BookingForScore[],
  cohortStartMs: number,
  cohortEndMs: number,
  returnerStartMs: number,
  returnerEndMs: number,
): number | null {
  const inRange = (b: BookingForScore, lo: number, hi: number): boolean => {
    if (b.status === 'cancelled' || b.status === 'no_show') return false;
    const t = new Date(b.starts_at).getTime();
    return t >= lo && t < hi;
  };
  const cohort = new Set<string>();
  const returners = new Set<string>();
  for (const b of bookings) {
    if (inRange(b, cohortStartMs, cohortEndMs)) cohort.add(b.customer_id);
    if (inRange(b, returnerStartMs, returnerEndMs)) returners.add(b.customer_id);
  }
  if (cohort.size === 0) return null;
  let returning = 0;
  for (const cid of cohort) if (returners.has(cid)) returning++;
  return (returning / cohort.size) * 100;
}

/**
 * Scores the window that starts `offset` days ago and extends 30 days
 * back from there. offset=0 → last 30 days; offset=30 → the prior 30.
 */
function scoreWindow(
  bookings: BookingForScore[],
  reviews: ReviewForScore[],
  openMinutes: number,
  retentionPercent: number | null,
  windowStartMs: number,
  windowEndMs: number,
): { score: number; components: HealthScorePayload['components'] } {
  const inWindow = bookings.filter((b) => {
    const t = new Date(b.starts_at).getTime();
    return t >= windowStartMs && t < windowEndMs;
  });

  const nonCancelled = inWindow.filter((b) => b.status !== 'cancelled' && b.status !== 'no_show');
  const cancelledOrNoShow = inWindow.filter(
    (b) => b.status === 'cancelled' || b.status === 'no_show',
  );
  const total = inWindow.length;

  // Show rate (25)
  const showRatePercent =
    total === 0 ? 0 : Math.max(0, 100 - (cancelledOrNoShow.length / total) * 100);
  const showRateComponent = (showRatePercent / 100) * 25;

  // Retention (25): rolling cohort retention, precomputed by the caller.
  // null (insufficient history) scores as 0; the highlight tile renders
  // an empty-state message instead of "0%".
  const retentionComponent = ((retentionPercent ?? 0) / 100) * 25;

  // Utilisation (20): booked minutes / open minutes, capped at 100.
  const bookedMinutes = nonCancelled.reduce(
    (s, b) =>
      s + Math.max(0, (new Date(b.ends_at).getTime() - new Date(b.starts_at).getTime()) / 60_000),
    0,
  );
  const utilisationPercent =
    openMinutes === 0 ? 0 : Math.min(100, (bookedMinutes / openMinutes) * 100);
  const utilisationComponent = (utilisationPercent / 100) * 20;

  // Velocity handled at caller (needs two windows); populated by caller.
  const velocityComponent = 0; // placeholder, filled in below

  // Review signal (10): avg reviews.rating in last 90 days × 2.
  const ninetyAgo = Date.now() - 90 * MS_PER_DAY;
  const recentReviews = reviews.filter(
    (r) => r.rating != null && r.created_at && new Date(r.created_at).getTime() >= ninetyAgo,
  );
  const reviewAvg =
    recentReviews.length === 0
      ? 0
      : recentReviews.reduce((s, r) => s + (r.rating ?? 0), 0) / recentReviews.length;
  const reviewSignalComponent = reviewAvg * 2; // 5-star → 10 pts

  return {
    score:
      showRateComponent +
      retentionComponent +
      utilisationComponent +
      velocityComponent +
      reviewSignalComponent,
    components: {
      showRate: showRateComponent,
      retention: retentionComponent,
      utilisation: utilisationComponent,
      velocity: velocityComponent,
      reviewSignal: reviewSignalComponent,
    },
  };
}

export async function loadHealthScore(
  sb: SupabaseClient,
  businessId: string,
): Promise<HealthScorePayload> {
  const now = Date.now();
  const thirtyAgo = now - 30 * MS_PER_DAY;
  const sixtyAgo = now - 60 * MS_PER_DAY;
  // 90-day window: needed so the prior-period score (used for the delta)
  // can compute its own rolling retention against the 60-90d cohort.
  const ninetyAgo = now - 90 * MS_PER_DAY;

  const [bookingsRes, reviewsRes, hoursRes] = await Promise.all([
    sb
      .from('bookings')
      .select('id, starts_at, ends_at, price_cents, status, customer_id, staff_id')
      .eq('business_id', businessId)
      .gte('starts_at', new Date(ninetyAgo).toISOString())
      .limit(5000),
    sb
      .from('reviews')
      .select('rating, created_at')
      .eq('business_id', businessId)
      .gte('created_at', new Date(now - 90 * MS_PER_DAY).toISOString()),
    sb
      .from('business_hours')
      .select('day_of_week, open_time, close_time, is_closed')
      .eq('business_id', businessId),
  ]);

  const bookings = (bookingsRes.data ?? []) as BookingForScore[];
  const reviews = (reviewsRes.data ?? []) as ReviewForScore[];
  const hours = (hoursRes.data ?? []) as HourRow[];

  // Rolling cohort retention. "Did customers come back?" beats the old
  // lifetime-≥-2 check, which trivially hit 100% once a business had a few
  // months of history.
  const currentRetention = cohortRetention(bookings, sixtyAgo, thirtyAgo, thirtyAgo, now);
  const priorRetention = cohortRetention(bookings, ninetyAgo, sixtyAgo, sixtyAgo, thirtyAgo);

  const thirtyDayBookingCount = bookings.filter(
    (b) =>
      new Date(b.starts_at).getTime() >= thirtyAgo &&
      b.status !== 'cancelled' &&
      b.status !== 'no_show',
  ).length;

  const openMinutes30 = computeOpenMinutes(hours, 30);

  // Velocity: this-30d count vs prior-30d count.
  const priorCount = bookings.filter(
    (b) =>
      new Date(b.starts_at).getTime() >= sixtyAgo &&
      new Date(b.starts_at).getTime() < thirtyAgo &&
      b.status !== 'cancelled' &&
      b.status !== 'no_show',
  ).length;
  let velocityPercent = 0;
  if (priorCount === 0) {
    velocityPercent = thirtyDayBookingCount >= 1 ? 100 : 0;
  } else {
    velocityPercent = Math.min(100, (thirtyDayBookingCount / priorCount) * 100);
  }
  const velocityComponent = (velocityPercent / 100) * 20;

  // Current window (last 30d).
  const current = scoreWindow(bookings, reviews, openMinutes30, currentRetention, thirtyAgo, now);
  current.components.velocity = velocityComponent;
  const currentScore =
    current.score - (0 * 20) + velocityComponent; // velocity was 0 in scoreWindow; add in
  const currentRounded = Math.round(currentScore);

  // Prior window (for delta). We don't recompute velocity for this one —
  // it's only shown as "+X points this month" vs the current velocity.
  // Approximation: reuse current components structure but score the prior
  // window for show-rate / retention / utilisation only. Velocity carries
  // over because that's a rate-of-change component already.
  const priorOpenMinutes30 = openMinutes30; // schedule stable over 60 days typically
  const prior = scoreWindow(bookings, reviews, priorOpenMinutes30, priorRetention, sixtyAgo, thirtyAgo);
  const priorScore = prior.score; // velocity=0 for prior — not rendered, just delta
  const priorRounded = Math.round(priorScore);

  // Highlights (what the 4 tiles in the hero show)
  const inCurrent = bookings.filter((b) => {
    const t = new Date(b.starts_at).getTime();
    return t >= thirtyAgo && t < now;
  });
  const nonCancelledCurrent = inCurrent.filter(
    (b) => b.status !== 'cancelled' && b.status !== 'no_show',
  );
  const cancelledOrNoShowCurrent = inCurrent.filter(
    (b) => b.status === 'cancelled' || b.status === 'no_show',
  );
  const bookedMinutesCurrent = nonCancelledCurrent.reduce(
    (s, b) =>
      s + Math.max(0, (new Date(b.ends_at).getTime() - new Date(b.starts_at).getTime()) / 60_000),
    0,
  );
  const utilisationPercentCurrent =
    openMinutes30 === 0 ? 0 : Math.min(100, (bookedMinutesCurrent / openMinutes30) * 100);
  const monthlyRevenueCurrent = nonCancelledCurrent.reduce((s, b) => s + b.price_cents, 0);
  const noShowRate =
    inCurrent.length === 0 ? 0 : (cancelledOrNoShowCurrent.length / inCurrent.length) * 100;

  const belowThreshold = thirtyDayBookingCount < 10;

  return {
    score: belowThreshold ? null : currentRounded,
    previousScore: belowThreshold ? null : priorRounded,
    components: current.components,
    highlights: {
      utilisationPercent: Math.round(utilisationPercentCurrent),
      retentionPercent: currentRetention === null ? null : Math.round(currentRetention),
      monthlyRevenueCents: monthlyRevenueCurrent,
      noShowRatePercent: Math.round(noShowRate * 10) / 10,
    },
    thirtyDayBookingCount,
  };
}

// ============================================================
// Revenue series — 12 months + current-month forecast
// ============================================================

export interface RevenuePoint {
  month: string; // 'Jan', 'Feb', etc
  year: number;
  revenueCents: number;
  forecast: boolean;
}

export async function loadRevenueSeries(
  sb: SupabaseClient,
  businessId: string,
): Promise<{ series: RevenuePoint[]; forecastCents: number | null }> {
  const now = new Date();
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const { data } = await sb
    .from('bookings')
    .select('starts_at, price_cents, status')
    .eq('business_id', businessId)
    .gte('starts_at', twelveMonthsAgo.toISOString())
    .neq('status', 'cancelled');

  const rows = (data ?? []) as { starts_at: string; price_cents: number }[];

  const byMonth = new Map<string, number>();
  for (const r of rows) {
    const d = new Date(r.starts_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    byMonth.set(key, (byMonth.get(key) ?? 0) + r.price_cents);
  }

  const series: RevenuePoint[] = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const isCurrent = i === 0;
    series.push({
      month: monthNames[d.getMonth()]!,
      year: d.getFullYear(),
      revenueCents: byMonth.get(key) ?? 0,
      forecast: false,
    });
  }

  // Forecast = current-month revenue × (days-in-month / day-of-month)
  const today = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentRevenue = series[series.length - 1]!.revenueCents;
  const forecastCents =
    today >= daysInMonth || today === 0
      ? null
      : Math.round((currentRevenue * daysInMonth) / Math.max(1, today));

  return { series, forecastCents };
}

// ============================================================
// Distribution — booking source + revenue by service
// ============================================================

export interface DistributionPayload {
  source: Array<{ label: string; count: number; percent: number }>;
  topServices: Array<{ id: string; name: string; revenueCents: number }>;
}

const SOURCE_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  dashboard: 'Dashboard',
  web: 'Public page',
  ai: 'AI assistants',
  chatgpt: 'AI assistants',
  claude: 'AI assistants',
  gemini: 'AI assistants',
};

export async function loadDistribution(
  sb: SupabaseClient,
  businessId: string,
): Promise<DistributionPayload> {
  const thirtyAgo = new Date(Date.now() - 30 * MS_PER_DAY).toISOString();

  const { data } = await sb
    .from('bookings')
    .select('source, price_cents, service_id, services(name)')
    .eq('business_id', businessId)
    .gte('starts_at', thirtyAgo)
    .neq('status', 'cancelled');

  const rows = (data ?? []) as unknown as Array<{
    source: string | null;
    price_cents: number;
    service_id: string;
    services: { name: string | null } | null;
  }>;

  // Source breakdown
  const sourceMap = new Map<string, number>();
  for (const r of rows) {
    const key = r.source ?? 'unknown';
    sourceMap.set(key, (sourceMap.get(key) ?? 0) + 1);
  }
  const total = rows.length;
  const source = Array.from(sourceMap.entries())
    .map(([key, count]) => ({
      label:
        SOURCE_LABELS[key] ??
        (key === 'unknown' ? 'Unknown source' : key.charAt(0).toUpperCase() + key.slice(1)),
      count,
      percent: total === 0 ? 0 : Math.round((count / total) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count);

  // Top services
  const svcMap = new Map<string, { name: string; revenueCents: number }>();
  for (const r of rows) {
    if (!r.service_id) continue;
    const cur = svcMap.get(r.service_id);
    if (cur) {
      cur.revenueCents += r.price_cents;
    } else {
      svcMap.set(r.service_id, {
        name: r.services?.name ?? '—',
        revenueCents: r.price_cents,
      });
    }
  }
  const topServices = Array.from(svcMap.entries())
    .map(([id, v]) => ({ id, name: v.name, revenueCents: v.revenueCents }))
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, 5);

  return { source, topServices };
}

// ============================================================
// Recent insights — archive view, includes dismissed
// ============================================================

export interface ArchivedInsight {
  id: string;
  headline: string;
  body: string;
  insight_type: string;
  generated_at: string;
  dismissed: boolean;
}

export async function loadRecentInsights(
  sb: SupabaseClient,
  businessId: string,
): Promise<ArchivedInsight[]> {
  const { data } = await sb
    .from('ai_insights')
    .select('id, headline, body, insight_type, generated_at, dismissed')
    .eq('business_id', businessId)
    .order('generated_at', { ascending: false })
    .limit(20);

  return (data ?? []) as ArchivedInsight[];
}
