/**
 * Shared helpers for the Open Spots consumer surface.
 *
 * - Money: integer cents → "€30" / "€29.50" (en-IE, drop .00).
 * - Time: ISO timestamp → "Today 3:00 PM" / "Tomorrow 9:30 AM" /
 *   "Tue 12 May, 3:00 PM", always in Europe/Dublin.
 * - Urgency: tier 1 (≤4h) / 2 (≤24h) / 3 (later).
 * - Category mapping: spec-level buckets (Fitness/Wellness/Beauty/Health)
 *   → matchers against `businesses.category` free text.
 * - Time windows: when=today|tomorrow|week|2weeks → ISO bounds in
 *   Europe/Dublin local.
 */

export type OpenSpot = {
  id: string;
  business_id: string;
  business_name: string;
  business_slug: string;
  business_primary_colour: string;
  business_city: string;
  business_category: string;
  service_id: string;
  service_name: string;
  original_price_cents: number;
  sale_price_cents: number;
  discount_percent: number;
  slot_time: string;
  duration_minutes: number;
  expires_at: string;
  max_bookings: number;
  bookings_taken: number;
  urgency_tier: 1 | 2 | 3;
};

export type WhenFilter = 'today' | 'tomorrow' | 'week' | '2weeks';
export type CategoryFilter = 'all' | 'fitness' | 'wellness' | 'beauty' | 'health';

export const CATEGORY_OPTIONS: ReadonlyArray<{ id: CategoryFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'fitness', label: 'Fitness' },
  { id: 'wellness', label: 'Wellness' },
  { id: 'beauty', label: 'Beauty' },
  { id: 'health', label: 'Health' },
];

export const WHEN_OPTIONS: ReadonlyArray<{ id: WhenFilter; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'week', label: 'This week' },
  { id: '2weeks', label: 'Next 2 weeks' },
];

const CATEGORY_MATCHERS: Record<Exclude<CategoryFilter, 'all'>, string[]> = {
  fitness: ['fitness', 'gym', 'personal training', 'yoga', 'pilates', 'crossfit'],
  wellness: ['sauna', 'spa', 'wellness', 'massage', 'therapy', 'meditation'],
  beauty: ['salon', 'nails', 'beauty', 'barber', 'hair'],
  health: ['physio', 'health', 'chiro', 'osteo', 'dental', 'clinic'],
};

export { formatEUR } from './money';

const DAY = new Intl.DateTimeFormat('en-IE', {
  timeZone: 'Europe/Dublin',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

const TIME = new Intl.DateTimeFormat('en-IE', {
  timeZone: 'Europe/Dublin',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

/** "Today 3:00 PM" / "Tomorrow 9:30 AM" / "Tue 12 May, 3:00 PM". */
export function formatSlotTime(iso: string, now: Date = new Date()): string {
  const slot = new Date(iso);
  const today = dublinDateKey(now);
  const tomorrow = dublinDateKey(addDays(now, 1));
  const slotKey = dublinDateKey(slot);
  const time = TIME.format(slot);
  if (slotKey === today) return `Today ${time}`;
  if (slotKey === tomorrow) return `Tomorrow ${time}`;
  return `${DAY.format(slot)}, ${time}`;
}

export function formatSlotRange(iso: string, durationMinutes: number): string {
  const start = new Date(iso);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return `${TIME.format(start)} – ${TIME.format(end)}`;
}

export function computeUrgencyTier(
  slotIso: string,
  now: Date = new Date()
): 1 | 2 | 3 {
  const diffMs = new Date(slotIso).getTime() - now.getTime();
  const hours = diffMs / 3_600_000;
  if (hours <= 4) return 1;
  if (hours <= 24) return 2;
  return 3;
}

export function matchesCategoryFilter(
  businessCategory: string | null | undefined,
  filter: CategoryFilter
): boolean {
  if (filter === 'all') return true;
  const hay = (businessCategory ?? '').toLowerCase();
  if (!hay) return false;
  return CATEGORY_MATCHERS[filter].some((needle) => hay.includes(needle));
}

/** Inclusive lower bound, exclusive upper bound, both ISO. */
export function whenBounds(
  when: WhenFilter,
  now: Date = new Date()
): { fromIso: string; toIso: string } {
  const startOfTodayLocal = dublinStartOfDay(now);
  const startOfTomorrowLocal = addDays(startOfTodayLocal, 1);

  switch (when) {
    case 'today':
      return {
        fromIso: now.toISOString(),
        toIso: startOfTomorrowLocal.toISOString(),
      };
    case 'tomorrow':
      return {
        fromIso: startOfTomorrowLocal.toISOString(),
        toIso: addDays(startOfTomorrowLocal, 1).toISOString(),
      };
    case 'week':
      return {
        fromIso: now.toISOString(),
        toIso: addDays(now, 7).toISOString(),
      };
    case '2weeks':
      return {
        fromIso: now.toISOString(),
        toIso: addDays(now, 14).toISOString(),
      };
  }
}

export function isValidWhen(value: string | null | undefined): value is WhenFilter {
  return value === 'today' || value === 'tomorrow' || value === 'week' || value === '2weeks';
}

export function isValidCategory(value: string | null | undefined): value is CategoryFilter {
  return (
    value === 'all' ||
    value === 'fitness' ||
    value === 'wellness' ||
    value === 'beauty' ||
    value === 'health'
  );
}

// --- internals ---

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

function dublinStartOfDay(d: Date): Date {
  // Take the Dublin-local Y-M-D for `d`, then build that midnight as a Date.
  // We approximate by using the ISO output of `toLocaleString` with timezone.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Dublin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d); // "2026-05-11"
  // Construct midnight in Dublin: Dublin is UTC+0 (winter) or UTC+1 (summer).
  // Use the timezone offset of the source date in Europe/Dublin via a probe.
  const probe = new Date(`${parts}T00:00:00Z`);
  const dublinMidnightUtc = probe.getTime() - dublinOffsetMs(probe);
  return new Date(dublinMidnightUtc);
}

function dublinOffsetMs(d: Date): number {
  // Find the offset (ms) of Europe/Dublin from UTC at the given instant.
  const dtf = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Dublin',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(d).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value;
    return acc;
  }, {});
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - d.getTime();
}

function dublinDateKey(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Dublin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}
