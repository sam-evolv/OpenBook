// search_businesses — ranked search over live businesses with sample slots.
// Spec: docs/mcp-server-spec.md sections 5.2 (tool) and 6 (ranking).
// Column mappings: Appendix D.
//
// Pipeline:
//   1. parse `when`, `location`; classify intent
//   2. fetch up to 30 candidates via filtered `businesses` query
//   3. fetch sample availability per candidate (concurrency 5)
//   4. fetch promoted overlay (single batched query)
//   5. fetch review aggregates + booking-feedback rolling 90d
//   6. rank, trim to limit, build response, validate, log
// p95 budget: 600ms (spec section 14).

import {
  searchBusinessesInput,
  searchBusinessesOutput,
} from '../../../../lib/mcp/schemas';
import { supabaseAdmin } from '../../../../lib/supabase';
import {
  classifyIntent,
  type IntentClassification,
} from '../../../../lib/mcp/intent-classifier';
import {
  extractKeywords,
  buildOrFilter,
} from '../../../../lib/mcp/keyword-fallback';
import { categoryQueryVariants } from '../../../../lib/mcp/category-normalise';
import { parseLocation, type ParsedLocation } from '../../../../lib/mcp/parse-location';
import { parseWhen, type ParsedWhen } from '../../../../lib/mcp/parse-when';
import {
  rankBusinesses,
  RANKING_WEIGHTS,
  RELATED_CATEGORIES,
  type BusinessForRanking,
  type RankableBusiness,
  type RankedResult,
} from '../../../../lib/mcp/ranker';
import { logSearchQuery } from '../../../../lib/mcp/logging';
import { safeTask, wrapToolBoundary } from '../../../../lib/mcp/serialization';
import type { ToolContext, ToolHandler } from './index';

const MAX_CANDIDATES = 30;
const AVAILABILITY_CONCURRENCY = 5;
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 10;
const SHORT_DESC_MAX = 140;

// Structured per-stage logging for the search pipeline. Every line is prefixed
// with `[search.diag]` and tagged with `query_id` so the full trace for a
// single request can be reconstructed by grepping production logs. Kept at
// info level so it survives default log filters.
function diag(stage: string, payload: Record<string, unknown>): void {
  console.info(`[search.diag] ${stage}`, payload);
}

function describeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  if (err && typeof err === 'object') {
    return { value: err };
  }
  return { value: String(err) };
}

type SupabaseClient = ReturnType<typeof supabaseAdmin>;

type SlotRow = { start_iso: string; end_iso: string; service_id: string; service_name: string; price_eur: number; deposit_eur?: number };

type ServiceRow = {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  sort_order: number | null;
  is_active: boolean | null;
  updated_at: string | null;
};

type BusinessHoursRow = {
  updated_at: string | null;
};

type CandidateRow = {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  description: string | null;
  about_long: string | null;
  tagline: string | null;
  city: string | null;
  amenities: string[] | null;
  accessibility_notes: string | null;
  space_description: string | null;
  created_at: string | null;
  updated_at: string | null;
  services: ServiceRow[] | null;
  business_hours: BusinessHoursRow[] | null;
  reviews: Array<{ rating: number | null }> | null;
};

function truncateAtWord(s: string, max: number): string {
  if (s.length <= max) return s;
  const slice = s.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(' ');
  const cut = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
  return `${cut}…`;
}

function deriveShortDescription(row: { tagline: string | null; description: string | null }): string | undefined {
  for (const candidate of [row.tagline, row.description]) {
    if (candidate && candidate.trim()) {
      return truncateAtWord(candidate.trim(), SHORT_DESC_MAX);
    }
  }
  return undefined;
}

// Most-recent updated_at across the business row, its services, and its
// business_hours. Feeds the ranker's RecencyScore — see Section 6.2.
// Returns null when no signal exists; the ranker then floors the score
// to 0.3 rather than treating "unknown" as fresh.
function maxUpdatedAt(c: CandidateRow): string | null {
  const ts: number[] = [];
  const push = (s: string | null | undefined) => {
    if (!s) return;
    const t = new Date(s).getTime();
    if (!Number.isNaN(t)) ts.push(t);
  };
  push(c.updated_at);
  for (const s of c.services ?? []) push(s.updated_at);
  for (const h of c.business_hours ?? []) push(h.updated_at);
  if (ts.length === 0) return null;
  return new Date(Math.max(...ts)).toISOString();
}

function locationSummary(row: { city: string | null }): string {
  return row.city ?? 'Ireland';
}

function reviewAggregate(reviews: Array<{ rating: number | null }> | null): {
  average: number | null;
  count: number;
} {
  const valid = (reviews ?? []).filter((r): r is { rating: number } => typeof r.rating === 'number');
  if (valid.length === 0) return { average: null, count: 0 };
  const avg = valid.reduce((s, r) => s + r.rating, 0) / valid.length;
  return { average: Math.round(avg * 10) / 10, count: valid.length };
}

function eligibleService(services: ServiceRow[] | null, priceMaxEur?: number): ServiceRow | null {
  const active = (services ?? []).filter((s) => s.is_active !== false);
  const inPrice = priceMaxEur !== undefined ? active.filter((s) => s.price_cents <= priceMaxEur * 100) : active;
  if (inPrice.length === 0) return null;
  // Cheapest first; ties broken by sort_order.
  inPrice.sort(
    (a, b) =>
      a.price_cents - b.price_cents || (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  return inPrice[0];
}

function dateStringsInWindow(from: Date, to: Date): string[] {
  const out: string[] = [];
  const fromIso = from.toISOString().slice(0, 10);
  const toIso = to.toISOString().slice(0, 10);
  let cursor = new Date(`${fromIso}T00:00:00Z`);
  const end = new Date(`${toIso}T00:00:00Z`);
  while (cursor.getTime() <= end.getTime()) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

async function fetchSampleSlots(
  supa: SupabaseClient,
  candidate: CandidateRow,
  service: ServiceRow,
  window: ParsedWhen,
): Promise<SlotRow[]> {
  const dates = dateStringsInWindow(window.from, window.to);
  const results = await Promise.all(
    dates.map((d) =>
      safeTask(
        `search.availability:${candidate.slug}:${d}`,
        supa.rpc('get_availability_for_ai', {
          p_business_id: candidate.id,
          p_service_id: service.id,
          p_date: d,
        }),
      ),
    ),
  );
  const all: SlotRow[] = [];
  for (const r of results) {
    if (!r || r.error || !Array.isArray(r.data)) continue;
    for (const row of r.data as Array<{ slot_start: string; slot_end: string }>) {
      const startMs = new Date(row.slot_start).getTime();
      if (Number.isNaN(startMs)) continue;
      if (startMs < window.from.getTime() || startMs > window.to.getTime()) continue;
      all.push({
        start_iso: new Date(row.slot_start).toISOString(),
        end_iso: new Date(row.slot_end).toISOString(),
        service_id: service.id,
        service_name: service.name,
        price_eur: service.price_cents / 100,
      });
    }
  }
  all.sort((a, b) => a.start_iso.localeCompare(b.start_iso));
  return all.slice(0, 3);
}

async function processInBatches<T, R>(
  items: T[],
  size: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size);
    const part = await Promise.all(batch.map(fn));
    out.push(...part);
  }
  return out;
}

type PromotedRow = {
  business_id: string;
  service_id: string;
  slot_start: string;
  kind: 'standard' | 'flash_sale';
  original_price_eur: number;
  promoted_price_eur: number;
  message: string | null;
};

async function fetchPromotedOverlay(
  supa: SupabaseClient,
  candidates: Array<{ id: string; service_id: string }>,
  window: ParsedWhen,
): Promise<Map<string, PromotedRow>> {
  const map = new Map<string, PromotedRow>();
  if (candidates.length === 0) return map;

  const businessIds = Array.from(new Set(candidates.map((c) => c.id)));
  const serviceIds = Array.from(new Set(candidates.map((c) => c.service_id)));

  const { data, error } = await supa
    .from('mcp_promoted_slots')
    .select('business_id, service_id, slot_start, kind, original_price_eur, promoted_price_eur, message')
    .in('business_id', businessIds)
    .in('service_id', serviceIds)
    .in('kind', ['standard', 'flash_sale'])
    .eq('is_active', true)
    .gte('slot_start', window.from.toISOString())
    .lte('slot_start', window.to.toISOString());

  if (error) {
    console.error('[mcp.search] promoted overlay error:', error);
    return map;
  }

  for (const row of (data ?? []) as PromotedRow[]) {
    const key = `${row.business_id}:${row.service_id}:${new Date(row.slot_start).toISOString()}`;
    map.set(key, row);
  }
  return map;
}

type FeedbackAgg = {
  feedback_sample_size: number;
  showed_up_rate: number | null;
  would_rebook_rate: number | null;
  cancellation_rate: number | null;
};

async function fetchFeedbackAggregates(
  supa: SupabaseClient,
  businessIds: string[],
): Promise<Map<string, FeedbackAgg>> {
  const map = new Map<string, FeedbackAgg>();
  if (businessIds.length === 0) return map;

  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  // booking_feedback joined with bookings to attribute to a business.
  const { data: fbRows, error: fbErr } = await supa
    .from('booking_feedback')
    .select('showed_up, would_rebook, bookings!inner(business_id, created_at)')
    .gte('created_at', cutoff);

  // Cancellation rate: bookings.status = 'cancelled' or cancelled_at not null.
  const { data: bkRows, error: bkErr } = await supa
    .from('bookings')
    .select('business_id, status, cancelled_at')
    .in('business_id', businessIds)
    .gte('created_at', cutoff);

  if (fbErr) console.error('[mcp.search] booking_feedback aggregate error:', fbErr);
  if (bkErr) console.error('[mcp.search] bookings aggregate error:', bkErr);

  type FB = { showed_up: boolean | null; would_rebook: boolean | null; bookings: { business_id: string } | null };
  const fbBy: Record<string, { count: number; showed: number; rebook: number }> = {};
  for (const row of (fbRows ?? []) as unknown as FB[]) {
    const bid = row.bookings?.business_id;
    if (!bid || !businessIds.includes(bid)) continue;
    if (!fbBy[bid]) fbBy[bid] = { count: 0, showed: 0, rebook: 0 };
    fbBy[bid].count += 1;
    if (row.showed_up === true) fbBy[bid].showed += 1;
    if (row.would_rebook === true) fbBy[bid].rebook += 1;
  }

  type BK = { business_id: string; status: string | null; cancelled_at: string | null };
  const bkBy: Record<string, { total: number; cancelled: number }> = {};
  for (const row of (bkRows ?? []) as BK[]) {
    if (!bkBy[row.business_id]) bkBy[row.business_id] = { total: 0, cancelled: 0 };
    bkBy[row.business_id].total += 1;
    if (row.status === 'cancelled' || row.cancelled_at) bkBy[row.business_id].cancelled += 1;
  }

  for (const bid of businessIds) {
    const fb = fbBy[bid];
    const bk = bkBy[bid];
    map.set(bid, {
      feedback_sample_size: fb?.count ?? 0,
      showed_up_rate: fb && fb.count > 0 ? fb.showed / fb.count : null,
      would_rebook_rate: fb && fb.count > 0 ? fb.rebook / fb.count : null,
      cancellation_rate: bk && bk.total > 0 ? bk.cancelled / bk.total : null,
    });
  }
  return map;
}

function humaniseKeyword(k: string): string {
  const map: Record<string, string> = {
    injury_friendly: 'injury-aware training',
    low_impact: 'low-impact options',
    wheelchair_accessible: 'wheelchair access',
    kids_welcome: 'kids welcome',
    vegan: 'vegan options',
    beginner_friendly: 'beginner-friendly',
    pregnancy_safe: 'pregnancy-safe options',
  };
  return map[k] ?? k.replace(/_/g, ' ');
}

function buildWhyRecommended(
  result: RankedResult,
  classification: IntentClassification,
  parsedLocation: ParsedLocation | null,
  customerContext: unknown,
  avgQuality: number,
): string | undefined {
  if (!customerContext) return undefined;

  const haystack = [
    ...(result.business.amenities ?? []),
    result.business.accessibility_notes ?? '',
    result.business.space_description ?? '',
  ]
    .join(' ')
    .toLowerCase();

  // Constraint-keyword match takes priority.
  for (const keyword of classification.constraint_keywords) {
    if (haystack.includes(keyword.toLowerCase())) {
      const constraintHint = (classification.constraint_keywords[0] ?? keyword).replace(/_/g, ' ');
      return `Good for ${humaniseKeyword(keyword)} given the ${constraintHint} you mentioned.`;
    }
  }

  if (result.score_breakdown.quality_score / RANKING_WEIGHTS.quality_score > avgQuality + 0.15) {
    return 'Strong reviews and follow-through from past customers.';
  }

  if (
    result.score_breakdown.proximity_score === 0.18 * 0.95 &&
    parsedLocation?.neighbourhood
  ) {
    return `Right in ${parsedLocation.neighbourhood}.`;
  }

  return undefined;
}

const includeBreakdown = () => process.env.MCP_INCLUDE_SCORE_BREAKDOWN === 'true';

const FALLBACK_NOTE_NO_MATCH =
  "We couldn't find a confident match for that query. Try mentioning a category (gym, salon, yoga, etc.) or a city, or call get_promoted_inventory for current deals.";
const FALLBACK_NOTE_KEYWORD =
  'Showing keyword matches; live availability not yet checked. Call get_availability with the listed slug for precise slots.';

type KeywordCandidateRow = {
  slug: string;
  name: string;
  category: string | null;
  description: string | null;
  tagline: string | null;
  city: string | null;
};

async function runKeywordFallback(args: {
  supa: SupabaseClient;
  intent: string;
  location?: string;
  limit: number;
  queryId: string;
}): Promise<{ results: Array<Record<string, unknown>>; query_id: string; notes?: string }> {
  const { supa, intent, location, limit, queryId } = args;
  const keywords = extractKeywords(intent, location);
  const columns = 'slug, name, category, description, tagline, city';
  diag('keyword_fallback_start', { query_id: queryId, keywords });

  async function tryFilter(filterColumns: string[]): Promise<KeywordCandidateRow[]> {
    if (keywords.length === 0) return [];
    const orFilter = buildOrFilter(filterColumns, keywords);
    if (!orFilter) return [];
    const { data, error } = await supa
      .from('businesses')
      .select(columns)
      .eq('is_live', true)
      .or(orFilter)
      .limit(limit);
    if (error) {
      console.error('[mcp.search] keyword fallback query error:', error);
      diag('keyword_fallback_query_error', {
        query_id: queryId,
        columns: filterColumns,
        error: describeError(error),
      });
      return [];
    }
    diag('keyword_fallback_attempt', {
      query_id: queryId,
      columns: filterColumns,
      count: (data ?? []).length,
    });
    return (data ?? []) as unknown as KeywordCandidateRow[];
  }

  let rows = await tryFilter(['category', 'city']);
  if (rows.length === 0) rows = await tryFilter(['name', 'description']);

  if (rows.length === 0) {
    diag('keyword_fallback_no_match', { query_id: queryId });
    return { results: [], query_id: queryId, notes: FALLBACK_NOTE_NO_MATCH };
  }
  diag('keyword_fallback_results', {
    query_id: queryId,
    count: Math.min(rows.length, limit),
    slugs: rows.slice(0, limit).map((r) => r.slug),
  });

  const results = rows.slice(0, limit).map((c) => {
    const shortDesc = deriveShortDescription({ tagline: c.tagline, description: c.description });
    return {
      slug: c.slug,
      name: c.name,
      category: c.category ?? '',
      ...(shortDesc ? { short_description: shortDesc } : {}),
      location_summary: c.city ?? 'Ireland',
      sample_slots: [],
      booking_url_hint: `/${c.slug}`,
    } as Record<string, unknown>;
  });

  return { results, query_id: queryId, notes: FALLBACK_NOTE_KEYWORD };
}

export const _searchBusinessesImpl: ToolHandler = async (input, ctx: ToolContext) => {
  const parsed = searchBusinessesInput.parse(input);
  const { intent, location, when, price_max_eur, customer_context } = parsed;
  const limit = Math.min(parsed.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

  const parsedLocation = parseLocation(location);
  let parsedWhen = parseWhen({ when });
  if (!parsedWhen) {
    const now = new Date();
    parsedWhen = { from: now, to: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) };
  }

  const queryId = crypto.randomUUID();
  const supa = supabaseAdmin();

  diag('request_received', {
    query_id: queryId,
    intent,
    location: location ?? null,
    when: when ?? null,
    price_max_eur: price_max_eur ?? null,
    limit,
    parsed_location: parsedLocation,
    parsed_when: { from: parsedWhen.from.toISOString(), to: parsedWhen.to.toISOString() },
  });

  // The handler must NEVER throw. Agentic clients (Claude desktop in
  // particular) interpret a tool error as "this tool is broken, try a
  // different approach" and abandon the conversation. Any unexpected
  // failure below falls through to the keyword fallback.
  try {
  const classification = await classifyIntent({ intent, customer_context });
  diag('classified_intent', {
    query_id: queryId,
    category: classification.category,
    confidence: classification.confidence,
    subcategories: classification.subcategories,
    constraint_keywords: classification.constraint_keywords,
  });

  // Candidate query.
  const useCategoryFilter =
    classification.category !== 'other' && classification.confidence > 0.5;
  const allowedCategories = useCategoryFilter
    ? [classification.category, ...(RELATED_CATEGORIES[classification.category] ?? [])]
    : null;

  let q = supa
    .from('businesses')
    .select(`
      id, slug, name, category, description, about_long, tagline,
      city, amenities, accessibility_notes, space_description,
      created_at, updated_at,
      services (id, name, duration_minutes, price_cents, sort_order, is_active, updated_at),
      business_hours (updated_at),
      reviews (rating)
    `)
    .eq('is_live', true)
    .limit(MAX_CANDIDATES);

  let categoryVariants: string[] | null = null;
  if (allowedCategories && allowedCategories.length > 0) {
    // The classifier emits snake_case categories but businesses.category is
    // stored in mixed forms ("Personal Training" etc.). Expand to all
    // plausible variants so we don't miss matches at the DB layer.
    categoryVariants = Array.from(
      new Set(allowedCategories.flatMap((c) => categoryQueryVariants(c))),
    );
    q = q.in('category', categoryVariants);
  }
  if (parsedLocation?.city) {
    // businesses.city is stored title-cased ("Cork", "Dublin") but
    // parseLocation returns lowercase tokens. PostgREST `.eq` is
    // case-sensitive, so an exact match against a lowercase value drops
    // every location-filtered query. ILIKE without wildcards gives
    // case-insensitive equality and matches the stored Title-Case form.
    q = q.ilike('city', parsedLocation.city);
  }
  diag('candidate_query_filters', {
    query_id: queryId,
    is_live: true,
    category_variants: categoryVariants,
    city_filter: parsedLocation?.city ?? null,
    limit: MAX_CANDIDATES,
  });

  const { data: rawCandidates, error: candErr } = await q;
  if (candErr) {
    console.error('[mcp.search] candidate query error; running keyword fallback:', candErr);
    diag('candidate_query_error', {
      query_id: queryId,
      error: describeError(candErr),
    });
    return runKeywordFallback({ supa, intent, location, limit, queryId });
  }
  const candidates = (rawCandidates ?? []) as unknown as CandidateRow[];
  diag('candidates_after_db_query', {
    query_id: queryId,
    count: candidates.length,
    ids: candidates.map((c) => c.id),
    slugs: candidates.map((c) => c.slug),
    categories: candidates.map((c) => c.category),
    cities: candidates.map((c) => c.city),
  });

  // Pick a primary service per candidate (price-filtered when price_max_eur is set).
  const candidateWithService = candidates
    .map((c) => ({ candidate: c, service: eligibleService(c.services, price_max_eur) }))
    .filter((x): x is { candidate: CandidateRow; service: ServiceRow } => x.service !== null);
  const droppedNoEligibleService = candidates
    .filter((c) => eligibleService(c.services, price_max_eur) === null)
    .map((c) => ({ id: c.id, slug: c.slug, service_count: (c.services ?? []).length }));
  diag('after_service_filter', {
    query_id: queryId,
    count: candidateWithService.length,
    ids: candidateWithService.map((x) => x.candidate.id),
    dropped_no_eligible_service: droppedNoEligibleService,
    price_max_eur: price_max_eur ?? null,
  });

  // Sample slots per candidate, concurrency-limited.
  const window = parsedWhen;
  const withSlots = await processInBatches(
    candidateWithService,
    AVAILABILITY_CONCURRENCY,
    async ({ candidate, service }) => {
      const slots = await fetchSampleSlots(supa, candidate, service, window);
      return { candidate, service, slots };
    },
  );
  diag('after_sample_slots', {
    query_id: queryId,
    window: { from: window.from.toISOString(), to: window.to.toISOString() },
    per_candidate: withSlots.map((x) => ({
      id: x.candidate.id,
      slug: x.candidate.slug,
      service_id: x.service.id,
      slot_count: x.slots.length,
    })),
  });

  const surviving = withSlots.filter((x) => x.slots.length > 0);
  const droppedNoSlots = withSlots
    .filter((x) => x.slots.length === 0)
    .map((x) => ({ id: x.candidate.id, slug: x.candidate.slug, service_id: x.service.id }));
  diag('after_surviving_filter', {
    query_id: queryId,
    count: surviving.length,
    ids: surviving.map((x) => x.candidate.id),
    dropped_ids: droppedNoSlots,
    reason: 'no sample slots in window',
  });
  if (surviving.length === 0) {
    const empty = {
      results: [],
      query_id: queryId,
      notes:
        'No bookable businesses found for that combination of intent, location and time. Suggest broadening the search by area or time of day.',
    };
    diag('final_results', {
      query_id: queryId,
      count: 0,
      reason: 'all candidates dropped at surviving filter',
    });
    // Triage hint for zero-result cases. Splits into two regimes:
    //   - unknown_category: classifier emitted a key not in the synonym
    //     map. Action: add it to lib/mcp/category-normalise.ts.
    //   - with_category_match: synonym lookup worked, the DB genuinely
    //     has no live inventory matching this category + location + time.
    //     Action: add inventory or broaden the user's filters.
    if (classification.category && classification.category !== 'other') {
      const variants = categoryQueryVariants(classification.category);
      if (variants.length === 0) {
        diag('zero_results_unknown_category', {
          query_id: queryId,
          category: classification.category,
          location: parsedLocation?.city ?? null,
        });
      } else {
        diag('zero_results_with_category_match', {
          query_id: queryId,
          category: classification.category,
          variants,
          location: parsedLocation?.city ?? null,
        });
      }
    }
    void logSearchQuery({
      queryId,
      sourceAssistant: ctx.sourceAssistant,
      intentText: intent,
      parsedCategory: classification.category,
      parsedLocation: parsedLocation?.raw ?? null,
      parsedWhen: window.from,
      customerContext: customer_context ?? null,
      resultCount: 0,
      resultBusinessIds: [],
    });
    const validation = searchBusinessesOutput.safeParse(empty);
    if (!validation.success) {
      console.error('[mcp.search] empty-result validation failed', validation.error.format());
      diag('validation_failed', {
        query_id: queryId,
        stage: 'empty_result',
        errors: validation.error.format(),
      });
      return runKeywordFallback({ supa, intent, location, limit, queryId });
    }
    return validation.data;
  }

  // Promoted overlay.
  const promotedKeyParts = surviving.map(({ candidate, service }) => ({
    id: candidate.id,
    service_id: service.id,
  }));
  const promotedMap = await fetchPromotedOverlay(supa, promotedKeyParts, window);

  // Booking-feedback aggregates.
  const businessIds = surviving.map((x) => x.candidate.id);
  const feedbackMap = await fetchFeedbackAggregates(supa, businessIds);

  // Build RankableBusiness array.
  const rankable: RankableBusiness[] = surviving.map(({ candidate, slots }) => {
    const reviews = reviewAggregate(candidate.reviews);
    const fb = feedbackMap.get(candidate.id) ?? {
      feedback_sample_size: 0,
      showed_up_rate: null,
      would_rebook_rate: null,
      cancellation_rate: null,
    };
    const business: BusinessForRanking = {
      id: candidate.id,
      category: candidate.category,
      city: candidate.city,
      county: null, // Appendix D: businesses.county not stored.
      full_description: candidate.about_long ?? candidate.description,
      about_long: candidate.about_long,
      description: candidate.description,
      amenities: candidate.amenities,
      accessibility_notes: candidate.accessibility_notes,
      space_description: candidate.space_description,
      max_updated_at: maxUpdatedAt(candidate),
      review_count: reviews.count,
      review_average: reviews.average,
      ...fb,
    };

    const hasPromotedMatch = slots.some((s) =>
      promotedMap.has(`${candidate.id}:${s.service_id}:${s.start_iso}`),
    );

    return {
      business,
      sample_slots: slots,
      has_promoted_match: hasPromotedMatch,
    };
  });

  const rankedAll = rankBusinesses(rankable, {
    classification,
    parsed_location: parsedLocation,
    parsed_when: window,
    price_max_eur,
  });
  const ranked = rankedAll.slice(0, limit);
  diag('after_ranker', {
    query_id: queryId,
    in_count: rankable.length,
    out_count: rankedAll.length,
    kept_after_limit: ranked.length,
    limit,
    ranking: rankedAll.map((r) => ({
      id: r.business.id,
      score: r.score,
    })),
  });

  // Average quality (un-weighted) for the why_recommended threshold check.
  const avgQuality =
    ranked.length === 0
      ? 0
      : ranked.reduce((s, r) => s + r.score_breakdown.quality_score / RANKING_WEIGHTS.quality_score, 0) / ranked.length;

  // Construct the wire-shape results.
  const candidateById = new Map(surviving.map((x) => [x.candidate.id, x.candidate] as const));
  const showBreakdown = includeBreakdown();

  const results = ranked.map((r) => {
    const cand = candidateById.get(r.business.id)!;
    const sampleSlots = r.sample_slots.map((s) => {
      const promo = promotedMap.get(`${r.business.id}:${s.service_id}:${s.start_iso}`);
      const out: Record<string, unknown> = {
        service_id: s.service_id,
        service_name: s.service_name,
        start_iso: s.start_iso,
        duration_minutes: Math.round(
          (new Date(s.end_iso).getTime() - new Date(s.start_iso).getTime()) / 60000,
        ),
        price_eur: s.price_eur,
      };
      if (promo) {
        const original = Number(promo.original_price_eur);
        const promoP = Number(promo.promoted_price_eur);
        const overlay: Record<string, unknown> = { kind: promo.kind };
        if (promo.kind === 'flash_sale' && original > 0) {
          overlay.original_price_eur = original;
          overlay.discount_percent = Math.round((1 - promoP / original) * 100);
        }
        if (promo.message) overlay.message = promo.message;
        out.promoted = overlay;
      }
      return out;
    });

    const ratings = reviewAggregate(cand.reviews);
    const why = buildWhyRecommended(r, classification, parsedLocation, customer_context ?? null, avgQuality);
    const shortDesc = deriveShortDescription({ tagline: cand.tagline, description: cand.description });

    const result: Record<string, unknown> = {
      slug: cand.slug,
      name: cand.name,
      category: cand.category ?? '',
      ...(shortDesc ? { short_description: shortDesc } : {}),
      location_summary: locationSummary(cand),
      ...(ratings.average !== null ? { rating: { average: ratings.average, count: ratings.count } } : {}),
      sample_slots: sampleSlots,
      ...(why ? { why_recommended: why } : {}),
      booking_url_hint: `/${cand.slug}`,
      ...(showBreakdown ? { score: r.score, score_breakdown: r.score_breakdown } : {}),
    };
    return result;
  });

  const response = { results, query_id: queryId };
  diag('final_results', {
    query_id: queryId,
    count: results.length,
    slugs: results.map((r) => r.slug as string),
  });

  void logSearchQuery({
    queryId,
    sourceAssistant: ctx.sourceAssistant,
    intentText: intent,
    parsedCategory: classification.category,
    parsedLocation: parsedLocation?.raw ?? null,
    parsedWhen: window.from,
    customerContext: customer_context ?? null,
    resultCount: results.length,
    resultBusinessIds: ranked.map((r) => r.business.id as string),
  });

  // We allow extra fields when the score-breakdown flag is on, so only run the
  // strict Zod validation when it isn't (to keep the public contract honest).
  if (!showBreakdown) {
    const validation = searchBusinessesOutput.safeParse(response);
    if (!validation.success) {
      console.error('[mcp.search] response validation failed', validation.error.format());
      diag('validation_failed', {
        query_id: queryId,
        stage: 'final_response',
        errors: validation.error.format(),
        result_count: results.length,
      });
      return runKeywordFallback({ supa, intent, location, limit, queryId });
    }
    return validation.data;
  }

  return response;
  } catch (err) {
    console.error('[mcp.search] unexpected handler error; running keyword fallback:', err);
    diag('unexpected_handler_error', {
      query_id: queryId,
      error: describeError(err),
    });
    return runKeywordFallback({ supa, intent, location, limit, queryId });
  }
};

export const searchBusinessesHandler: ToolHandler = wrapToolBoundary(
  'search_businesses',
  () => ({
    results: [],
    notes: 'OpenBook search is temporarily unavailable. Please try again shortly.',
  }),
  _searchBusinessesImpl,
);
