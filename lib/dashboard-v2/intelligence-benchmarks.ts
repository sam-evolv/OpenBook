/**
 * Placeholder benchmark values for the Phase 3 Intelligence page.
 *
 * TODO(post-100-businesses): replace with real aggregates computed
 * nightly from the live business corpus (grouped by category). Until
 * we have ≥ 100 live businesses per category, these hand-seeded
 * estimates give owners a plausible "vs average" read without us
 * pretending the comparison is rigorous. The DISCLAIMER caption is
 * shown below the benchmark tiles so users know what they're looking
 * at without it feeling like a fear-tactic.
 *
 * Sources: OpenBook seed estimates informed by adjacent SME industry
 * reports (Ireland-weighted). Not audited. Not to be cited externally.
 */

export interface Benchmark {
  utilisationPercent: number;
  showRatePercent: number;
  avgMonthlyRevenueCents: number;
  avgRating: number;
}

const BENCHMARKS: Record<string, Benchmark> = {
  fitness: {
    utilisationPercent: 62,
    showRatePercent: 92,
    avgMonthlyRevenueCents: 280000,
    avgRating: 4.6,
  },
  personal_trainer: {
    utilisationPercent: 62,
    showRatePercent: 92,
    avgMonthlyRevenueCents: 280000,
    avgRating: 4.6,
  },
  beauty: {
    utilisationPercent: 68,
    showRatePercent: 94,
    avgMonthlyRevenueCents: 420000,
    avgRating: 4.7,
  },
  salon: {
    utilisationPercent: 68,
    showRatePercent: 94,
    avgMonthlyRevenueCents: 420000,
    avgRating: 4.7,
  },
  barber: {
    utilisationPercent: 72,
    showRatePercent: 96,
    avgMonthlyRevenueCents: 350000,
    avgRating: 4.8,
  },
  massage: {
    utilisationPercent: 60,
    showRatePercent: 91,
    avgMonthlyRevenueCents: 380000,
    avgRating: 4.7,
  },
  spa: {
    utilisationPercent: 60,
    showRatePercent: 91,
    avgMonthlyRevenueCents: 380000,
    avgRating: 4.7,
  },
  yoga: {
    utilisationPercent: 55,
    showRatePercent: 88,
    avgMonthlyRevenueCents: 540000,
    avgRating: 4.7,
  },
  fitness_studio: {
    utilisationPercent: 55,
    showRatePercent: 88,
    avgMonthlyRevenueCents: 540000,
    avgRating: 4.7,
  },
  nails: {
    utilisationPercent: 70,
    showRatePercent: 93,
    avgMonthlyRevenueCents: 320000,
    avgRating: 4.7,
  },
  physio: {
    utilisationPercent: 58,
    showRatePercent: 95,
    avgMonthlyRevenueCents: 450000,
    avgRating: 4.8,
  },
  generic: {
    utilisationPercent: 60,
    showRatePercent: 90,
    avgMonthlyRevenueCents: 350000,
    avgRating: 4.5,
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  fitness: 'fitness businesses',
  personal_trainer: 'personal trainers',
  beauty: 'beauty salons',
  salon: 'beauty salons',
  barber: 'barbers',
  massage: 'massage therapists',
  spa: 'spas',
  yoga: 'yoga studios',
  fitness_studio: 'fitness studios',
  nails: 'nail studios',
  physio: 'physiotherapists',
  generic: 'businesses on OpenBook',
};

export function benchmarkFor(category: string | null): {
  benchmark: Benchmark;
  label: string;
  resolvedKey: string;
} {
  const key = (category ?? 'generic').toLowerCase().replace(/\s+/g, '_');
  const benchmark = BENCHMARKS[key] ?? BENCHMARKS.generic!;
  const label = CATEGORY_LABELS[key] ?? CATEGORY_LABELS.generic!;
  const resolvedKey = BENCHMARKS[key] ? key : 'generic';
  return { benchmark, label, resolvedKey };
}

export const BENCHMARK_DISCLAIMER =
  'Benchmarks are industry estimates. They get more accurate as more businesses join OpenBook.';
