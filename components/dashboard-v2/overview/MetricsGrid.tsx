import Link from 'next/link';
import { Metric } from '../Metric';
import { Card } from '../Card';
import type { MetricsPayload } from '@/lib/dashboard-v2/overview-queries';

interface MetricsGridProps {
  data: MetricsPayload;
  businessSlug: string;
}

function hasAnySignal(data: MetricsPayload): boolean {
  return (
    data.revenueToday > 0 ||
    data.bookingsToday > 0 ||
    data.revenueThisWeek > 0 ||
    data.activeCustomers > 0
  );
}

export function MetricsGrid({ data, businessSlug }: MetricsGridProps) {
  if (!hasAnySignal(data)) {
    return (
      <Card padding="lg">
        <div className="flex flex-col items-center text-center py-6 px-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.6px] text-paper-text-3 dark:text-ink-text-3 mb-2">
            Today · this week · customers
          </div>
          <h3 className="text-[15px] font-semibold text-paper-text-1 dark:text-ink-text-1 mb-1.5">
            Your first booking is where these charts start
          </h3>
          <p className="text-[13px] text-paper-text-2 dark:text-ink-text-2 max-w-md">
            Share your business page with your first customers — once they book, revenue, bookings,
            and active customers all start showing up here with 7-day sparklines.
          </p>
          <Link
            href={`https://openbook.ie/${businessSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 text-[13px] font-semibold text-gold hover:underline"
          >
            openbook.ie/{businessSlug} →
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Metric
        label="Revenue today"
        prefix="€"
        value={data.revenueToday.toLocaleString()}
        delta={data.revenueTodayDelta ?? undefined}
        deltaLabel="vs yesterday"
        sparkline={data.revenueTodaySparkline}
        accent
      />
      <Metric
        label="Bookings today"
        value={data.bookingsToday}
        delta={data.bookingsTodayDelta ?? undefined}
        deltaLabel="vs yesterday"
        sparkline={data.bookingsTodaySparkline}
      />
      <Metric
        label="This week"
        prefix="€"
        value={data.revenueThisWeek.toLocaleString()}
        delta={data.revenueThisWeekDelta ?? undefined}
        sparkline={data.revenueThisWeekSparkline}
      />
      <Metric
        label="Active customers"
        value={data.activeCustomers}
        delta={data.activeCustomersDelta ?? undefined}
        deltaLabel="vs prior 30d"
        sparkline={data.activeCustomersSparkline}
      />
    </div>
  );
}
