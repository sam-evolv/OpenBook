// Search ranker — computes the weighted score from spec section 6 across
// candidate businesses with already-fetched availability + review data.
//
// All signals are normalised to [0, 1]. PromotedBoost is hard-capped at the
// w7 weight so a low-quality business can never buy its way to the top
// (Section 6.3).

import type { IntentClassification } from './intent-classifier';
import type { ParsedLocation } from './parse-location';
import type { ParsedWhen } from './parse-when';

export const RANKING_WEIGHTS = {
  availability_fit: 0.30,
  quality_score: 0.22,
  proximity_score: 0.18,
  intent_match_score: 0.12,
  context_fit_score: 0.08,
  recency_score: 0.05,
  promoted_boost: 0.05,
} as const;

// Conservative related-categories adjacency. Returns 0.7 IntentMatchScore;
// exact match still gets 1.0.
export const RELATED_CATEGORIES: Record<string, string[]> = {
  yoga: ['pilates'],
  pilates: ['yoga'],
  gym: ['personal_training', 'crossfit'],
  personal_training: ['gym', 'crossfit'],
  crossfit: ['gym', 'personal_training'],
  massage: ['spa', 'physio'],
  spa: ['massage', 'sauna'],
  sauna: ['spa'],
  physio: ['massage', 'chiropractor', 'osteopath'],
  chiropractor: ['physio', 'osteopath'],
  osteopath: ['physio', 'chiropractor'],
  hair: ['barber', 'beauty'],
  barber: ['hair'],
  beauty: ['hair', 'nails'],
  nails: ['beauty'],
};

// Bayesian-prior defaults for businesses with thin booking_feedback.
const PRIOR_SHOWED_UP = 0.80;
const PRIOR_WOULD_REBOOK = 0.85;
const PRIOR_CANCELLATION = 0.10;
const PRIOR_CONFIDENCE = 5;
const PRIOR_REVIEW_RATING_NORMALISED = 0.75; // 4-stars-on-5

export type BusinessForRanking = {
  id: string;
  category: string | null;
  city: string | null;
  county: string | null;
  full_description?: string | null;
  about_long?: string | null;
  description?: string | null;
  amenities?: string[] | null;
  accessibility_notes?: string | null;
  space_description?: string | null;
  // Recency signal source. Per the user's decision, we use businesses.created_at
  // as the freshness proxy until updated_at columns land.
  created_at?: string | null;
  // Review aggregates, pre-computed by the caller from the joined reviews.
  review_count: number;
  review_average: number | null;
  // Booking-feedback aggregates over the rolling 90-day window.
  feedback_sample_size: number;
  showed_up_rate: number | null;
  would_rebook_rate: number | null;
  cancellation_rate: number | null;
};

export type SlotForRanking = {
  start_iso: string;
  end_iso: string;
  // Caller-supplied fields the ranker doesn't read but preserves on output
  // so handlers don't need to maintain a parallel map.
  service_id?: string;
  service_name?: string;
  price_eur?: number;
  deposit_eur?: number;
};

export type RankableBusiness = {
  business: BusinessForRanking;
  sample_slots: SlotForRanking[];
  has_promoted_match: boolean;
};

export type RankingInput = {
  classification: IntentClassification;
  parsed_location: ParsedLocation | null;
  parsed_when: ParsedWhen | null;
  price_max_eur?: number;
};

export type ScoreBreakdown = {
  availability_fit: number;
  quality_score: number;
  proximity_score: number;
  intent_match_score: number;
  context_fit_score: number;
  recency_score: number;
  promoted_boost: number;
};

export type RankedResult = RankableBusiness & {
  score: number;
  score_breakdown: ScoreBreakdown;
};

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

function bayesianBlend(observed: number | null, prior: number, observedSample: number): number {
  if (observed === null || observedSample <= 0) return prior;
  const w = observedSample / (observedSample + PRIOR_CONFIDENCE);
  return observed * w + prior * (1 - w);
}

function availabilityFit(b: RankableBusiness): number {
  return b.sample_slots.length > 0 ? 1 : 0;
}

function qualityScore(b: BusinessForRanking): number {
  const ratingNorm =
    b.review_count > 0 && b.review_average !== null
      ? clamp01((b.review_average - 1) / 4)
      : PRIOR_REVIEW_RATING_NORMALISED;

  const reviewLog = clamp01(Math.log10(b.review_count + 1) / 2);

  const showedUp = bayesianBlend(b.showed_up_rate, PRIOR_SHOWED_UP, b.feedback_sample_size);
  const wouldRebook = bayesianBlend(b.would_rebook_rate, PRIOR_WOULD_REBOOK, b.feedback_sample_size);
  const cancellation = bayesianBlend(b.cancellation_rate, PRIOR_CANCELLATION, b.feedback_sample_size);

  const score =
    0.30 * ratingNorm +
    0.15 * reviewLog +
    0.25 * showedUp +
    0.20 * wouldRebook +
    0.10 * (1 - cancellation);

  return clamp01(score);
}

function proximityScore(b: BusinessForRanking, loc: ParsedLocation | null): number {
  if (!loc) return 0.5;
  if (!b.city && !b.county) return 0.5;

  if (loc.city && b.city && loc.city === b.city.toLowerCase()) return 0.95;
  if (loc.county && b.county && loc.county === b.county.toLowerCase()) return 0.7;
  if (loc.county && b.county && loc.county !== b.county.toLowerCase()) return 0.05;

  // We have a query county but the business has no county recorded, or vice
  // versa — treat as neutral rather than penalise.
  // TODO(geocoded-distance): when business lat/lng land, replace this whole
  // branch with an inverse-exponential decay against haversine distance.
  return 0.5;
}

function intentMatchScore(b: BusinessForRanking, c: IntentClassification): number {
  const cat = (b.category ?? '').toLowerCase();
  if (c.category === cat) return 1.0;

  const related = RELATED_CATEGORIES[c.category];
  if (related && related.includes(cat)) return 0.7;

  if (c.subcategories.length > 0) {
    const haystack = [b.full_description, b.about_long, b.description]
      .filter((s): s is string => typeof s === 'string')
      .join(' ')
      .toLowerCase();
    if (haystack && c.subcategories.some((s) => haystack.includes(s.toLowerCase()))) return 0.4;
  }

  return 0;
}

function contextFitScore(b: BusinessForRanking, c: IntentClassification): number {
  if (c.constraint_keywords.length === 0) return 0.5;

  const haystack = [
    ...(b.amenities ?? []),
    b.accessibility_notes ?? '',
    b.space_description ?? '',
  ]
    .join(' ')
    .toLowerCase();
  if (!haystack.trim()) return 0;

  const matched = c.constraint_keywords.filter((k) => haystack.includes(k.toLowerCase())).length;
  return clamp01(matched / c.constraint_keywords.length);
}

function recencyScore(b: BusinessForRanking, now: Date = new Date()): number {
  if (!b.created_at) return 0.3;
  const age = now.getTime() - new Date(b.created_at).getTime();
  const days = age / (24 * 60 * 60 * 1000);
  if (days < 30) return 1.0;
  if (days > 90) return 0.3;
  // Linear decay 30 → 90 from 1.0 → 0.3.
  return 1.0 - ((days - 30) / 60) * 0.7;
}

function promotedBoost(b: RankableBusiness): number {
  return b.has_promoted_match ? 1 : 0;
}

export function rankBusinesses(
  candidates: RankableBusiness[],
  input: RankingInput,
): RankedResult[] {
  const scored: Array<RankedResult & { _idx: number }> = candidates.map((c, idx) => {
    const bd: ScoreBreakdown = {
      availability_fit: availabilityFit(c) * RANKING_WEIGHTS.availability_fit,
      quality_score: qualityScore(c.business) * RANKING_WEIGHTS.quality_score,
      proximity_score: proximityScore(c.business, input.parsed_location) * RANKING_WEIGHTS.proximity_score,
      intent_match_score: intentMatchScore(c.business, input.classification) * RANKING_WEIGHTS.intent_match_score,
      context_fit_score: contextFitScore(c.business, input.classification) * RANKING_WEIGHTS.context_fit_score,
      recency_score: recencyScore(c.business) * RANKING_WEIGHTS.recency_score,
      promoted_boost: promotedBoost(c) * RANKING_WEIGHTS.promoted_boost,
    };
    const score =
      bd.availability_fit +
      bd.quality_score +
      bd.proximity_score +
      bd.intent_match_score +
      bd.context_fit_score +
      bd.recency_score +
      bd.promoted_boost;
    return { ...c, score, score_breakdown: bd, _idx: idx };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a._idx - b._idx;
  });

  return scored.map(({ _idx: _, ...rest }) => rest);
}
