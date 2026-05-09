import { describe, expect, it } from 'vitest';
import {
  rankBusinesses,
  RANKING_WEIGHTS,
  type BusinessForRanking,
  type RankableBusiness,
} from '../../lib/mcp/ranker';
import type { IntentClassification } from '../../lib/mcp/intent-classifier';
import type { ParsedLocation } from '../../lib/mcp/parse-location';

const baseClassification: IntentClassification = {
  category: 'personal_training',
  subcategories: [],
  vibe: [],
  price_tier: null,
  duration_preference_minutes: null,
  constraint_keywords: [],
  confidence: 0.9,
};

const baseLocation: ParsedLocation = {
  raw: 'Dublin',
  city: 'dublin',
  county: 'dublin',
  neighbourhood: null,
};

const baseBusiness = (overrides: Partial<BusinessForRanking> = {}): BusinessForRanking => ({
  id: overrides.id ?? '11111111-1111-1111-1111-111111111111',
  category: 'personal_training',
  city: 'dublin',
  county: 'dublin',
  full_description: '',
  about_long: null,
  description: null,
  amenities: null,
  accessibility_notes: null,
  space_description: null,
  // Section 6.2 RecencyScore source. 10 days back keeps fixtures inside
  // the day-30 plateau so unrelated tests aren't perturbed.
  max_updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  review_count: 0,
  review_average: null,
  feedback_sample_size: 0,
  showed_up_rate: null,
  would_rebook_rate: null,
  cancellation_rate: null,
  ...overrides,
});

const candidate = (b: BusinessForRanking, hasPromoted = false, slotCount = 1): RankableBusiness => ({
  business: b,
  sample_slots: Array.from({ length: slotCount }, (_, i) => ({
    start_iso: `2026-05-08T${String(8 + i).padStart(2, '0')}:00:00.000Z`,
    end_iso: `2026-05-08T${String(9 + i).padStart(2, '0')}:00:00.000Z`,
  })),
  has_promoted_match: hasPromoted,
});

const inputBase = {
  classification: baseClassification,
  parsed_location: baseLocation,
  parsed_when: { from: new Date('2026-05-08T00:00:00Z'), to: new Date('2026-05-08T23:59:59Z') },
};

describe('rankBusinesses', () => {
  it('preserves insertion order on ties', () => {
    const a = candidate(baseBusiness({ id: 'a' }));
    const b = candidate(baseBusiness({ id: 'b' }));
    const c = candidate(baseBusiness({ id: 'c' }));
    const out = rankBusinesses([a, b, c], inputBase);
    expect(out[0].business.id).toBe('a');
    expect(out[1].business.id).toBe('b');
    expect(out[2].business.id).toBe('c');
  });

  it('puts a perfect match above a partial match', () => {
    const perfect = candidate(
      baseBusiness({
        id: 'perfect',
        category: 'personal_training',
        city: 'dublin',
        county: 'dublin',
      }),
    );
    const partial = candidate(
      baseBusiness({
        id: 'partial',
        category: 'gym',
        city: 'cork',
        county: 'cork',
      }),
    );
    const out = rankBusinesses([partial, perfect], inputBase);
    expect(out[0].business.id).toBe('perfect');
  });

  it('caps PromotedBoost so a low-quality promoted business cannot outrank a high-quality non-promoted one', () => {
    const high = candidate(
      baseBusiness({
        id: 'high',
        review_count: 50,
        review_average: 4.8,
        feedback_sample_size: 30,
        showed_up_rate: 0.95,
        would_rebook_rate: 0.95,
        cancellation_rate: 0.02,
      }),
      false,
    );
    const low = candidate(
      baseBusiness({
        id: 'low',
        review_count: 1,
        review_average: 2.0,
        feedback_sample_size: 30,
        showed_up_rate: 0.5,
        would_rebook_rate: 0.4,
        cancellation_rate: 0.3,
      }),
      true,
    );
    const out = rankBusinesses([low, high], inputBase);
    expect(out[0].business.id).toBe('high');
  });

  it('ranks a 0-review business below a heavily-reviewed 4.8 business (Bayesian prior)', () => {
    const heavy = candidate(
      baseBusiness({ id: 'heavy', review_count: 50, review_average: 4.8 }),
    );
    const fresh = candidate(baseBusiness({ id: 'fresh', review_count: 0 }));
    const out = rankBusinesses([fresh, heavy], inputBase);
    expect(out[0].business.id).toBe('heavy');
  });

  it('prefers a recently-updated business when other signals are equal', () => {
    const recent = candidate(
      baseBusiness({ id: 'recent', max_updated_at: new Date(Date.now() - 5 * 86400000).toISOString() }),
    );
    const stale = candidate(
      baseBusiness({ id: 'stale', max_updated_at: new Date(Date.now() - 200 * 86400000).toISOString() }),
    );
    const out = rankBusinesses([stale, recent], inputBase);
    expect(out[0].business.id).toBe('recent');
  });

  it('RecencyScore plateau: a business updated 5 days ago and one updated 25 days ago tie on recency', () => {
    // Both inside the day-30 plateau (1.0). Other signals identical → score
    // identical → insertion order preserved.
    const fiveDays = candidate(
      baseBusiness({ id: 'five', max_updated_at: new Date(Date.now() - 5 * 86400000).toISOString() }),
    );
    const twentyFive = candidate(
      baseBusiness({ id: 'twentyfive', max_updated_at: new Date(Date.now() - 25 * 86400000).toISOString() }),
    );
    const out = rankBusinesses([fiveDays, twentyFive], inputBase);
    expect(out[0].score_breakdown.recency_score).toBeCloseTo(out[1].score_breakdown.recency_score, 10);
  });

  it('RecencyScore decays linearly between day 30 and day 90 (~0.65 at day 60)', () => {
    // Score breakdown is recency_raw × w6 (0.05). Day 60 should map to
    // ~0.65 raw → ~0.0325 weighted.
    const day60 = candidate(
      baseBusiness({ id: 'day60', max_updated_at: new Date(Date.now() - 60 * 86400000).toISOString() }),
    );
    const out = rankBusinesses([day60], inputBase);
    const weighted = out[0].score_breakdown.recency_score;
    const raw = weighted / 0.05;
    expect(raw).toBeGreaterThan(0.62);
    expect(raw).toBeLessThan(0.68);
  });

  it('RecencyScore floors at 0.3 for businesses untouched > 90 days', () => {
    const ancient = candidate(
      baseBusiness({ id: 'ancient', max_updated_at: new Date(Date.now() - 365 * 86400000).toISOString() }),
    );
    const out = rankBusinesses([ancient], inputBase);
    const raw = out[0].score_breakdown.recency_score / 0.05;
    expect(raw).toBeCloseTo(0.3, 5);
  });

  it('RecencyScore falls to the 0.3 floor when no max_updated_at is provided', () => {
    const unknown = candidate(baseBusiness({ id: 'unknown', max_updated_at: null }));
    const out = rankBusinesses([unknown], inputBase);
    const raw = out[0].score_breakdown.recency_score / 0.05;
    expect(raw).toBeCloseTo(0.3, 5);
  });

  it('score equals the sum of its breakdown components', () => {
    const c = candidate(baseBusiness({ id: 'sum' }));
    const out = rankBusinesses([c], inputBase);
    const r = out[0];
    const sum =
      r.score_breakdown.availability_fit +
      r.score_breakdown.quality_score +
      r.score_breakdown.proximity_score +
      r.score_breakdown.intent_match_score +
      r.score_breakdown.context_fit_score +
      r.score_breakdown.recency_score +
      r.score_breakdown.promoted_boost;
    expect(r.score).toBeCloseTo(sum, 10);
  });

  it('ContextFitScore: matching constraint_keywords against amenities boosts score; no constraints → neutral 0.5', () => {
    const withConstraints = {
      ...baseClassification,
      constraint_keywords: ['injury_friendly'],
    };
    const matchAmenity = candidate(
      baseBusiness({ id: 'match', amenities: ['injury_friendly programmes'] }),
    );
    const noAmenity = candidate(baseBusiness({ id: 'nope', amenities: [] }));
    const out = rankBusinesses([matchAmenity, noAmenity], {
      ...inputBase,
      classification: withConstraints,
    });
    const matchScore = out.find((r) => r.business.id === 'match')!.score_breakdown.context_fit_score;
    const noneScore = out.find((r) => r.business.id === 'nope')!.score_breakdown.context_fit_score;
    expect(matchScore).toBeGreaterThan(noneScore);

    // Empty constraints → neutral 0.5 contribution.
    const empty = rankBusinesses([candidate(baseBusiness({ id: 'x' }))], inputBase);
    expect(empty[0].score_breakdown.context_fit_score).toBeCloseTo(0.5 * RANKING_WEIGHTS.context_fit_score);
  });

  it('intentMatchScore matches across category casing variants', () => {
    // Production data stores categories as "Personal Training" while the
    // classifier emits "personal_training". The ranker must treat them as
    // an exact match (1.0 * weight), not a miss.
    const titleCase = candidate(baseBusiness({ id: 't', category: 'Personal Training' }));
    const lowercaseSpaced = candidate(baseBusiness({ id: 'l', category: 'personal training' }));
    const snakeCase = candidate(baseBusiness({ id: 's', category: 'personal_training' }));
    const out = rankBusinesses([titleCase, lowercaseSpaced, snakeCase], inputBase);
    const exactWeight = RANKING_WEIGHTS.intent_match_score;
    for (const r of out) {
      expect(r.score_breakdown.intent_match_score).toBeCloseTo(exactWeight);
    }
  });
});
