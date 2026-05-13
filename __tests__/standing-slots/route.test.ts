import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetRateLimitForTests } from '../../lib/rate-limit';

type Result<T = unknown> = { data: T | null; error: unknown };

let insertResult: Result<{ id: string; max_price_cents: number }> = {
  data: { id: 'slot-new', max_price_cents: 1500 },
  error: null,
};
let listResult: Result<Array<unknown>> = { data: [], error: null };
let updateResult: Result = { data: null, error: null };
let deleteResult: Result = { data: null, error: null };
let customerInsertResult: Result<{ id: string }> = {
  data: { id: 'cust-new' },
  error: null,
};

let insertCalls: Array<unknown> = [];
let updateCalls: Array<{ row: unknown; id: string; customerId: string }> = [];
let deleteCalls: Array<{ id: string; customerId: string }> = [];

const cookieStore = new Map<string, string>();
const setCookieCalls: Array<{ name: string; value: string }> = [];

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
      if (table === 'standing_slots') {
        return {
          insert: (row: unknown) => {
            insertCalls.push(row);
            return {
              select: () => ({
                single: async () => insertResult,
              }),
            };
          },
          select: () => ({
            eq: () => ({
              order: async () => listResult,
            }),
          }),
          update: (row: unknown) => ({
            eq: (_col1: string, val1: string) => ({
              eq: (_col2: string, val2: string) => ({
                select: () => ({
                  maybeSingle: async () => {
                    updateCalls.push({ row, id: val1, customerId: val2 });
                    return updateResult;
                  },
                }),
              }),
            }),
          }),
          delete: () => ({
            eq: (_col1: string, val1: string) => ({
              eq: async (_col2: string, val2: string) => {
                deleteCalls.push({ id: val1, customerId: val2 });
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

const { POST: POST_SLOTS, GET: GET_SLOTS } = await import(
  '../../app/api/standing-slots/route'
);
const { PATCH: PATCH_SLOT, DELETE: DELETE_SLOT } = await import(
  '../../app/api/standing-slots/[id]/route'
);

const VALID_SLOT_ID = '22222222-2222-2222-2222-222222222222';
const VALID_BUSINESS_ID = '11111111-1111-1111-1111-111111111111';

function postReq(body: unknown) {
  return new Request('http://localhost/api/standing-slots', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as import('next/server').NextRequest;
}

function patchReq(body: unknown) {
  return new Request(`http://localhost/api/standing-slots/${VALID_SLOT_ID}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as import('next/server').NextRequest;
}

const ctxFor = (id: string = VALID_SLOT_ID) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  insertResult = { data: { id: 'slot-new', max_price_cents: 1500 }, error: null };
  listResult = { data: [], error: null };
  updateResult = { data: { id: VALID_SLOT_ID, active: false }, error: null };
  deleteResult = { data: null, error: null };
  customerInsertResult = { data: { id: 'cust-new' }, error: null };
  insertCalls.length = 0;
  updateCalls.length = 0;
  deleteCalls.length = 0;
  cookieStore.clear();
  setCookieCalls.length = 0;
  __resetRateLimitForTests();
});

afterEach(() => {
  vi.clearAllMocks();
});

const baseCreate = {
  business_id: VALID_BUSINESS_ID,
  service_id: null,
  max_price_cents: 1500,
  day_mask: 127,
  time_start: '00:00',
  time_end: '23:59',
};

describe('POST /api/standing-slots', () => {
  it('201 happy path mints guest customer when missing', async () => {
    const res = await POST_SLOTS(postReq(baseCreate));
    expect(res.status).toBe(201);
    expect(setCookieCalls).toEqual([{ name: 'ob_customer_id', value: 'cust-new' }]);
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0]).toMatchObject({
      customer_id: 'cust-new',
      business_id: VALID_BUSINESS_ID,
      max_price_cents: 1500,
      day_mask: 127,
    });
  });

  it('400 when time_start >= time_end', async () => {
    const res = await POST_SLOTS(
      postReq({ ...baseCreate, time_start: '20:00', time_end: '08:00' }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('time_start_must_be_before_time_end');
  });

  it('400 when day_mask is out of range', async () => {
    const res = await POST_SLOTS(postReq({ ...baseCreate, day_mask: 999 }));
    expect(res.status).toBe(400);
  });

  it('400 when neither business_id nor category is supplied', async () => {
    const res = await POST_SLOTS(
      postReq({ ...baseCreate, business_id: null }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('business_id_or_category_required');
  });

  it('reuses an existing customer cookie without minting', async () => {
    cookieStore.set('ob_customer_id', 'cust-existing');
    const res = await POST_SLOTS(postReq(baseCreate));
    expect(res.status).toBe(201);
    expect(setCookieCalls).toEqual([]);
    expect(insertCalls[0]).toMatchObject({ customer_id: 'cust-existing' });
  });
});

describe('GET /api/standing-slots', () => {
  it('returns empty when no cookie present', async () => {
    const res = await GET_SLOTS();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.slots).toEqual([]);
  });
});

describe('PATCH /api/standing-slots/[id]', () => {
  it('200 happy path with customer_id ownership predicate in the query', async () => {
    cookieStore.set('ob_customer_id', 'cust-1');
    const res = await PATCH_SLOT(patchReq({ active: false }), ctxFor());
    expect(res.status).toBe(200);
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].row).toEqual({ active: false });
    expect(updateCalls[0].id).toBe(VALID_SLOT_ID);
    expect(updateCalls[0].customerId).toBe('cust-1');
  });

  it('404 when there is no cookie', async () => {
    const res = await PATCH_SLOT(patchReq({ active: false }), ctxFor());
    expect(res.status).toBe(404);
  });

  it('404 when the slot does not belong to the cookie customer (maybeSingle returns null)', async () => {
    cookieStore.set('ob_customer_id', 'cust-1');
    updateResult = { data: null, error: null };
    const res = await PATCH_SLOT(patchReq({ active: false }), ctxFor());
    expect(res.status).toBe(404);
  });

  it('400 when the body has no fields to update', async () => {
    cookieStore.set('ob_customer_id', 'cust-1');
    const res = await PATCH_SLOT(patchReq({}), ctxFor());
    expect(res.status).toBe(400);
  });

  it('400 when the id is not a uuid', async () => {
    cookieStore.set('ob_customer_id', 'cust-1');
    const res = await PATCH_SLOT(patchReq({ active: false }), ctxFor('not-a-uuid'));
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/standing-slots/[id]', () => {
  it('204 happy path', async () => {
    cookieStore.set('ob_customer_id', 'cust-1');
    const res = await DELETE_SLOT(
      new Request(`http://localhost/api/standing-slots/${VALID_SLOT_ID}`, {
        method: 'DELETE',
      }) as unknown as import('next/server').NextRequest,
      ctxFor(),
    );
    expect(res.status).toBe(204);
    expect(deleteCalls).toEqual([{ id: VALID_SLOT_ID, customerId: 'cust-1' }]);
  });

  it('204 no-op when no cookie', async () => {
    const res = await DELETE_SLOT(
      new Request(`http://localhost/api/standing-slots/${VALID_SLOT_ID}`, {
        method: 'DELETE',
      }) as unknown as import('next/server').NextRequest,
      ctxFor(),
    );
    expect(res.status).toBe(204);
    expect(deleteCalls).toEqual([]);
  });
});
