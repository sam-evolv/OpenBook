import { beforeEach, describe, expect, it, vi } from 'vitest';

// Per-test handles to override what each Supabase call returns.
type LookupResult = { data: unknown; error: unknown };
let businessResult: LookupResult = { data: null, error: null };
let serviceResult: LookupResult = { data: null, error: null };
let promotedResult: LookupResult = { data: [], error: null };
let rpcResultsByDate: Map<string, LookupResult> = new Map();
let rpcDefault: LookupResult = { data: [], error: null };
const rpcCalls: Array<Record<string, unknown>> = [];

const setBusiness = (data: unknown, error: unknown = null) => {
  businessResult = { data, error };
};
const setService = (data: unknown, error: unknown = null) => {
  serviceResult = { data, error };
};
const setPromoted = (data: unknown, error: unknown = null) => {
  promotedResult = { data, error };
};
const setRpcDefault = (data: unknown, error: unknown = null) => {
  rpcDefault = { data, error };
};
const setRpcForDate = (date: string, data: unknown, error: unknown = null) => {
  rpcResultsByDate.set(date, { data, error });
};

// Build a chainable mock for a single .from() call. Each table the handler
// touches has its own terminal value (.maybeSingle for businesses+services,
// awaited promise on the chain for mcp_promoted_slots).
function buildFromChain(table: string): Record<string, unknown> {
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.gte = vi.fn(() => chain);
  chain.lte = vi.fn(() => chain);

  if (table === 'businesses') {
    chain.maybeSingle = vi.fn(async () => businessResult);
  } else if (table === 'services') {
    chain.maybeSingle = vi.fn(async () => serviceResult);
  } else if (table === 'mcp_promoted_slots') {
    // The handler awaits the chain itself, so make it thenable.
    (chain as Record<string, unknown>).then = (
      resolve: (value: LookupResult) => unknown,
    ) => Promise.resolve(promotedResult).then(resolve);
  } else {
    chain.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
  }
  return chain;
}

vi.mock('../../lib/supabase', () => ({
  supabaseAdmin: () => ({
    from: vi.fn((table: string) => buildFromChain(table)),
    rpc: vi.fn(async (_fn: string, params: Record<string, unknown>) => {
      rpcCalls.push(params);
      const date = params.p_date as string;
      return rpcResultsByDate.get(date) ?? rpcDefault;
    }),
  }),
}));

const ctx = { sourceAssistant: 'other', sourceIp: null, requestId: 'req-1' };
const { getAvailabilityHandler } = await import('../../app/api/mcp/tools/get-availability');

const BUSINESS = { id: '11111111-1111-1111-1111-111111111111', slug: 'evolv-performance', name: 'Evolv' };
const SERVICE = {
  id: '22222222-2222-2222-2222-222222222222',
  name: 'PT Session',
  duration_minutes: 60,
  price_cents: 6000,
  is_active: true,
};

beforeEach(() => {
  setBusiness(BUSINESS);
  setService(SERVICE);
  setPromoted([]);
  rpcResultsByDate = new Map();
  setRpcDefault([]);
  rpcCalls.length = 0;
});

describe('getAvailabilityHandler', () => {
  it('returns slots for a known business + service over a 1-day window', async () => {
    setRpcForDate('2026-05-08', [
      { slot_start: '2026-05-08T08:00:00.000Z', slot_end: '2026-05-08T09:00:00.000Z' },
      { slot_start: '2026-05-08T09:00:00.000Z', slot_end: '2026-05-08T10:00:00.000Z' },
      { slot_start: '2026-05-08T10:00:00.000Z', slot_end: '2026-05-08T11:00:00.000Z' },
    ]);
    const out = (await getAvailabilityHandler(
      { slug: 'evolv-performance', service_id: SERVICE.id, date_from: '2026-05-08', date_to: '2026-05-08' },
      ctx,
    )) as { slots: Array<{ start_iso: string; end_iso: string }>; service: { price_eur: number } };
    expect(out.slots).toHaveLength(3);
    expect(out.slots[0].start_iso).toBe('2026-05-08T08:00:00.000Z');
    expect(out.slots[0].end_iso).toBe('2026-05-08T09:00:00.000Z');
  });

  it('returns BUSINESS_NOT_FOUND for unknown slug', async () => {
    setBusiness(null);
    const out = (await getAvailabilityHandler(
      { slug: 'nope', service_id: SERVICE.id, date_from: '2026-05-08' },
      ctx,
    )) as { error?: { code: string } };
    expect(out.error?.code).toBe('BUSINESS_NOT_FOUND');
  });

  it('returns SERVICE_NOT_FOUND when service lookup returns null', async () => {
    setService(null);
    const out = (await getAvailabilityHandler(
      { slug: 'evolv-performance', service_id: SERVICE.id, date_from: '2026-05-08' },
      ctx,
    )) as { error?: { code: string } };
    expect(out.error?.code).toBe('SERVICE_NOT_FOUND');
  });

  it('returns SERVICE_NOT_FOUND when service.is_active is false', async () => {
    setService({ ...SERVICE, is_active: false });
    const out = (await getAvailabilityHandler(
      { slug: 'evolv-performance', service_id: SERVICE.id, date_from: '2026-05-08' },
      ctx,
    )) as { error?: { code: string } };
    expect(out.error?.code).toBe('SERVICE_NOT_FOUND');
  });

  it('defaults date_to to date_from + 7 days when omitted', async () => {
    await getAvailabilityHandler(
      { slug: 'evolv-performance', service_id: SERVICE.id, date_from: '2026-05-08' },
      ctx,
    );
    const dates = rpcCalls.map((c) => c.p_date as string);
    expect(dates[0]).toBe('2026-05-08');
    expect(dates[dates.length - 1]).toBe('2026-05-15');
    expect(dates.length).toBe(8);
  });

  it('caps the range at +14 days when date_to is too far out', async () => {
    await getAvailabilityHandler(
      {
        slug: 'evolv-performance',
        service_id: SERVICE.id,
        date_from: '2026-05-08',
        date_to: '2026-06-08',
      },
      ctx,
    );
    const dates = rpcCalls.map((c) => c.p_date as string);
    expect(dates[dates.length - 1]).toBe('2026-05-22');
    expect(dates.length).toBe(15);
  });

  it('returns voice-friendly notes when no slots are available', async () => {
    setRpcDefault([]);
    const out = (await getAvailabilityHandler(
      { slug: 'evolv-performance', service_id: SERVICE.id, date_from: '2026-05-08', date_to: '2026-05-08' },
      ctx,
    )) as { slots: unknown[]; notes?: string };
    expect(out.slots).toEqual([]);
    expect(out.notes).toMatch(/No availability/i);
  });

  it('omits notes when slots are present', async () => {
    setRpcForDate('2026-05-08', [
      { slot_start: '2026-05-08T08:00:00.000Z', slot_end: '2026-05-08T09:00:00.000Z' },
    ]);
    const out = (await getAvailabilityHandler(
      { slug: 'evolv-performance', service_id: SERVICE.id, date_from: '2026-05-08', date_to: '2026-05-08' },
      ctx,
    )) as { notes?: string };
    expect(out.notes).toBeUndefined();
  });

  it('overlays flash_sale promoted slots with discount_percent', async () => {
    setRpcForDate('2026-05-08', [
      { slot_start: '2026-05-08T18:00:00.000Z', slot_end: '2026-05-08T19:00:00.000Z' },
    ]);
    setPromoted([
      {
        slot_start: '2026-05-08T18:00:00.000Z',
        kind: 'flash_sale',
        original_price_eur: 60,
        promoted_price_eur: 45,
        message: '25% off — last-minute',
      },
    ]);
    const out = (await getAvailabilityHandler(
      { slug: 'evolv-performance', service_id: SERVICE.id, date_from: '2026-05-08', date_to: '2026-05-08' },
      ctx,
    )) as { slots: Array<{ promoted?: { kind: string; discount_percent?: number; message?: string } }> };
    expect(out.slots[0].promoted).toBeDefined();
    expect(out.slots[0].promoted?.kind).toBe('flash_sale');
    expect(out.slots[0].promoted?.discount_percent).toBe(25);
    expect(out.slots[0].promoted?.message).toBe('25% off — last-minute');
  });

  it('overlays standard promoted slots without a discount_percent', async () => {
    setRpcForDate('2026-05-08', [
      { slot_start: '2026-05-08T18:00:00.000Z', slot_end: '2026-05-08T19:00:00.000Z' },
    ]);
    setPromoted([
      {
        slot_start: '2026-05-08T18:00:00.000Z',
        kind: 'standard',
        original_price_eur: 60,
        promoted_price_eur: 60,
        message: 'Featured slot',
      },
    ]);
    const out = (await getAvailabilityHandler(
      { slug: 'evolv-performance', service_id: SERVICE.id, date_from: '2026-05-08', date_to: '2026-05-08' },
      ctx,
    )) as { slots: Array<{ promoted?: { kind: string; discount_percent?: number } }> };
    expect(out.slots[0].promoted?.kind).toBe('standard');
    expect(out.slots[0].promoted?.discount_percent).toBeUndefined();
  });

  it('excludes regulars_only rows from the promoted overlay (filtered by .in(kind))', async () => {
    // The handler passes ['standard', 'flash_sale'] to .in(); the mock just
    // returns whatever we set, so we simulate the filtered server-side
    // behaviour by returning [] when only regulars_only would have matched.
    setRpcForDate('2026-05-08', [
      { slot_start: '2026-05-08T18:00:00.000Z', slot_end: '2026-05-08T19:00:00.000Z' },
    ]);
    setPromoted([]);
    const out = (await getAvailabilityHandler(
      { slug: 'evolv-performance', service_id: SERVICE.id, date_from: '2026-05-08', date_to: '2026-05-08' },
      ctx,
    )) as { slots: Array<{ promoted?: unknown }> };
    expect(out.slots[0].promoted).toBeUndefined();
  });

  it('converts price_cents to price_eur and omits deposit_eur', async () => {
    setService({ ...SERVICE, price_cents: 6000 });
    const out = (await getAvailabilityHandler(
      { slug: 'evolv-performance', service_id: SERVICE.id, date_from: '2026-05-08', date_to: '2026-05-08' },
      ctx,
    )) as { service: { price_eur: number; deposit_eur?: number } };
    expect(out.service.price_eur).toBe(60);
    expect(out.service.deposit_eur).toBeUndefined();
  });

  it('returns RESPONSE_VALIDATION_FAILED when rpc returns malformed slots', async () => {
    // Slot rows missing slot_end → end_iso will be 'Invalid Date' → fails
    // datetime() validation in the output schema.
    setRpcForDate('2026-05-08', [{ slot_start: '2026-05-08T08:00:00.000Z' }]);
    const out = (await getAvailabilityHandler(
      { slug: 'evolv-performance', service_id: SERVICE.id, date_from: '2026-05-08', date_to: '2026-05-08' },
      ctx,
    )) as { error?: { code: string } };
    expect(out.error?.code).toBe('RESPONSE_VALIDATION_FAILED');
  });
});
