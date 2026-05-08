import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

beforeAll(() => {
  process.env.MCP_HOLD_SIGNING_KEY = 'a'.repeat(64);
  process.env.MCP_POLLING_TOKEN_KEY = 'b'.repeat(64);
});

let holdLookup: { data: unknown; error: unknown } = { data: null, error: null };
let businessLookup: { data: unknown; error: unknown } = { data: null, error: null };
let serviceLookup: { data: unknown; error: unknown } = { data: null, error: null };
let availabilityResult: { data: unknown; error: unknown } = { data: [], error: null };

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: () => ({
    from: vi.fn((table: string) => {
      const chain: Record<string, unknown> = {};
      chain.select = vi.fn(() => chain);
      chain.eq = vi.fn(() => chain);
      chain.maybeSingle = vi.fn(async () => {
        if (table === 'businesses') return businessLookup;
        if (table === 'services') return serviceLookup;
        return holdLookup;
      });
      return chain;
    }),
    rpc: vi.fn(async () => availabilityResult),
  }),
}));

const { signHoldToken } = await import('../../lib/mcp/tokens');
const { GET } = await import('../../app/api/c/[token]/alternatives/route');

const futureIso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

async function callRoute(token: string) {
  const req = new Request(`http://localhost/api/c/${token}/alternatives`);
  return GET(req as unknown as import('next/server').NextRequest, { params: { token } });
}

beforeEach(() => {
  holdLookup = {
    data: {
      id: 'hold-1',
      business_id: 'biz-1',
      service_id: 'svc-1',
      // start_at anchors the alternatives window. Use 3h from now so it
      // sits inside the test's "futureIso" availability slots.
      start_at: futureIso(3 * 3600 * 1000),
      booking_id: 'booking-1',
    },
    error: null,
  };
  businessLookup = { data: { slug: 'evolv' }, error: null };
  serviceLookup = {
    data: { id: 'svc-1', name: 'PT', duration_minutes: 60, price_cents: 6000 },
    error: null,
  };
  availabilityResult = { data: [], error: null };
});

describe('GET /api/c/[token]/alternatives', () => {
  it('returns up to 3 alternatives with start_iso, start_human, start_compact, rebook_url', async () => {
    availabilityResult = {
      data: [
        { slot_start: futureIso(3 * 3600 * 1000), slot_end: futureIso(4 * 3600 * 1000) },
        { slot_start: futureIso(5 * 3600 * 1000), slot_end: futureIso(6 * 3600 * 1000) },
        { slot_start: futureIso(7 * 3600 * 1000), slot_end: futureIso(8 * 3600 * 1000) },
        { slot_start: futureIso(9 * 3600 * 1000), slot_end: futureIso(10 * 3600 * 1000) },
      ],
      error: null,
    };
    const token = await signHoldToken({
      hold_id: 'hold-1', booking_id: 'booking-1',
      business_id: 'biz-1', service_id: 'svc-1',
      expires_at: futureIso(5 * 60 * 1000),
    });
    const res = await callRoute(token);
    const json = await res.json();
    expect(json.alternatives).toHaveLength(3);
    for (const alt of json.alternatives) {
      expect(typeof alt.start_iso).toBe('string');
      expect(typeof alt.start_human).toBe('string');
      expect(typeof alt.start_compact).toBe('string');
      expect(alt.rebook_url).toMatch(/^\/booking\/svc-1\?start=/);
      expect(alt.rebook_url).toContain('slug=evolv');
    }
  });

  it('returns empty list when the token is malformed', async () => {
    const res = await callRoute('not.a.real.token');
    const json = await res.json();
    expect(json.alternatives).toEqual([]);
  });

  it('accepts an EXPIRED valid-shape token (recovery flow)', async () => {
    // Expired tokens fail signature verification but the route falls back
    // to decoding the body for the hold_id hint, then DB-validates everything.
    const expired = await signHoldToken({
      hold_id: 'hold-1', booking_id: 'booking-1',
      business_id: 'biz-1', service_id: 'svc-1',
      expires_at: futureIso(-60 * 1000),
    });
    availabilityResult = {
      data: [{ slot_start: futureIso(3 * 3600 * 1000), slot_end: futureIso(4 * 3600 * 1000) }],
      error: null,
    };
    const res = await callRoute(expired);
    const json = await res.json();
    expect(json.alternatives.length).toBeGreaterThan(0);
  });
});
