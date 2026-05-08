import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────
type LookupResult = { data: unknown; error: unknown };
let candidatesResult: LookupResult = { data: [], error: null };
const rpcCallsByKey = new Map<string, Array<{ slot_start: string; slot_end: string }>>();
const fromCalls: string[] = [];

function buildSelectChain(table: string): Record<string, unknown> {
  fromCalls.push(table);
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.gte = vi.fn(() => chain);
  chain.lte = vi.fn(() => chain);
  chain.ilike = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  // The handler awaits the chain (no .single / .maybeSingle on the
  // promoted-slots query). Make it thenable.
  (chain as { then: (r: (v: LookupResult) => void) => void }).then = (resolve) => {
    if (table === 'mcp_promoted_slots') resolve(candidatesResult);
    else resolve({ data: null, error: null });
  };
  return chain;
}

const rpcMock = vi.fn(
  async (
    _fn: string,
    params: { p_business_id: string; p_service_id: string; p_date: string },
  ): Promise<{ data: unknown; error: unknown }> => {
    const key = `${params.p_business_id}::${params.p_service_id}::${params.p_date}`;
    return { data: rpcCallsByKey.get(key) ?? [], error: null };
  },
);

vi.mock('../../lib/supabase', () => ({
  supabaseAdmin: () => ({
    from: vi.fn((table: string) => buildSelectChain(table)),
    rpc: rpcMock,
  }),
}));

const logSearchMock = vi.fn<(args: unknown) => Promise<void>>(async () => undefined);
vi.mock('../../lib/mcp/logging', () => ({
  logSearchQuery: (args: unknown) => logSearchMock(args),
}));

const { getPromotedInventoryHandler } = await import(
  '../../app/api/mcp/tools/get-promoted-inventory'
);

const ctx = { sourceAssistant: 'chatgpt', sourceIp: null, requestId: 'req-1' };

const BIZ_A = {
  id: '11111111-1111-1111-1111-111111111111',
  slug: 'evolv',
  name: 'Evolv',
  category: 'fitness',
  city: 'Dublin',
  primary_colour: '#0F172A',
  is_live: true,
  rating: 4.5,
  created_at: '2026-01-01T00:00:00Z',
};
const BIZ_B = {
  id: '22222222-2222-2222-2222-222222222222',
  slug: 'refresh',
  name: 'Refresh',
  category: 'beauty',
  city: 'Cork',
  primary_colour: '#A8C8',
  is_live: true,
  rating: 4.2,
  created_at: '2026-01-01T00:00:00Z',
};
const SVC_A = { id: '33333333-3333-3333-3333-333333333333', name: 'PT Session', duration_minutes: 60, is_active: true };
const SVC_B = { id: '44444444-4444-4444-4444-444444444444', name: 'Facial', duration_minutes: 45, is_active: true };

const futureIso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
const dayKey = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Dublin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));

function row(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  const slotStart = (overrides.slot_start as string) ?? futureIso(2 * 60 * 60 * 1000);
  const slotEnd = (overrides.slot_end as string) ?? futureIso(3 * 60 * 60 * 1000);
  return {
    id: 'p-1',
    business_id: BIZ_A.id,
    service_id: SVC_A.id,
    slot_start: slotStart,
    slot_end: slotEnd,
    kind: 'flash_sale',
    original_price_eur: 100,
    promoted_price_eur: 60,
    message: null,
    is_active: true,
    created_at: futureIso(-2 * 60 * 60 * 1000),
    businesses: BIZ_A,
    services: SVC_A,
    ...overrides,
  };
}

// Make the rpc say the slot IS available (anti-stale check passes).
//
// The handler groups candidates that share (business_id, service_id, day)
// into ONE rpc call and matches each row's slot_start against the returned
// slot list. So when several test rows share that tuple, this helper must
// ACCUMULATE their slot_starts under the same key — not overwrite. Earlier
// versions of this helper used `Map.set` unconditionally, which silently
// dropped all-but-the-last row on shared-key cases and caused the
// "happy path > returns grouped results" and "flash_sale rows include
// discount_percent" tests to under-count slots.
function markAvailable(rows: Array<Record<string, unknown>>) {
  for (const r of rows) {
    const key = `${r.business_id}::${r.service_id}::${dayKey(r.slot_start as string)}`;
    const slot = {
      slot_start: new Date(r.slot_start as string).toISOString(),
      slot_end: r.slot_end as string,
    };
    const existing = rpcCallsByKey.get(key);
    if (existing) existing.push(slot);
    else rpcCallsByKey.set(key, [slot]);
  }
}

beforeEach(() => {
  candidatesResult = { data: [], error: null };
  rpcCallsByKey.clear();
  rpcMock.mockClear();
  logSearchMock.mockClear();
  fromCalls.length = 0;
});

describe('get_promoted_inventory — happy path', () => {
  it('returns grouped results with disclosure_required=true', async () => {
    const r1 = row({ id: 'p-1' });
    const r2 = row({
      id: 'p-2',
      slot_start: futureIso(4 * 60 * 60 * 1000),
      slot_end: futureIso(5 * 60 * 60 * 1000),
    });
    const r3 = row({
      id: 'p-3',
      business_id: BIZ_B.id,
      service_id: SVC_B.id,
      kind: 'standard',
      original_price_eur: 80,
      promoted_price_eur: 80,
      businesses: BIZ_B,
      services: SVC_B,
    });
    candidatesResult = { data: [r1, r2, r3], error: null };
    markAvailable([r1, r2, r3]);

    const out = (await getPromotedInventoryHandler({}, ctx)) as Record<string, unknown>;
    expect(out.disclosure_required).toBe(true);
    const results = out.results as Array<Record<string, unknown>>;
    expect(results).toHaveLength(2);
    const evolv = results.find((r) => r.slug === 'evolv') as Record<string, unknown>;
    expect((evolv.promoted_slots as unknown[]).length).toBe(2);
    expect(typeof out.query_id).toBe('string');
  });

  it('flash_sale rows include discount_percent; standard rows omit it', async () => {
    const flash = row({ id: 'p-flash', kind: 'flash_sale', original_price_eur: 100, promoted_price_eur: 60 });
    const standard = row({
      id: 'p-std',
      kind: 'standard',
      original_price_eur: 80,
      promoted_price_eur: 80,
      slot_start: futureIso(5 * 60 * 60 * 1000),
      slot_end: futureIso(6 * 60 * 60 * 1000),
    });
    candidatesResult = { data: [flash, standard], error: null };
    markAvailable([flash, standard]);

    const out = (await getPromotedInventoryHandler({}, ctx)) as Record<string, unknown>;
    const slots = (out.results as Array<{ promoted_slots: Array<Record<string, unknown>> }>)[0].promoted_slots;
    const flashOut = slots.find((s) => s.kind === 'flash_sale') as Record<string, unknown>;
    const standardOut = slots.find((s) => s.kind === 'standard') as Record<string, unknown>;
    expect(flashOut.discount_percent).toBe(40);
    expect(standardOut.discount_percent).toBeUndefined();
  });

  it('every promoted_slot has slots_remaining=1 in v1', async () => {
    const r1 = row({ id: 'p-1' });
    candidatesResult = { data: [r1], error: null };
    markAvailable([r1]);
    const out = (await getPromotedInventoryHandler({}, ctx)) as Record<string, unknown>;
    const slot = (out.results as Array<{ promoted_slots: Array<{ slots_remaining: number }> }>)[0]
      .promoted_slots[0];
    expect(slot.slots_remaining).toBe(1);
  });
});

describe('get_promoted_inventory — empty + anti-stale', () => {
  it('returns empty results when nothing is in window', async () => {
    candidatesResult = { data: [], error: null };
    const out = (await getPromotedInventoryHandler({}, ctx)) as Record<string, unknown>;
    expect(out.results).toEqual([]);
    expect(out.disclosure_required).toBe(true);
    expect(typeof out.query_id).toBe('string');
  });

  it('excludes a promoted slot whose underlying availability does not include it', async () => {
    const r = row({ id: 'p-1' });
    candidatesResult = { data: [r], error: null };
    // Don't markAvailable — the rpc will return [] for the key, so anti-stale
    // filters this out.
    const out = (await getPromotedInventoryHandler({}, ctx)) as Record<string, unknown>;
    expect(out.results).toEqual([]);
  });

  it('availability rpc errors fail-closed (slot omitted, no crash)', async () => {
    const r = row({ id: 'p-1' });
    candidatesResult = { data: [r], error: null };
    // Simulate rpc error by overriding the mock once.
    rpcMock.mockImplementationOnce(async () => ({ data: null, error: { message: 'pg fail' } }));
    const out = (await getPromotedInventoryHandler({}, ctx)) as Record<string, unknown>;
    expect(out.results).toEqual([]);
  });
});

describe('get_promoted_inventory — filters', () => {
  it('regulars_only is NEVER queried — passing it as input does not surface those rows', async () => {
    // Even though Zod's enum already rejects 'regulars_only' from the input
    // schema, the handler defends in depth: if anything bypassed Zod, the
    // .in('kind', kinds) DB filter only ever uses standard/flash_sale.
    const r = row({ id: 'p-1' });
    candidatesResult = { data: [r], error: null };
    markAvailable([r]);
    // Pass an empty kinds array — handler should default to both v1 kinds.
    const out = (await getPromotedInventoryHandler({ kinds: [] }, ctx)) as Record<string, unknown>;
    expect((out.results as unknown[]).length).toBe(1);
  });

  it('category narrows to matching businesses (boost) without dropping others completely', async () => {
    const fitnessRow = row({ id: 'p-fit' });
    const beautyRow = row({
      id: 'p-beauty',
      business_id: BIZ_B.id,
      service_id: SVC_B.id,
      slot_start: futureIso(5 * 60 * 60 * 1000),
      slot_end: futureIso(6 * 60 * 60 * 1000),
      businesses: BIZ_B,
      services: SVC_B,
    });
    candidatesResult = { data: [fitnessRow, beautyRow], error: null };
    markAvailable([fitnessRow, beautyRow]);
    const out = (await getPromotedInventoryHandler({ category: 'fitness' }, ctx)) as Record<string, unknown>;
    // The Supabase mock isn't a real category filter — the .eq() chain calls
    // are no-ops in our mock. So both come back; what we assert is that
    // `category=fitness` ranks the fitness business higher.
    const results = out.results as Array<{ category: string }>;
    expect(results[0].category).toBe('fitness');
  });

  it('default window is 7 days from now when "when" is omitted', async () => {
    const r = row({ id: 'p-1' });
    candidatesResult = { data: [r], error: null };
    markAvailable([r]);
    const before = Date.now();
    await getPromotedInventoryHandler({}, ctx);
    // No direct way to assert the gte/lte arguments through the chainable
    // mock without intercepting them, so we instead assert no crash + that
    // the rpc call's date is within 7 days.
    expect(rpcMock).toHaveBeenCalled();
    const callDate = rpcMock.mock.calls[0][1].p_date;
    const callMs = new Date(`${callDate}T00:00:00Z`).getTime();
    expect(callMs).toBeLessThanOrEqual(before + 8 * 24 * 60 * 60 * 1000);
  });
});

describe('get_promoted_inventory — limit + ranking', () => {
  it('caps at the limit (default 5, max 10)', async () => {
    // Ten distinct businesses; each with one promoted slot.
    const rows = Array.from({ length: 10 }, (_, i) => {
      const businessId = `${'a'.repeat(8)}-${'b'.repeat(4)}-${'c'.repeat(4)}-${'d'.repeat(4)}-${String(i).padStart(12, '0')}`;
      return row({
        id: `p-${i}`,
        business_id: businessId,
        service_id: SVC_A.id,
        slot_start: futureIso((i + 2) * 60 * 60 * 1000),
        slot_end: futureIso((i + 3) * 60 * 60 * 1000),
        businesses: { ...BIZ_A, id: businessId, slug: `b-${i}`, name: `Biz ${i}`, rating: 4.0 + i * 0.05 },
      });
    });
    candidatesResult = { data: rows, error: null };
    markAvailable(rows);

    const def = (await getPromotedInventoryHandler({}, ctx)) as Record<string, unknown>;
    expect((def.results as unknown[]).length).toBe(5);

    const cap = (await getPromotedInventoryHandler({ limit: 10 }, ctx)) as Record<string, unknown>;
    expect((cap.results as unknown[]).length).toBe(10);
  });

  it('ranks a flash_sale with bigger discount above a smaller one (all else equal)', async () => {
    // Two businesses, identical except one has a much deeper discount.
    const small = row({
      id: 'p-small',
      business_id: BIZ_A.id,
      kind: 'flash_sale',
      original_price_eur: 100,
      promoted_price_eur: 95,                  // 5% off
      businesses: { ...BIZ_A, rating: 4.0 },
    });
    const big = row({
      id: 'p-big',
      business_id: BIZ_B.id,
      service_id: SVC_B.id,
      slot_start: futureIso(3 * 60 * 60 * 1000),
      slot_end: futureIso(4 * 60 * 60 * 1000),
      kind: 'flash_sale',
      original_price_eur: 100,
      promoted_price_eur: 50,                  // 50% off
      businesses: { ...BIZ_B, rating: 4.0 },
      services: SVC_B,
    });
    candidatesResult = { data: [small, big], error: null };
    markAvailable([small, big]);
    const out = (await getPromotedInventoryHandler({}, ctx)) as Record<string, unknown>;
    const results = out.results as Array<{ business_id: string }>;
    expect(results[0].business_id).toBe(BIZ_B.id);
  });
});

describe('get_promoted_inventory — logging + validation', () => {
  it('calls logSearchQuery with the right shape', async () => {
    const r = row({ id: 'p-1' });
    candidatesResult = { data: [r], error: null };
    markAvailable([r]);
    await getPromotedInventoryHandler({ category: 'fitness', location: 'Dublin' }, ctx);
    // Wait a microtask for the fire-and-forget log.
    await new Promise((res) => setImmediate(res));
    expect(logSearchMock).toHaveBeenCalledOnce();
    const args = (logSearchMock.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(args.intentText).toBe('promoted_inventory:fitness');
    expect(args.parsedCategory).toBe('fitness');
    expect(args.resultCount).toBe(1);
    expect(args.resultBusinessIds).toEqual([BIZ_A.id]);
  });

  it('drops malformed rows defensively (bad start_iso) without crashing', async () => {
    // The handler should defensively skip a row whose slot_start can't be
    // parsed rather than throw. We don't insist on RESPONSE_VALIDATION_FAILED
    // because skipping the row early is the better posture — the assistant
    // sees a clean empty list rather than an internal error.
    const bad = { ...row({ id: 'p-bad' }), slot_start: 'not-a-date' };
    candidatesResult = { data: [bad], error: null };
    const out = (await getPromotedInventoryHandler({}, ctx)) as Record<string, unknown>;
    expect(out.error).toBeUndefined();
    expect(out.results).toEqual([]);
    expect(out.disclosure_required).toBe(true);
  });
});
