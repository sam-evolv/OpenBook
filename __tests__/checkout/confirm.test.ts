import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

beforeAll(() => {
  process.env.MCP_HOLD_SIGNING_KEY = 'a'.repeat(64);
  process.env.MCP_POLLING_TOKEN_KEY = 'b'.repeat(64);
});

type LookupResult = { data: unknown; error: unknown };

let holdResult: LookupResult = { data: null, error: null };
let bookingResult: LookupResult = { data: null, error: null };
let customerLookup: LookupResult = { data: null, error: null };
let customerInsert: LookupResult = { data: { id: 'cust-1' }, error: null };
const updateCalls: Array<{ table: string; values: Record<string, unknown>; filters: Record<string, unknown> }> = [];

function buildSelectChain(table: string): Record<string, unknown> {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => {
    if (table === 'mcp_holds') return holdResult;
    if (table === 'bookings') return bookingResult;
    if (table === 'customers') return customerLookup;
    return { data: null, error: null };
  });
  chain.single = vi.fn(async () => customerInsert);
  // resolveOrCreateCustomer awaits the .order().limit() chain directly,
  // expecting an array of rows (or an error). Make the chain thenable so
  // the customers-table lookup resolves to customerLookup.
  (chain as { then: (resolve: (v: unknown) => void) => void }).then = (
    resolve: (v: unknown) => void,
  ) => {
    if (table === 'customers') resolve(customerLookup);
    else resolve({ data: null, error: null });
  };
  return chain;
}

function buildUpdateChain(table: string, values: Record<string, unknown>): Record<string, unknown> {
  const filters: Record<string, unknown> = {};
  const chain: Record<string, unknown> = {};
  chain.eq = vi.fn((col: string, val: unknown) => {
    filters[col] = val;
    return chain;
  });
  chain.in = vi.fn((col: string, vals: unknown[]) => {
    filters[col] = vals;
    return chain;
  });
  (chain as { then: (resolve: (v: unknown) => void) => void }).then = (resolve: (v: unknown) => void) => {
    updateCalls.push({ table, values, filters });
    resolve({ data: null, error: null });
  };
  return chain;
}

function buildInsertChain(table: string): Record<string, unknown> {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.single = vi.fn(async () => {
    if (table === 'customers') return customerInsert;
    return { data: null, error: null };
  });
  return chain;
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: () => ({
    from: vi.fn((table: string) => ({
      select: vi.fn(() => buildSelectChain(table)),
      update: vi.fn((values: Record<string, unknown>) => buildUpdateChain(table, values)),
      insert: vi.fn(() => buildInsertChain(table)),
    })),
  }),
}));

const sendEmailMock = vi.fn(async (..._args: unknown[]) => ({ id: 'msg_1' }));
vi.mock('@/lib/email', () => ({
  sendBookingConfirmation: sendEmailMock,
}));

const { signHoldToken } = await import('../../lib/mcp/tokens');
const { POST } = await import('../../app/api/c/[token]/confirm/route');

const futureIso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

const baseHold = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'hold-1',
  status: 'pending',
  expires_at: futureIso(5 * 60 * 1000),
  booking_id: 'booking-1',
  source_assistant: 'claude',
  ...overrides,
});

const inPersonBooking = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'booking-1',
  status: 'pending_payment',
  source: 'mcp',
  starts_at: futureIso(60 * 60 * 1000),
  businesses: {
    id: 'biz-nail',
    name: 'The Nail Studio',
    stripe_account_id: null,
    stripe_charges_enabled: false,
  },
  services: { id: 'svc-1', name: 'Gel Manicure', price_cents: 4000 },
  ...overrides,
});

async function callRoute(token: string, body: Record<string, unknown>) {
  const req = new Request(`http://localhost/api/c/${token}/confirm`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return POST(req as unknown as import('next/server').NextRequest, { params: { token } });
}

async function tokenForHold(): Promise<string> {
  return signHoldToken({
    hold_id: 'hold-1',
    booking_id: 'booking-1',
    business_id: 'biz-nail',
    service_id: 'svc-1',
    expires_at: futureIso(5 * 60 * 1000),
  });
}

beforeEach(() => {
  holdResult = { data: baseHold(), error: null };
  bookingResult = { data: inPersonBooking(), error: null };
  customerLookup = { data: null, error: null };
  customerInsert = { data: { id: 'cust-1' }, error: null };
  updateCalls.length = 0;
  sendEmailMock.mockClear();
});

afterEach(() => vi.useRealTimers());

describe('POST /api/c/[token]/confirm', () => {
  it('rejects an invalid token with 401', async () => {
    const res = await callRoute('not.a.token', { name: 'A', email: 'a@b.com', phone: '0851234567' });
    expect(res.status).toBe(401);
  });

  it('rejects when phone is missing', async () => {
    const token = await tokenForHold();
    const res = await callRoute(token, { name: 'Niamh', email: 'a@b.com' });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('missing_required_fields');
    expect(json.missing).toContain('phone');
  });

  it('rejects when phone is whitespace only', async () => {
    const token = await tokenForHold();
    const res = await callRoute(token, { name: 'Niamh', email: 'a@b.com', phone: '   ' });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.missing).toContain('phone');
  });

  it('rejects when name or email is missing', async () => {
    const token = await tokenForHold();
    const res = await callRoute(token, { phone: '0851234567' });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.missing).toEqual(expect.arrayContaining(['name', 'email']));
  });

  it('happy path: persists booking with payment_mode=in_person + customer_phone snapshot', async () => {
    const token = await tokenForHold();
    const res = await callRoute(token, {
      name: 'Niamh',
      email: 'niamh@example.com',
      phone: '0851234567',
      notes: 'first time, please be gentle',
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('confirmed');
    expect(json.payment_mode).toBe('in_person');
    expect(json.amount_due_at_business_eur).toBe(40);
    expect(json.reference).toBe('booking-'); // first 8 chars of 'booking-1'
    expect(json.booking_id).toBe('booking-1');

    // Booking was UPDATEd with payment_mode + customer_phone + status + source_assistant
    const bookingUpdate = updateCalls.find(
      (c) => c.table === 'bookings' && c.values.status === 'confirmed',
    );
    expect(bookingUpdate).toBeDefined();
    expect(bookingUpdate?.values.payment_mode).toBe('in_person');
    expect(bookingUpdate?.values.customer_phone).toBe('0851234567');
    expect(bookingUpdate?.values.source_assistant).toBe('claude');
    expect(bookingUpdate?.values.notes).toBe('first time, please be gentle');
    expect(bookingUpdate?.filters.status).toEqual(['pending_payment', 'pending']);

    // Hold was marked completed
    expect(updateCalls.find((c) => c.table === 'mcp_holds' && c.values.status === 'completed')).toBeDefined();
  });

  it('refuses if booking is already confirmed', async () => {
    bookingResult = { data: inPersonBooking({ status: 'confirmed' }), error: null };
    const token = await tokenForHold();
    const res = await callRoute(token, { name: 'A', email: 'a@b.com', phone: '0851234567' });
    expect(res.status).toBe(410);
    const json = await res.json();
    expect(json.error).toBe('already_confirmed');
  });

  it('returns 410 when hold has expired', async () => {
    holdResult = { data: baseHold({ expires_at: futureIso(-1000) }), error: null };
    const token = await tokenForHold();
    const res = await callRoute(token, { name: 'A', email: 'a@b.com', phone: '0851234567' });
    expect(res.status).toBe(410);
  });

  it('rejects if booking belongs to a stripe_now business', async () => {
    bookingResult = {
      data: inPersonBooking({
        businesses: {
          id: 'biz-stripe', name: 'Dublin Iron Gym',
          stripe_account_id: 'acct_dublin', stripe_charges_enabled: true,
        },
      }),
      error: null,
    };
    const token = await tokenForHold();
    const res = await callRoute(token, { name: 'A', email: 'a@b.com', phone: '0851234567' });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('wrong_payment_mode');
  });

  it('never returns 500: handler throws are caught and surfaced as 503', async () => {
    bookingResult = { data: null, error: { message: 'simulated outage' } };
    const token = await tokenForHold();
    const res = await callRoute(token, { name: 'A', email: 'a@b.com', phone: '0851234567' });
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBe('checkout_unavailable');
  });

  it('reuses an existing customer by email and writes phone to customers and bookings', async () => {
    customerLookup = { data: [{ id: 'cust-existing', created_at: '2024-01-01T00:00:00Z' }], error: null };
    const token = await tokenForHold();
    await callRoute(token, {
      name: 'Niamh',
      email: 'returning@example.com',
      phone: '0871234567',
    });

    // booking.customer_id linked to existing customer
    const link = updateCalls.find(
      (c) => c.table === 'bookings' && c.values.customer_id !== undefined,
    );
    expect(link?.values.customer_id).toBe('cust-existing');
    expect(link?.values.customer_phone).toBe('0871234567');
  });

  it('multi-row email: confirms cleanly and links the newest customer row', async () => {
    // The bug this PR fixes: prod has emails with 2+ rows in customers
    // (sam@evolvai.ie x2, samdonfx@gmail.com x3). The helper orders by
    // created_at DESC and limits to 1, so the route sees a single-row
    // array containing the newest row. The route must NOT 503 here.
    customerLookup = {
      data: [{ id: 'cust-newest', created_at: '2025-05-01T00:00:00Z' }],
      error: null,
    };
    const token = await tokenForHold();
    const res = await callRoute(token, {
      name: 'Sam',
      email: 'sam@evolvai.ie',
      phone: '0871234567',
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('confirmed');

    const bookingUpdate = updateCalls.find(
      (c) => c.table === 'bookings' && c.values.status === 'confirmed',
    );
    expect(bookingUpdate?.values.customer_id).toBe('cust-newest');
  });

  it('logs structured fields when customer resolution fails (Vercel UI truncation guard)', async () => {
    customerLookup = {
      data: null,
      error: {
        code: 'PGRST116',
        message: 'JSON object requested, multiple (or no) rows returned',
        details: 'Results contain 2 rows',
        hint: null,
      },
    };
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const token = await tokenForHold();
    const res = await callRoute(token, {
      name: 'Sam',
      email: 'sam@evolvai.ie',
      phone: '0871234567',
    });

    expect(res.status).toBe(503);

    const resolveLog = errorSpy.mock.calls.find(
      (call) => call[0] === '[checkout/confirm] customer_resolve_failed',
    );
    expect(resolveLog).toBeDefined();
    const payload = resolveLog?.[1] as Record<string, unknown>;
    expect(payload).toMatchObject({
      email_provided: true,
      pg_code: 'PGRST116',
      pg_message: 'JSON object requested, multiple (or no) rows returned',
      pg_details: 'Results contain 2 rows',
    });
    // Each pg_* must be its own field, not concatenated into one string.
    expect(typeof payload.pg_code).toBe('string');
    expect(typeof payload.pg_message).toBe('string');

    errorSpy.mockRestore();
  });
});
