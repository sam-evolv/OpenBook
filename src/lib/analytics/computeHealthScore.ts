import type {
  AnalyticsBooking,
  AnalyticsCustomer,
  AnalyticsReview,
} from './types';

export type HealthStatus =
  | 'Thriving'
  | 'Steady'
  | 'Cooling'
  | 'At Risk'
  | 'Lost';

export type CustomerHealth = {
  customer: AnalyticsCustomer;
  status: HealthStatus;
  score: number; // 0..100
  lifetimeBookings: number;
  cancellationRate: number;
  daysSinceLastVisit: number;
  recentFrequencyDelta: number; // last 30d vs baseline
  ltvCents: number;
  lastSentiment: 'positive' | 'neutral' | 'negative' | 'none';
};

const DAY = 24 * 60 * 60 * 1000;

function classify(score: number, daysSinceLast: number): HealthStatus {
  if (daysSinceLast > 180) return 'Lost';
  if (score >= 80) return 'Thriving';
  if (score >= 60) return 'Steady';
  if (score >= 40) return 'Cooling';
  return 'At Risk';
}

function sentimentFor(
  customerId: string,
  reviews: AnalyticsReview[],
): CustomerHealth['lastSentiment'] {
  const mine = reviews
    .filter((r) => r.customer_id === customerId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  if (mine.length === 0) return 'none';
  const r = mine[0].rating;
  if (r >= 4) return 'positive';
  if (r >= 3) return 'neutral';
  return 'negative';
}

export function computeHealthScores(
  bookings: AnalyticsBooking[],
  customers: AnalyticsCustomer[],
  reviews: AnalyticsReview[],
): CustomerHealth[] {
  const now = Date.now();
  const thirtyAgo = now - 30 * DAY;

  const byCustomer = new Map<string, AnalyticsBooking[]>();
  for (const b of bookings) {
    if (!b.customer_id) continue;
    const arr = byCustomer.get(b.customer_id) ?? [];
    arr.push(b);
    byCustomer.set(b.customer_id, arr);
  }

  return customers
    .map((c) => {
      const custBookings = byCustomer.get(c.id) ?? [];
      const completed = custBookings.filter(
        (b) => b.status === 'completed' || b.status === 'confirmed',
      );
      const cancelled = custBookings.filter(
        (b) => b.status === 'cancelled' || b.status === 'no_show',
      );

      const lifetimeBookings = completed.length;
      const cancellationRate =
        custBookings.length > 0 ? cancelled.length / custBookings.length : 0;

      const last = c.last_booked_at
        ? new Date(c.last_booked_at).getTime()
        : completed.length > 0
          ? Math.max(...completed.map((b) => new Date(b.start_at).getTime()))
          : 0;

      const daysSinceLastVisit = last > 0 ? Math.floor((now - last) / DAY) : 999;

      // baseline: avg bookings / 30 days over last 90 days
      const ninetyDaysAgo = now - 90 * DAY;
      const inWindow = completed.filter(
        (b) => new Date(b.start_at).getTime() >= ninetyDaysAgo,
      ).length;
      const baseline = inWindow / 3; // per 30d
      const last30 = completed.filter(
        (b) => new Date(b.start_at).getTime() >= thirtyAgo,
      ).length;
      const recentFrequencyDelta =
        baseline === 0 ? (last30 > 0 ? 1 : -1) : (last30 - baseline) / baseline;

      const ltvCents = completed.reduce(
        (sum, b) => sum + (b.price_cents ?? 0),
        0,
      );

      const lastSentiment = sentimentFor(c.id, reviews);

      // score: start at 50
      let score = 50;
      if (daysSinceLastVisit <= 14) score += 25;
      else if (daysSinceLastVisit <= 30) score += 15;
      else if (daysSinceLastVisit <= 60) score += 0;
      else if (daysSinceLastVisit <= 120) score -= 20;
      else score -= 40;

      score += Math.min(15, lifetimeBookings * 2);
      score -= Math.round(cancellationRate * 40);
      score += Math.round(Math.max(-1, Math.min(1, recentFrequencyDelta)) * 15);

      if (lastSentiment === 'positive') score += 5;
      if (lastSentiment === 'negative') score -= 10;

      score = Math.max(0, Math.min(100, score));

      const status = classify(score, daysSinceLastVisit);

      return {
        customer: c,
        status,
        score,
        lifetimeBookings,
        cancellationRate,
        daysSinceLastVisit,
        recentFrequencyDelta,
        ltvCents,
        lastSentiment,
      };
    })
    .sort((a, b) => {
      const order: Record<HealthStatus, number> = {
        'At Risk': 0,
        Cooling: 1,
        Thriving: 2,
        Steady: 3,
        Lost: 4,
      };
      if (order[a.status] !== order[b.status]) {
        return order[a.status] - order[b.status];
      }
      return b.ltvCents - a.ltvCents;
    });
}
