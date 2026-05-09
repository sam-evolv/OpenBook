// get_promoted_inventory — surface flash_sale and standard-promoted slots
// to assistants. Spec: docs/mcp-server-spec.md section 5.8. Column
// mappings: Appendix D.
//
// Behaviour:
//   1. Filter mcp_promoted_slots by kind (default standard+flash_sale,
//      NEVER regulars_only — see "Anonymous v1" comment below), window
//      (default [now, now+7d]), category, location.
//   2. Anti-stale check: confirm each candidate's underlying slot is
//      still bookable via get_availability_for_ai. A promoted row whose
//      slot was booked normally (without the promoted flag knowing)
//      would otherwise generate phantom availability and the next
//      hold_and_checkout would fail.
//   3. Group by business_id, sort each business's slots by start.
//   4. Rank businesses by a simplified ranker (intent + proximity +
//      quality + discount magnitude + freshness). The full ranker
//      module needs an OpenAI-classified intent which we don't run
//      here — there's no free-text intent, only an optional category.
//   5. Trim to limit (default 5, max 10). Always emit
//      disclosure_required: true so the assistant can't accidentally
//      hide the promoted/discounted nature of the slot.
//
// Performance budget: p95 < 400ms per spec section 14. The fan-out to
// get_availability_for_ai is the hot path; we cap at 50 candidates and
// batch the availability calls 5-at-a-time.

import { randomUUID } from 'node:crypto';
import {
  getPromotedInventoryInput,
  getPromotedInventoryOutput,
} from '../../../../lib/mcp/schemas';
import { supabaseAdmin } from '../../../../lib/supabase';
import { parseLocation } from '../../../../lib/mcp/parse-location';
import { parseWhen } from '../../../../lib/mcp/parse-when';
import { logSearchQuery } from '../../../../lib/mcp/logging';
import {
  categoryEquals,
  categoryQueryVariants,
} from '../../../../lib/mcp/category-normalise';
import type { ToolContext, ToolHandler } from './index';

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 10;
const CANDIDATE_FETCH_CAP = 50;
const AVAILABILITY_BATCH = 5;
const DEFAULT_WINDOW_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

type Kind = 'standard' | 'flash_sale';

type RawCandidate = {
  id: string;
  business_id: string;
  service_id: string;
  slot_start: string;
  slot_end: string;
  kind: string;
  original_price_eur: string | number;
  promoted_price_eur: string | number;
  message: string | null;
  is_active: boolean | null;
  created_at: string | null;
  businesses: {
    id: string;
    slug: string;
    name: string;
    category: string;
    city: string | null;
    primary_colour: string | null;
    is_live: boolean | null;
    rating: number | null;
    created_at: string | null;
  } | null;
  services: {
    id: string;
    name: string;
    duration_minutes: number;
    is_active: boolean | null;
  } | null;
};

const responseError = (code: string, message: string) => ({
  error: { code, message },
});

function dayKey(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Dublin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function defaultWindow(now = new Date()): { from: Date; to: Date } {
  return { from: new Date(now), to: new Date(now.getTime() + DEFAULT_WINDOW_DAYS * DAY_MS) };
}

function buildLocationSummary(city: string | null): string {
  return (city ?? '').trim();
}

// Simplified ranker — there's no free-text intent here, only an optional
// category. We compute a small weighted sum and break ties by slot freshness.
function scoreCandidate(args: {
  category: string | null;
  business_category: string;
  parsedLocationCity: string | null;
  business_city: string | null;
  rating: number | null;
  discount_pct: number;       // 0..100
  promotionAgeDays: number;
}): number {
  const intent =
    args.category && categoryEquals(args.category, args.business_category)
      ? 1.0
      : args.category
        ? 0
        : 0.5;
  const proximity =
    args.parsedLocationCity && args.business_city
      ? args.parsedLocationCity === args.business_city.toLowerCase()
        ? 1.0
        : 0.05
      : 0.5;
  const quality = args.rating !== null ? Math.max(0, Math.min(1, (args.rating - 1) / 4)) : 0.5;

  // Discount magnitude: cap contribution at 0.10 per the prompt.
  const discountBoost = Math.max(0, Math.min(0.10, (args.discount_pct / 100) * 0.10));

  // Freshness on the promoted_slots row: 0..0.05.
  const freshness =
    args.promotionAgeDays < 1
      ? 0.05
      : args.promotionAgeDays < 7
        ? 0.03
        : args.promotionAgeDays < 30
          ? 0.01
          : 0;

  // Headline weights: intent 0.4, proximity 0.3, quality 0.15, discount 0.10, freshness 0.05.
  return intent * 0.40 + proximity * 0.30 + quality * 0.15 + discountBoost + freshness;
}

export const getPromotedInventoryHandler: ToolHandler = async (input, ctx: ToolContext) => {
  const parsed = getPromotedInventoryInput.parse(input);
  const limit = Math.min(Math.max(parsed.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

  // Anonymous v1: regulars_only is customer-segmentation. Even if the
  // caller passes it (Zod's enum already rejects it but we belt-and-brace
  // here), we never query for it. This is the same posture as Section 3.6
  // — anonymous-first.
  const requestedKinds = (parsed.kinds ?? ['standard', 'flash_sale']).filter(
    (k): k is Kind => k === 'standard' || k === 'flash_sale',
  );
  const kinds = requestedKinds.length > 0 ? requestedKinds : (['standard', 'flash_sale'] as Kind[]);

  const parsedLocation = parsed.location ? parseLocation(parsed.location) : null;
  const parsedWhen = parsed.when ? parseWhen({ when: parsed.when }) : null;
  const windowFrom = parsedWhen?.from ?? defaultWindow().from;
  const windowTo = parsedWhen?.to ?? defaultWindow().to;

  const queryId = randomUUID();
  const supa = supabaseAdmin();

  let q = supa
    .from('mcp_promoted_slots')
    .select(
      `
      id, business_id, service_id, slot_start, slot_end, kind,
      original_price_eur, promoted_price_eur, message, is_active, created_at,
      businesses:business_id!inner (
        id, slug, name, category, city, primary_colour, is_live, rating, created_at
      ),
      services:service_id!inner (
        id, name, duration_minutes, is_active
      )
      `,
    )
    .eq('is_active', true)
    .gte('slot_start', windowFrom.toISOString())
    .lte('slot_start', windowTo.toISOString())
    .in('kind', kinds)
    .eq('businesses.is_live', true)
    .eq('services.is_active', true)
    .order('slot_start', { ascending: true })
    .limit(CANDIDATE_FETCH_CAP);

  if (parsed.category) {
    // The classifier emits canonical snake_case but businesses.category is
    // stored in mixed cases ("Personal Training", "personal training", etc.).
    // Expand to all plausible variants.
    const variants = categoryQueryVariants(parsed.category);
    if (variants.length > 0) {
      q = q.in('businesses.category', variants);
    }
  }
  if (parsedLocation?.city) {
    // businesses table has no `county` column (Appendix D), so location
    // filtering is city-only. Case-insensitive match via ilike.
    q = q.ilike('businesses.city', parsedLocation.city);
  }

  const { data: rows, error } = await q;
  if (error) {
    console.error('[mcp.get_promoted_inventory] candidate fetch failed', error);
    return responseError('INTERNAL_ERROR', 'Failed to fetch promoted inventory.');
  }

  // PostgREST infers nested `!inner` joins as arrays in the generated
  // types — at runtime these are single objects when the FK is a many-to-one,
  // which is the case for both businesses and services. Coerce via unknown.
  const candidates = (rows ?? []) as unknown as RawCandidate[];

  // Anti-stale check. Group candidates by (business_id, service_id, day)
  // so each get_availability_for_ai call covers all candidates that share
  // it — keeps the fan-out bounded.
  type AvailKey = string;
  const availKeys = new Map<AvailKey, { business_id: string; service_id: string; date: string }>();
  const wellFormed: RawCandidate[] = [];
  for (const c of candidates) {
    if (!c.businesses || !c.services) continue;
    // Defensive: skip rows whose slot_start can't be parsed. Better to
    // omit a stale-looking row than to crash the whole call.
    const startDate = new Date(c.slot_start);
    if (Number.isNaN(startDate.getTime())) continue;
    const date = dayKey(startDate);
    const key = `${c.business_id}::${c.service_id}::${date}`;
    if (!availKeys.has(key)) {
      availKeys.set(key, { business_id: c.business_id, service_id: c.service_id, date });
    }
    wellFormed.push(c);
  }

  const availResults = new Map<AvailKey, Set<string>>();
  const keyEntries = Array.from(availKeys.entries());
  for (let i = 0; i < keyEntries.length; i += AVAILABILITY_BATCH) {
    const slice = keyEntries.slice(i, i + AVAILABILITY_BATCH);
    await Promise.all(
      slice.map(async ([key, params]) => {
        const { data, error: rpcErr } = await supa.rpc('get_availability_for_ai', {
          p_business_id: params.business_id,
          p_service_id: params.service_id,
          p_date: params.date,
        });
        if (rpcErr) {
          console.error('[mcp.get_promoted_inventory] availability rpc failed', { key, rpcErr });
          // Treat as no-availability — anti-stale fail-CLOSED. Better to
          // omit a slot than to surface one we can't verify.
          availResults.set(key, new Set());
          return;
        }
        const slots = Array.isArray(data) ? (data as Array<{ slot_start: string }>) : [];
        const set = new Set(slots.map((s) => new Date(s.slot_start).toISOString()));
        availResults.set(key, set);
      }),
    );
  }

  const verified: RawCandidate[] = [];
  for (const c of wellFormed) {
    const date = dayKey(new Date(c.slot_start));
    const key = `${c.business_id}::${c.service_id}::${date}`;
    const available = availResults.get(key);
    if (!available) continue;
    const slotIso = new Date(c.slot_start).toISOString();
    if (available.has(slotIso)) verified.push(c);
  }

  // Group by business and rank.
  type BusinessGroup = {
    business: NonNullable<RawCandidate['businesses']>;
    slots: Array<{ candidate: RawCandidate; service: NonNullable<RawCandidate['services']> }>;
    score: number;
    bestPromotedAge: number;
  };
  const byBusiness = new Map<string, BusinessGroup>();
  const now = Date.now();

  for (const c of verified) {
    const business = c.businesses!;
    const service = c.services!;
    const original = Number(c.original_price_eur);
    const promoted = Number(c.promoted_price_eur);
    const discountPct =
      c.kind === 'flash_sale' && original > 0 ? Math.round((1 - promoted / original) * 100) : 0;

    const promotionAgeDays = c.created_at
      ? Math.max(0, (now - new Date(c.created_at).getTime()) / DAY_MS)
      : 365;
    const candidateScore = scoreCandidate({
      category: parsed.category ?? null,
      business_category: business.category,
      parsedLocationCity: parsedLocation?.city ?? null,
      business_city: business.city,
      rating: typeof business.rating === 'number' ? business.rating : null,
      discount_pct: discountPct,
      promotionAgeDays,
    });

    const existing = byBusiness.get(business.id);
    if (!existing) {
      byBusiness.set(business.id, {
        business,
        slots: [{ candidate: c, service }],
        score: candidateScore,
        bestPromotedAge: promotionAgeDays,
      });
    } else {
      existing.slots.push({ candidate: c, service });
      // Use the highest-scoring slot's score as the business score (it'll
      // typically be the deepest discount or freshest promo).
      if (candidateScore > existing.score) existing.score = candidateScore;
      if (promotionAgeDays < existing.bestPromotedAge) existing.bestPromotedAge = promotionAgeDays;
    }
  }

  const ranked = Array.from(byBusiness.values()).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Tie-break by freshness of newest promotion.
    return a.bestPromotedAge - b.bestPromotedAge;
  });
  const trimmed = ranked.slice(0, limit);

  const results = trimmed.map((g) => {
    g.slots.sort((a, b) => a.candidate.slot_start.localeCompare(b.candidate.slot_start));
    return {
      slug: g.business.slug,
      name: g.business.name,
      category: g.business.category,
      location_summary: buildLocationSummary(g.business.city),
      promoted_slots: g.slots.map(({ candidate, service }) => {
        const original = Number(candidate.original_price_eur);
        const promoted = Number(candidate.promoted_price_eur);
        const kindNarrow: Kind = candidate.kind === 'flash_sale' ? 'flash_sale' : 'standard';
        const discountPercent =
          kindNarrow === 'flash_sale' && original > 0
            ? Math.round((1 - promoted / original) * 100)
            : undefined;
        return {
          service_id: service.id,
          service_name: service.name,
          start_iso: new Date(candidate.slot_start).toISOString(),
          duration_minutes: service.duration_minutes,
          original_price_eur: original,
          promoted_price_eur: promoted,
          kind: kindNarrow,
          ...(discountPercent !== undefined ? { discount_percent: discountPercent } : {}),
          ...(candidate.message ? { message: candidate.message } : {}),
          // slots_remaining is always 1 in v1 — the anti-stale check
          // confirms exactly one bookable slot at this start. When
          // multi-capacity services land, source from the availability
          // payload's slots_remaining if present.
          slots_remaining: 1,
        };
      }),
    };
  });

  const response = {
    results,
    query_id: queryId,
    disclosure_required: true as const,
  };

  const validation = getPromotedInventoryOutput.safeParse(response);
  if (!validation.success) {
    console.error('[mcp.get_promoted_inventory] response validation failed', validation.error.format());
    return responseError('RESPONSE_VALIDATION_FAILED', 'Internal error constructing promoted inventory.');
  }

  // Fire-and-forget query log.
  void logSearchQuery({
    queryId,
    sourceAssistant: ctx.sourceAssistant ?? null,
    intentText: `promoted_inventory:${parsed.category ?? 'any'}`,
    parsedCategory: parsed.category ?? null,
    parsedLocation: parsedLocation?.raw ?? null,
    parsedWhen: parsedWhen?.from ?? null,
    customerContext: null,
    resultCount: results.length,
    resultBusinessIds: trimmed.map((g) => g.business.id),
  });

  return validation.data;
};
