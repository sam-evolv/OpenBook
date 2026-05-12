import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetRateLimitForTests } from '../../lib/rate-limit';

// ---- Mock state (mutable, reset in beforeEach) ----

type Result<T = unknown> = { data: T | null; error: unknown };

let businessLookup: Result = { data: null, error: null };
let upsertResult: Result<Array<unknown>> = { data: [], error: null };
let updateResult: Result = { data: null, error: null };
let deleteResult: Result = { data: null, error: null };
let customerInsertResult: Result<{ id: string }> = {
  data: { id: 'cust-new' },
  error: null,
};

let upsertCalls: Array<{ row: unknown; opts: unknown }> = [];
let deleteCalls: Array<{ customerId: string; businessId: string }> = [];
let updateCalls: Array<{ row: unknown; customerId: string; businessId: string }> = [];

const cookieStore = new Map<string, string>();
const setCookieCalls: Array<{ name: string; value: string }> = [];

// ---- Module mocks ----

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieStore.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set: (name: string, value: string) => {
      cookieStore.set(name, value);
      setCookieCalls.push({ name, value });
    },
  }),
}));

vi.mock('../../lib/supabase', () => ({
  supabaseAdmin: () => ({
    from: (table: string) => {
      if (table === 'customers') {
        return {
          insert: () => ({
            select: () => ({
              single: async () => customerInsertResult,
            }),
          }),
        };
      }
      if (table === 'businesses') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => businessLookup,
            }),
          }),
        };
      }
      if (table === 'home_pins') {
        return {
          upsert: (row: unknown, opts: unknown) => {
            upsertCalls.push({ row, opts });
            return {
              select: async () => upsertResult,
            };
          },
          update: (row: unknown) => ({
            eq: (_col1: string, val1: string) => ({
              eq: (_col2: string, val2: string) => ({
                select: () => ({
                  maybeSingle: async () => {
                    updateCalls.push({
                      row,
                      customerId: val1,
                      businessId: val2,
                    });
                    return updateResult;
                  },
                }),
              }),
            }),
          }),
          delete: () => ({
            eq: (_col1: string, val1: string) => ({
              eq: async (_col2: string, val2: string) => {
                deleteCalls.push({ customerId: val1, businessId: val2 });
                return deleteResult;
              },
            }),
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  }),
}));

const { POST: POST_PINS, GET: GET_PINS } = await import(
  '../../app/api/home-pins/route'
);
const { DELETE: DELETE_PIN, PATCH: PATCH_PIN } = await import(
  '../../app/api/home-pins/[businessId]/route'
);

const VALID_BUSINESS_ID = '11111111-1111-1111-1111-111111111111';

function makePostRequest(body: unknown) {
  return new Request('http://localhost/api/home-pins', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as import('next/server').NextRequest;
}

function makePatchRequest(body: unknown) {
  return new Request(`http://localhost/api/home-pins/${VALID_BUSINESS_ID}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as import('next/server').NextRequest;
}

const ctx = (businessId: string = VALID_BUSINESS_ID) => ({
  params: Promise.resolve({ businessId }),
});

beforeEach(() => {
  businessLookup = {
    data: {
      id: VALID_BUSINESS_ID,
      slug: 'cork-physio',
      name: 'Cork Physio',
      category: 'Physiotherapy',
      primary_colour: 'blue',
      logo_url: null,
      processed_icon_url: null,
      is_live: true,
    },
    error: null,
  };
  upsertResult = {
    data: [
      {
        business_id: VALID_BUSINESS_ID,
        pinned_at: '2026-05-12T00:00:00Z',
        notifications_enabled: true,
      },
    ],
    error: null,
  };
  updateResult = { data: null, error: null };
  deleteResult = { data: null, error: null };
  customerInsertResult = { data: { id: 'cust-new' }, error: null };

  upsertCalls.length = 0;
  deleteCalls.length = 0;
  updateCalls.length = 0;
  cookieStore.clear();
  setCookieCalls.length = 0;
  __resetRateLimitForTests();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/home-pins', () => {
  it('201 when newly pinned and mints a guest customer cookie', async () => {
    const res = await POST_PINS(
      makePostRequest({ businessId: VALID_BUSINESS_ID }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.pinned).toBe(true);
    expect(body.already_pinned).toBe(false);
    expect(body.business.slug).toBe('cork-physio');
    expect(setCookieCalls).toEqual([
      { name: 'ob_customer_id', value: 'cust-new' },
    ]);
  });

  it('200 when business is already pinned (upsert returns no row)', async () => {
    cookieStore.set('ob_customer_id', 'cust-existing');
    upsertResult = { data: [], error: null }; // ignoreDuplicates = duplicate

    const res = await POST_PINS(
      makePostRequest({ businessId: VALID_BUSINESS_ID }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pinned).toBe(true);
    expect(body.already_pinned).toBe(true);
    expect(setCookieCalls).toEqual([]); // existing cookie, no re-mint
  });

  it('404 when the business does not exist', async () => {
    businessLookup = { data: null, error: null };
    const res = await POST_PINS(
      makePostRequest({ businessId: VALID_BUSINESS_ID }),
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('business_not_found');
  });

  it('400 when the business exists but is_live=false', async () => {
    businessLookup = {
      data: { ...(businessLookup.data as object), is_live: false },
      error: null,
    };
    const res = await POST_PINS(
      makePostRequest({ businessId: VALID_BUSINESS_ID }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('business_not_live');
  });

  it('400 when the body fails schema validation', async () => {
    const res = await POST_PINS(makePostRequest({ businessId: 'not-a-uuid' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_body');
  });

  it('upserts with the right onConflict + ignoreDuplicates options', async () => {
    await POST_PINS(makePostRequest({ businessId: VALID_BUSINESS_ID }));
    expect(upsertCalls).toHaveLength(1);
    expect(upsertCalls[0].row).toMatchObject({
      customer_id: 'cust-new',
      business_id: VALID_BUSINESS_ID,
    });
    expect(upsertCalls[0].opts).toEqual({
      onConflict: 'customer_id,business_id',
      ignoreDuplicates: true,
    });
  });
});

describe('GET /api/home-pins', () => {
  it('returns an empty list when no cookie is present', async () => {
    const res = await GET_PINS();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pins).toEqual([]);
  });
});

describe('DELETE /api/home-pins/[businessId]', () => {
  it('204 happy path with a delete against (customer_id, business_id)', async () => {
    cookieStore.set('ob_customer_id', 'cust-1');
    const res = await DELETE_PIN(
      new Request(`http://localhost/api/home-pins/${VALID_BUSINESS_ID}`, {
        method: 'DELETE',
      }) as unknown as import('next/server').NextRequest,
      ctx(),
    );
    expect(res.status).toBe(204);
    expect(deleteCalls).toEqual([
      { customerId: 'cust-1', businessId: VALID_BUSINESS_ID },
    ]);
  });

  it('204 no-op when there is no cookie (idempotent)', async () => {
    const res = await DELETE_PIN(
      new Request(`http://localhost/api/home-pins/${VALID_BUSINESS_ID}`, {
        method: 'DELETE',
      }) as unknown as import('next/server').NextRequest,
      ctx(),
    );
    expect(res.status).toBe(204);
    expect(deleteCalls).toEqual([]);
  });

  it('400 when the businessId is not a uuid', async () => {
    cookieStore.set('ob_customer_id', 'cust-1');
    const res = await DELETE_PIN(
      new Request('http://localhost/api/home-pins/not-a-uuid', {
        method: 'DELETE',
      }) as unknown as import('next/server').NextRequest,
      ctx('not-a-uuid'),
    );
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/home-pins/[businessId]', () => {
  it('200 when toggling notifications on an existing pin', async () => {
    cookieStore.set('ob_customer_id', 'cust-1');
    updateResult = {
      data: { notifications_enabled: false },
      error: null,
    };

    const res = await PATCH_PIN(
      makePatchRequest({ notifications_enabled: false }),
      ctx(),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notifications_enabled).toBe(false);
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].row).toEqual({ notifications_enabled: false });
    expect(updateCalls[0].customerId).toBe('cust-1');
    expect(updateCalls[0].businessId).toBe(VALID_BUSINESS_ID);
  });

  it('404 when the pin does not exist', async () => {
    cookieStore.set('ob_customer_id', 'cust-1');
    updateResult = { data: null, error: null };
    const res = await PATCH_PIN(
      makePatchRequest({ notifications_enabled: true }),
      ctx(),
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('pin_not_found');
  });

  it('404 when there is no cookie (no pin row could exist)', async () => {
    const res = await PATCH_PIN(
      makePatchRequest({ notifications_enabled: true }),
      ctx(),
    );
    expect(res.status).toBe(404);
  });

  it('400 when the body fails schema validation', async () => {
    cookieStore.set('ob_customer_id', 'cust-1');
    const res = await PATCH_PIN(makePatchRequest({}), ctx());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_body');
  });
});
