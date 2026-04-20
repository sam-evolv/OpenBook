import type { AnalyticsBooking } from './types';

export type ForecastPoint = {
  weekLabel: string;
  weekStart: string; // iso
  projectedCents: number;
  lowCents: number; // 80% CI lower
  highCents: number; // 80% CI upper
  actualCents?: number;
  isActual: boolean;
};

export type ForecastSummary = {
  history: ForecastPoint[]; // last 8 weeks actual
  projection: ForecastPoint[]; // next 4 weeks
  goalCents: number;
  goalGapCents: number; // how much short of goal over 4wks
  bookingsNeededForGoal: number;
  avgBookingValueCents: number;
};

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;

function mondayAt(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay();
  // shift so Monday is start
  const diff = (dow + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

function weekLabel(d: Date): string {
  const month = d.toLocaleString('en-IE', { month: 'short' });
  return `${month} ${d.getDate()}`;
}

/**
 * Revenue forecast for the next 4 weeks.
 *
 * Signal mix:
 *  1. Confirmed bookings already on the books for each forward week.
 *  2. Last 8 weeks' realised revenue projected forward with linear trend.
 *  3. Pending / tentative bookings are weighted by historical conversion rate.
 *
 * Confidence band = ±20% of the projection, widening weekly.
 */
export function computeForecast(
  bookings: AnalyticsBooking[],
  futureBookings: AnalyticsBooking[],
  lastMonthRevenueCents: number,
): ForecastSummary {
  const now = new Date();
  const currentMonday = mondayAt(now);

  // Actual per-week revenue for the last 8 completed/ongoing weeks
  const history: ForecastPoint[] = [];
  for (let i = 8; i >= 1; i--) {
    const weekStart = new Date(currentMonday.getTime() - i * WEEK);
    const weekEnd = new Date(weekStart.getTime() + WEEK);
    const actualCents = bookings
      .filter((b) => {
        const t = new Date(b.start_at).getTime();
        return (
          t >= weekStart.getTime() &&
          t < weekEnd.getTime() &&
          (b.status === 'completed' || b.status === 'confirmed')
        );
      })
      .reduce((s, b) => s + (b.price_cents ?? 0), 0);
    history.push({
      weekLabel: weekLabel(weekStart),
      weekStart: weekStart.toISOString(),
      projectedCents: actualCents,
      lowCents: actualCents,
      highCents: actualCents,
      actualCents,
      isActual: true,
    });
  }

  const historicAvg =
    history.reduce((s, h) => s + h.projectedCents, 0) / Math.max(1, history.length);

  // simple linear trend over the last 8 weeks
  const xs = history.map((_, i) => i);
  const ys = history.map((h) => h.projectedCents);
  const n = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, b, i) => a + b * ys[i], 0);
  const sumXX = xs.reduce((a, b) => a + b * b, 0);
  const denom = n * sumXX - sumX * sumX || 1;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // conversion rate: completed / (completed + cancelled + no_show) over 90d
  const completedCt = bookings.filter((b) => b.status === 'completed').length;
  const totalCt = bookings.filter((b) =>
    ['completed', 'cancelled', 'no_show'].includes(b.status),
  ).length;
  const conversion = totalCt > 0 ? completedCt / totalCt : 0.82;

  // projection for next 4 weeks
  const projection: ForecastPoint[] = [];
  for (let i = 0; i < 4; i++) {
    const weekStart = new Date(currentMonday.getTime() + i * WEEK);
    const weekEnd = new Date(weekStart.getTime() + WEEK);

    const confirmedForwardCents = futureBookings
      .filter((b) => {
        const t = new Date(b.start_at).getTime();
        return (
          t >= weekStart.getTime() &&
          t < weekEnd.getTime() &&
          b.status === 'confirmed'
        );
      })
      .reduce((s, b) => s + (b.price_cents ?? 0), 0);

    const pendingForwardCents = futureBookings
      .filter((b) => {
        const t = new Date(b.start_at).getTime();
        return (
          t >= weekStart.getTime() &&
          t < weekEnd.getTime() &&
          b.status === 'pending'
        );
      })
      .reduce((s, b) => s + (b.price_cents ?? 0), 0);

    const trendCents = Math.max(0, intercept + slope * (history.length + i));
    // weight heavier on what we already have booked
    const bookedWeight = 0.6;
    const trendWeight = 0.4;
    const projectedCents = Math.round(
      (confirmedForwardCents + pendingForwardCents * conversion) * bookedWeight +
        trendCents * trendWeight +
        (1 - bookedWeight) * (historicAvg * 0.05),
    );

    // widen CI over time
    const bandPct = 0.15 + i * 0.05;
    const lowCents = Math.max(0, Math.round(projectedCents * (1 - bandPct)));
    const highCents = Math.round(projectedCents * (1 + bandPct));

    projection.push({
      weekLabel: weekLabel(weekStart),
      weekStart: weekStart.toISOString(),
      projectedCents,
      lowCents,
      highCents,
      isActual: false,
    });
  }

  // goal: last month's revenue + 10%, split across the 4-week forward window
  const goalCents = Math.round(lastMonthRevenueCents * 1.1);
  const projectedTotal = projection.reduce(
    (s, p) => s + p.projectedCents,
    0,
  );
  const goalGapCents = Math.max(0, goalCents - projectedTotal);

  const completedBookings = bookings.filter(
    (b) => b.status === 'completed' || b.status === 'confirmed',
  );
  const avgBookingValueCents =
    completedBookings.length > 0
      ? Math.round(
          completedBookings.reduce((s, b) => s + (b.price_cents ?? 0), 0) /
            completedBookings.length,
        )
      : 0;

  const bookingsNeededForGoal =
    avgBookingValueCents > 0
      ? Math.ceil(goalGapCents / avgBookingValueCents)
      : 0;

  return {
    history,
    projection,
    goalCents,
    goalGapCents,
    bookingsNeededForGoal,
    avgBookingValueCents,
  };
}

/**
 * Convenience: last-month revenue used as the default goal anchor.
 */
export function lastMonthRevenueCents(bookings: AnalyticsBooking[]): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  const end = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  return bookings
    .filter((b) => {
      const t = new Date(b.start_at).getTime();
      return (
        t >= start &&
        t < end &&
        (b.status === 'completed' || b.status === 'confirmed')
      );
    })
    .reduce((s, b) => s + (b.price_cents ?? 0), 0);
}
