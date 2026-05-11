import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetRateLimitForTests } from '../../lib/rate-limit';

// ---- Mocks ----

type RpcResult = { data: unknown; error: unknown };
let rpcResult: RpcResult = { data: null, error: null };
const rpcCalls: Array<{ fn: string; params: Record<string, unknown> }> = [];

let customerInsertResult: { data: { id: string } | null; error: unknown } = {
  data: { id: 'cust-new-1' },
  error: null,
};

vi.mock('../../lib/supabase', () => ({
  supabaseAdmin: () => ({
    from: (_table: string) => ({
      insert: (_row: unknown) => ({
        select: (_cols: string) => ({
          single: async () => customerInsertResult,
        }),
      }),
    }),
    rpc: async (fn: string, params: Record<string, unknown>) => {
      rpcCalls.push({ fn, params });
      return rpcResult;
    },
  }),
}));

const cookieStore = new Map<string, string>();
let setCookieCalls: Array<{ name: string; value: string }> = [];

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieStore.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set: (name: string, value: string, _opts?: unknown) => {
      cookieStore.set(name, value);
      setCookieCalls.push({ name, value });
    },
  }),
}));

const { POST } = await import('../../app/api/open-spots/[saleId]/claim/route');

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/open-spots/sale-1/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const VALID_SALE_ID = '11111111-1111-1111-1111-111111111111';

function makeCtx(saleId: string = VALID_SALE_ID) {
  return { params: Promise.resolve({ saleId }) };
}

beforeEach(() => {
  rpcResult = { data: null, error: null };
  rpcCalls.length = 0;
  customerInsertResult = { data: { id: 'cust-new-1' }, error: null };
  cookieStore.clear();
  setCookieCalls = [];
  __resetRateLimitForTests();
});

afterEach(() => {
  vi.clearAllMocks();
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const POST_ANY = POST as any;

describe('POST /api/open-spots/[saleId]/claim', () => {
  it('200 stripe_now: returns booking_id and mints a guest customer cookie', async () => {
    rpcResult = { data: 'booking-abc', error: null };
    const res = await POST_ANY(
      makeRequest({ payment_mode: 'stripe_now' }),
      makeCtx(),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ booking_id: 'booking-abc' });
    expect(rpcCalls).toHaveLength(1);
    expect(rpcCalls[0].fn).toBe('claim_flash_sale_spot');
    expect(rpcCalls[0].params).toEqual({
      p_sale_id: VALID_SALE_ID,
      p_customer_id: 'cust-new-1',
      p_payment_mode: 'stripe_now',
    });
    expect(setCookieCalls).toContainEqual({
      name: 'ob_customer_id',
      value: 'cust-new-1',
    });
  });

  it('200 in_person: returns booking_id when phone is on file', async () => {
    rpcResult = { data: 'booking-xyz', error: null };
    cookieStore.set('ob_customer_id', 'cust-existing');
    const res = await POST_ANY(
      makeRequest({ payment_mode: 'in_person' }),
      makeCtx(),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ booking_id: 'booking-xyz' });
    expect(rpcCalls[0].params.p_customer_id).toBe('cust-existing');
    expect(rpcCalls[0].params.p_payment_mode).toBe('in_person');
    expect(setCookieCalls).toHaveLength(0);
  });

  it('410 sold_out: surfaces P0001 from the RPC', async () => {
    rpcResult = {
      data: null,
      error: { code: 'P0001', message: 'sold_out' },
    };
    cookieStore.set('ob_customer_id', 'cust-1');
    const res = await POST_ANY(
      makeRequest({ payment_mode: 'stripe_now' }),
      makeCtx(),
    );
    expect(res.status).toBe(410);
    expect(await res.json()).toEqual({ error: 'sold_out' });
  });

  it('422 phone_required: surfaces P0002 from the RPC', async () => {
    rpcResult = {
      data: null,
      error: { code: 'P0002', message: 'phone_required_for_in_person' },
    };
    cookieStore.set('ob_customer_id', 'cust-1');
    const res = await POST_ANY(
      makeRequest({ payment_mode: 'in_person' }),
      makeCtx(),
    );
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: 'phone_required' });
  });

  it('429 rate_limited: 4th request within the window is blocked with Retry-After', async () => {
    rpcResult = { data: 'booking-1', error: null };
    cookieStore.set('ob_customer_id', 'cust-rate');

    for (let i = 0; i < 3; i++) {
      const ok = await POST_ANY(
        makeRequest({ payment_mode: 'stripe_now' }),
        makeCtx(),
      );
      expect(ok.status).toBe(200);
    }

    const blocked = await POST_ANY(
      makeRequest({ payment_mode: 'stripe_now' }),
      makeCtx(),
    );
    expect(blocked.status).toBe(429);
    const retryAfter = blocked.headers.get('Retry-After');
    expect(retryAfter).not.toBeNull();
    expect(Number(retryAfter)).toBeGreaterThan(0);
    expect(await blocked.json()).toEqual({ error: 'rate_limited' });
  });
});
