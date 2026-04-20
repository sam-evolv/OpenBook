import { redirect } from 'next/navigation';
import { hasSupabaseEnv } from '@/lib/supabase/server';
import { getOwnerBusiness, loadAnalyticsBundle } from '@/lib/analytics/queries';
import { computeTodayMetrics } from '@/lib/analytics/summary';
import { computeNoShowCost } from '@/lib/analytics/computeNoShowCost';
import { computeHealthScores } from '@/lib/analytics/computeHealthScore';
import { computeHeatmap } from '@/lib/analytics/computeHeatmap';
import {
  computeForecast,
  lastMonthRevenueCents,
} from '@/lib/analytics/computeForecast';
import { fallbackHeatmapCallouts } from '@/lib/ai/generateHeatmapCallouts';

import { HeroBand } from './components/HeroBand';
import { RevenueLeaks } from './components/RevenueLeaks';
import { DemandHeatmap } from './components/DemandHeatmap';
import { HeatmapCallouts } from './components/HeatmapCallouts';
import { CustomerHealthTable } from './components/CustomerHealthTable';
import { RevenueForecast } from './components/RevenueForecast';
import { AIInsightLog } from './components/AIInsightLog';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AnalyticsPage() {
  if (!hasSupabaseEnv()) {
    return <NoEnvState />;
  }

  const business = await getOwnerBusiness();
  if (!business) {
    redirect('/');
  }

  const bundle = await loadAnalyticsBundle(business.id);

  const today = computeTodayMetrics(bundle);
  const noShow = computeNoShowCost(bundle.bookings90, bundle.customers);
  const health = computeHealthScores(
    bundle.bookings90,
    bundle.customers,
    bundle.reviews,
  );
  const heatmap = computeHeatmap(bundle.bookings90, bundle.businessHours);
  const forecast = computeForecast(
    bundle.bookings90,
    bundle.bookingsFuture,
    lastMonthRevenueCents(bundle.bookings90),
  );

  const aiCallouts = bundle.heatmapCallouts.length >= 2
    ? {
        raise: bundle.heatmapCallouts[0].body,
        flash: bundle.heatmapCallouts[1].body,
      }
    : fallbackHeatmapCallouts(heatmap);

  return (
    <main className="min-h-screen bg-ink">
      <div className="mx-auto max-w-[1360px] px-4 sm:px-6 py-8 sm:py-10">
        <PageHeader businessName={bundle.business?.name ?? business.name} />

        <section className="mt-8 space-y-6">
          <HeroBand
            metrics={today}
            weeklyInsight={bundle.latestWeeklyInsight}
            hasEnoughData={bundle.hasEnoughData}
          />

          <RevenueLeaks breakdown={noShow} hasEnoughData={bundle.hasEnoughData} />

          <div className="rounded-2xl border border-line bg-[#0f1115] overflow-hidden">
            <DemandHeatmap summary={heatmap} hasEnoughData={bundle.hasEnoughData} />
            <HeatmapCallouts callouts={aiCallouts} hasEnoughData={bundle.hasEnoughData} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CustomerHealthTable scores={health} hasEnoughData={bundle.hasEnoughData} />
            <RevenueForecast summary={forecast} hasEnoughData={bundle.hasEnoughData} />
          </div>

          <AIInsightLog insights={bundle.insightLog.filter((i) => i.insight_type === 'weekly')} />
        </section>
      </div>
    </main>
  );
}

function PageHeader({ businessName }: { businessName: string }) {
  const today = new Date().toLocaleDateString('en-IE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return (
    <header className="flex flex-col gap-1">
      <div className="font-mono text-[10.5px] tracking-[0.24em] uppercase text-paper/40">
        Analytics · {today}
      </div>
      <h1 className="font-display text-[clamp(28px,4vw,44px)] text-paper leading-tight tracking-tighter">
        {businessName}
        <span className="text-paper/40">, at a glance.</span>
      </h1>
      <p className="mt-1 text-[14px] text-paper/55 max-w-2xl">
        What normally takes an accountant, a spreadsheet, and a Sunday afternoon — in one page.
      </p>
    </header>
  );
}

function NoEnvState() {
  return (
    <main className="min-h-screen bg-ink flex items-center justify-center p-8">
      <div className="max-w-md rounded-2xl border border-line bg-[#0f1115] p-8">
        <div className="font-mono text-[10.5px] tracking-[0.24em] uppercase text-gold">
          Setup required
        </div>
        <h1 className="mt-3 font-display text-[28px] text-paper leading-tight">
          Connect Supabase first.
        </h1>
        <p className="mt-3 text-[14px] text-paper/60">
          The analytics page reads from your bookings, customers, and services
          tables in Supabase. Add{' '}
          <code className="text-gold font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
          <code className="text-gold font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{' '}
          to your environment and reload.
        </p>
      </div>
    </main>
  );
}
