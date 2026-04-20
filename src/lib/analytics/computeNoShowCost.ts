import type { AnalyticsBooking, AnalyticsCustomer } from './types';

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export type NoShowOffender = {
  customer: AnalyticsCustomer;
  count: number;
  lostCents: number;
  lastNoShow: string;
};

export type NoShowBreakdown = {
  monthLostCents: number;
  monthShareOfMissed: number; // 0..1
  monthTotalCount: number;
  ninetyDayCount: number;
  byDayOfWeek: Array<{ day: string; count: number }>;
  bySlot: Array<{ label: string; count: number }>;
  offenders: NoShowOffender[];
};

function monthStart(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function computeNoShowCost(
  bookings: AnalyticsBooking[],
  customers: AnalyticsCustomer[],
): NoShowBreakdown {
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const thisMonth = monthStart().getTime();

  const monthBookings = bookings.filter(
    (b) => new Date(b.start_at).getTime() >= thisMonth,
  );
  const monthNoShows = monthBookings.filter((b) => b.status === 'no_show');
  const monthCancelled = monthBookings.filter((b) => b.status === 'cancelled');

  const monthLostCents = monthNoShows.reduce(
    (sum, b) => sum + (b.price_cents ?? 0),
    0,
  );

  const missedCents =
    monthLostCents +
    monthCancelled.reduce((sum, b) => sum + (b.price_cents ?? 0), 0);

  const monthShareOfMissed = missedCents > 0 ? monthLostCents / missedCents : 0;

  const ninetyDayNoShows = bookings.filter((b) => b.status === 'no_show');

  // day of week
  const dayCounts = new Map<number, number>();
  for (const b of ninetyDayNoShows) {
    const d = new Date(b.start_at).getDay();
    dayCounts.set(d, (dayCounts.get(d) ?? 0) + 1);
  }
  const byDayOfWeek = Array.from({ length: 7 }, (_, i) => ({
    day: DAY_NAMES[i],
    count: dayCounts.get(i) ?? 0,
  }));

  // time slot buckets
  const slotBuckets: Array<{ label: string; from: number; to: number }> = [
    { label: 'Early morning', from: 6, to: 10 },
    { label: 'Late morning', from: 10, to: 12 },
    { label: 'Afternoon', from: 12, to: 17 },
    { label: 'Evening', from: 17, to: 21 },
    { label: 'Night', from: 21, to: 24 },
  ];
  const bySlot = slotBuckets.map((s) => ({
    label: s.label,
    count: ninetyDayNoShows.filter((b) => {
      const h = new Date(b.start_at).getHours();
      return h >= s.from && h < s.to;
    }).length,
  }));

  // repeat offenders
  const offenderMap = new Map<
    string,
    { count: number; lost: number; last: string }
  >();
  for (const b of ninetyDayNoShows) {
    if (!b.customer_id) continue;
    const entry = offenderMap.get(b.customer_id) ?? {
      count: 0,
      lost: 0,
      last: b.start_at,
    };
    entry.count += 1;
    entry.lost += b.price_cents ?? 0;
    if (b.start_at > entry.last) entry.last = b.start_at;
    offenderMap.set(b.customer_id, entry);
  }

  const offenders: NoShowOffender[] = Array.from(offenderMap.entries())
    .map(([customerId, v]) => {
      const customer = customerById.get(customerId);
      if (!customer) return null;
      return {
        customer,
        count: v.count,
        lostCents: v.lost,
        lastNoShow: v.last,
      };
    })
    .filter((x): x is NoShowOffender => x !== null)
    .filter((x) => x.count >= 2)
    .sort((a, b) => b.count - a.count || b.lostCents - a.lostCents)
    .slice(0, 10);

  return {
    monthLostCents,
    monthShareOfMissed,
    monthTotalCount: monthNoShows.length,
    ninetyDayCount: ninetyDayNoShows.length,
    byDayOfWeek,
    bySlot,
    offenders,
  };
}
