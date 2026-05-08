import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IntentClassification } from '../../lib/mcp/intent-classifier';

// Per-test handles.
type LookupResult = { data: unknown; error: unknown };
let businessesResult: LookupResult = { data: [], error: null };
let promotedResult: LookupResult = { data: [], error: null };
let feedbackResult: LookupResult = { data: [], error: null };
let bookingsAggResult: LookupResult = { data: [], error: null };
let queryLogInsertResult: LookupResult = { data: null, error: null };
const candidateQueryFilters: Array<Record<string, unknown>> = [];
let rpcResultsByDate: Map<string, LookupResult> = new Map();
let rpcDefault: LookupResult = { data: [], error: null };
const setRpcForDate = (d: string, data: unknown, error: unknown = null) =>
  rpcResultsByDate.set(d, { data, error });

const classifyMock = vi.fn();
vi.mock('../../lib/mcp/intent-classifier', async () => {
  const real = await vi.importActual<typeof import('../../lib/mcp/intent-classifier')>(
    '../../lib/mcp/intent-classifier',
  );
  return { ...real, classifyIntent: (args: unknown) => classifyMock(args) };
});

const logSearchMock = vi.fn(async (_arg: unknown) => undefined);
vi.mock('../../lib/mcp/logging', () => ({
  logSearchQuery: (arg: unknown) => logSearchMock(arg),
  logToolCall: vi.fn(async () => undefined),
}));

function buildFromChain(table: string): Record<string, unknown> {
  const chain: Record<string, unknown> = {};
  const filters: Record<string, unknown> = {};
  candidateQueryFilters.push(filters);

  const passthrough = (key: string) => (...args: unknown[]) => {
    if (table === 'businesses') filters[`${key}:${String(args[0])}`] = args[1];
    return chain;
  };
  chain.select = vi.fn(passthrough('select'));
  chain.eq = vi.fn(passthrough('eq'));
  chain.in = vi.fn(passthrough('in'));
  chain.gte = vi.fn(passthrough('gte'));
  chain.lte = vi.fn(passthrough('lte'));
  chain.limit = vi.fn(passthrough('limit'));

  // Each table's chain resolves via `await` to a different fixture.
  const terminal = (() => {
    if (table === 'businesses') return () => businessesResult;
    if (table === 'mcp_promoted_slots') return () => promotedResult;
    if (table === 'booking_feedback') return () => feedbackResult;
    if (table === 'bookings') return () => bookingsAggResult;
    if (table === 'mcp_query_log') return () => queryLogInsertResult;
    return () => ({ data: [], error: null });
  })();
  chain.then = (resolve: (v: LookupResult) => unknown) =>
    Promise.resolve(terminal()).then(resolve);
  chain.insert = vi.fn(async () => queryLogInsertResult);
  return chain;
}

vi.mock('../../lib/supabase', () => ({
  supabaseAdmin: () => ({
    from: vi.fn((table: string) => buildFromChain(table)),
    rpc: vi.fn(async (_fn: string, params: Record<string, unknown>) => {
      const d = params.p_date as string;
      return rpcResultsByDate.get(d) ?? rpcDefault;
    }),
  }),
}));

const { searchBusinessesHandler } = await import('../../app/api/mcp/tools/search-businesses');

const ctx = { sourceAssistant: 'chatgpt', sourceIp: null, requestId: 'req' };

const PT_CLASSIFICATION: IntentClassification = {
  category: 'personal_training',
  subcategories: [],
  vibe: [],
  price_tier: null,
  duration_preference_minutes: null,
  constraint_keywords: [],
  confidence: 0.9,
};

const FALLBACK_CLASSIFICATION: IntentClassification = {
  category: 'other',
  subcategories: [],
  vibe: [],
  price_tier: null,
  duration_preference_minutes: null,
  constraint_keywords: [],
  confidence: 0,
};

let _idCounter = 0;
const uuid = (suffix: string) => {
  _idCounter += 1;
  // Deterministic, valid v4-shaped UUIDs.
  const hex = String(_idCounter).padStart(12, '0');
  return `${suffix.padStart(8, '0').slice(0, 8)}-0000-4000-8000-${hex}`;
};

const candidateFixture = (overrides: Record<string, unknown> = {}) => ({
  id: uuid('aaaa'),
  slug: 'evolv',
  name: 'Evolv',
  category: 'personal_training',
  description: 'A great gym in Dublin.',
  about_long: null,
  tagline: 'Strength training for grown-ups',
  city: 'dublin',
  amenities: null,
  accessibility_notes: null,
  space_description: null,
  created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  // Section 6.2 RecencyScore source. 10 days back → day-30 plateau → 1.0,
  // so unrelated tests aren't perturbed by recency variation.
  updated_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  services: [
    {
      id: uuid('bbbb'),
      name: 'PT',
      duration_minutes: 60,
      price_cents: 6000,
      sort_order: 0,
      is_active: true,
      updated_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
  ],
  business_hours: [
    { updated_at: new Date(Date.now() - 10 * 86400000).toISOString() },
  ],
  reviews: [],
  ...overrides,
});

beforeEach(() => {
  businessesResult = { data: [], error: null };
  promotedResult = { data: [], error: null };
  feedbackResult = { data: [], error: null };
  bookingsAggResult = { data: [], error: null };
  queryLogInsertResult = { data: null, error: null };
  rpcResultsByDate = new Map();
  rpcDefault = { data: [], error: null };
  candidateQueryFilters.length = 0;
  classifyMock.mockReset();
  classifyMock.mockResolvedValue(PT_CLASSIFICATION);
  logSearchMock.mockReset();
  logSearchMock.mockResolvedValue(undefined);
  delete process.env.MCP_INCLUDE_SCORE_BREAKDOWN;
});

afterEach(() => {
  delete process.env.MCP_INCLUDE_SCORE_BREAKDOWN;
});

const futureDate = (offsetHours: number) => {
  const d = new Date(Date.now() + offsetHours * 3600 * 1000);
  return d.toISOString();
};

describe('searchBusinessesHandler', () => {
  it('happy path: returns results sorted with sample slots', async () => {
    businessesResult = {
      data: [
        candidateFixture({ id: uuid('aa1'), slug: 'a', name: 'A' }),
        candidateFixture({ id: uuid('aa2'), slug: 'b', name: 'B' }),
      ],
      error: null,
    };
    rpcDefault = {
      data: [{ slot_start: futureDate(2), slot_end: futureDate(3) }],
      error: null,
    };

    const out = (await searchBusinessesHandler(
      { intent: 'personal trainer in Dublin', location: 'Dublin' },
      ctx,
    )) as { results: Array<{ name: string; sample_slots: unknown[] }> };

    expect(out.results.length).toBe(2);
    expect(out.results[0].sample_slots.length).toBeGreaterThan(0);
  });

  it('empty results: notes describes broadening', async () => {
    businessesResult = {
      data: [candidateFixture({ id: 'a', services: [] })],
      error: null,
    };
    const out = (await searchBusinessesHandler({ intent: 'pt' }, ctx)) as {
      results: unknown[];
      notes?: string;
    };
    expect(out.results).toEqual([]);
    expect(out.notes).toMatch(/broadening/i);
  });

  it('price_max_eur excludes candidates with no qualifying service', async () => {
    const cheapId = uuid('cccc');
    const priceyId = uuid('dddd');
    businessesResult = {
      data: [
        candidateFixture({
          id: cheapId,
          services: [{ id: uuid('ccc1'), name: 'cheap', duration_minutes: 60, price_cents: 4000, is_active: true, sort_order: 0 }],
        }),
        candidateFixture({
          id: priceyId,
          services: [{ id: uuid('ddd1'), name: 'pricey', duration_minutes: 60, price_cents: 9000, is_active: true, sort_order: 0 }],
        }),
      ],
      error: null,
    };
    rpcDefault = { data: [{ slot_start: futureDate(2), slot_end: futureDate(3) }], error: null };

    const out = (await searchBusinessesHandler(
      { intent: 'pt', price_max_eur: 50 },
      ctx,
    )) as { results: Array<{ business_id: string }> };

    expect(out.results.map((r) => r.business_id)).toEqual([cheapId]);
  });

  it('promoted overlay: matching slot gets discount_percent', async () => {
    process.env.MCP_INCLUDE_SCORE_BREAKDOWN = 'true';
    const slotStart = futureDate(2);
    const bizId = uuid('eeee');
    const svcId = uuid('eee1');
    businessesResult = {
      data: [
        candidateFixture({
          id: bizId,
          services: [{ id: svcId, name: 'PT', duration_minutes: 60, price_cents: 6000, sort_order: 0, is_active: true }],
        }),
      ],
      error: null,
    };
    rpcDefault = {
      data: [{ slot_start: slotStart, slot_end: futureDate(3) }],
      error: null,
    };
    promotedResult = {
      data: [
        {
          business_id: bizId,
          service_id: svcId,
          slot_start: slotStart,
          kind: 'flash_sale',
          original_price_eur: 60,
          promoted_price_eur: 45,
          message: '25% off',
        },
      ],
      error: null,
    };

    const out = (await searchBusinessesHandler({ intent: 'pt' }, ctx)) as {
      results: Array<{ sample_slots: Array<{ promoted?: { discount_percent?: number; kind?: string } }>; score_breakdown?: { promoted_boost: number } }>;
    };
    const first = out.results[0];
    expect(first.sample_slots[0].promoted?.kind).toBe('flash_sale');
    expect(first.sample_slots[0].promoted?.discount_percent).toBe(25);
    expect(first.score_breakdown?.promoted_boost).toBeGreaterThan(0);
  });

  it('why_recommended: humanises constraint match against amenities', async () => {
    classifyMock.mockResolvedValue({
      ...PT_CLASSIFICATION,
      constraint_keywords: ['injury_friendly'],
    });
    businessesResult = {
      data: [candidateFixture({ amenities: ['injury_friendly programmes'] })],
      error: null,
    };
    rpcDefault = {
      data: [{ slot_start: futureDate(2), slot_end: futureDate(3) }],
      error: null,
    };
    const out = (await searchBusinessesHandler(
      {
        intent: 'pt',
        customer_context: { constraints: ['recovering hamstring'] },
      },
      ctx,
    )) as { results: Array<{ why_recommended?: string }> };
    expect(out.results[0].why_recommended).toMatch(/injury-aware/i);
  });

  it('why_recommended: omitted when no customer_context provided', async () => {
    businessesResult = { data: [candidateFixture({})], error: null };
    rpcDefault = { data: [{ slot_start: futureDate(2), slot_end: futureDate(3) }], error: null };
    const out = (await searchBusinessesHandler({ intent: 'pt' }, ctx)) as {
      results: Array<{ why_recommended?: string }>;
    };
    expect(out.results[0].why_recommended).toBeUndefined();
  });

  it('score_breakdown: hidden by default; surfaced under flag', async () => {
    businessesResult = { data: [candidateFixture({})], error: null };
    rpcDefault = { data: [{ slot_start: futureDate(2), slot_end: futureDate(3) }], error: null };

    const off = (await searchBusinessesHandler({ intent: 'pt' }, ctx)) as {
      results: Array<{ score_breakdown?: unknown }>;
    };
    expect(off.results[0].score_breakdown).toBeUndefined();

    process.env.MCP_INCLUDE_SCORE_BREAKDOWN = 'true';
    const on = (await searchBusinessesHandler({ intent: 'pt' }, ctx)) as {
      results: Array<{ score_breakdown?: unknown }>;
    };
    expect(on.results[0].score_breakdown).toBeDefined();
  });

  it('logSearchQuery is called once per request with the right shape', async () => {
    businessesResult = { data: [candidateFixture({})], error: null };
    rpcDefault = { data: [{ slot_start: futureDate(2), slot_end: futureDate(3) }], error: null };
    await searchBusinessesHandler({ intent: 'pt' }, ctx);
    await new Promise((r) => setTimeout(r, 0));
    expect(logSearchMock).toHaveBeenCalledTimes(1);
    const arg = (logSearchMock.mock.calls[0] as unknown as [{ queryId: string; intentText: string }])[0];
    expect(arg.intentText).toBe('pt');
    expect(typeof arg.queryId).toBe('string');
  });

  it('classifier fallback (other/0): does not filter on category', async () => {
    classifyMock.mockResolvedValue(FALLBACK_CLASSIFICATION);
    businessesResult = { data: [candidateFixture({})], error: null };
    rpcDefault = { data: [{ slot_start: futureDate(2), slot_end: futureDate(3) }], error: null };
    await searchBusinessesHandler({ intent: 'something' }, ctx);
    // The first .from('businesses') call is the candidate query; verify
    // .in('category', ...) was NOT called by inspecting the recorded filter map.
    const businessesFilters = candidateQueryFilters[0];
    const hasCategoryIn = Object.keys(businessesFilters).some(
      (k) => k.startsWith('in:') && businessesFilters[k] !== undefined && k.toLowerCase().includes('category'),
    );
    expect(hasCategoryIn).toBe(false);
  });
});
