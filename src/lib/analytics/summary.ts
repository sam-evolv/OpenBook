import type { AnalyticsBooking, AnalyticsBundle } from './types';

export function formatEuro(cents: number): string {
  const euros = cents / 100;
  if (Math.abs(euros) >= 1000) {
    return `€${euros.toLocaleString('en-IE', { maximumFractionDigits: 0 })}`;
  }
  return `€${euros.toLocaleString('en-IE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatCompactEuro(cents: number): string {
  const euros = cents / 100;
  if (Math.abs(euros) >= 1000) {
    return `€${(euros / 1000).toLocaleString('en-IE', { maximumFractionDigits: 1 })}k`;
  }
  return `€${Math.round(euros).toLocaleString('en-IE')}`;
}

export function percent(x: number, digits = 0): string {
  return `${(x * 100).toFixed(digits)}%`;
}

export function pctDelta(current: number, baseline: number): number {
  if (baseline === 0) return current > 0 ? 1 : 0;
  return (current - baseline) / baseline;
}

export type TodayMetrics = {
  bookingsToday: number;
  bookingsDelta: number;
  revenueTodayCents: number;
  revenueDeltaPct: number;
  utilisationToday: number;
  utilisationDeltaPts: number;
};

export function computeTodayMetrics(bundle: AnalyticsBundle): TodayMetrics {
  const today = bundle.bookingsToday.filter(
    (b) => b.status === 'confirmed' || b.status === 'completed',
  );
  const yesterday = bundle.bookingsYesterday.filter(
    (b) => b.status === 'confirmed' || b.status === 'completed',
  );

  const revenueTodayCents = today.reduce(
    (s, b) => s + (b.price_cents ?? 0),
    0,
  );
  const revenueYesterdayCents = yesterday.reduce(
    (s, b) => s + (b.price_cents ?? 0),
    0,
  );

  const utilToday = simpleUtilisation(today);
  const utilYesterday = simpleUtilisation(yesterday);

  return {
    bookingsToday: today.length,
    bookingsDelta: today.length - yesterday.length,
    revenueTodayCents,
    revenueDeltaPct: pctDelta(revenueTodayCents, revenueYesterdayCents),
    utilisationToday: utilToday,
    utilisationDeltaPts: utilToday - utilYesterday,
  };
}

function simpleUtilisation(bookings: AnalyticsBooking[]): number {
  // crude proxy: bookings over a 10-slot day
  const cap = 10;
  return Math.min(1, bookings.length / cap);
}
