import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

beforeAll(() => {
  process.env.MCP_HOLD_SIGNING_KEY = 'a'.repeat(64);
  process.env.MCP_POLLING_TOKEN_KEY = 'b'.repeat(64);
});

// ── Mocks
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
  chain.maybeSingle = vi.fn(async () => {
    if (table === 'mcp_holds') return holdResult;
    if (table === 'bookings') return bookingResult;
    if (table === 'customers') return customerLookup;
    return { data: null, error: null };
  });
  chain.single = vi.fn(async () => customerInsert);
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
  // After all filters collected, the call resolves on await; the route awaits
  // the chain directly without further selects so we return a thenable.
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

const piCreateMock = vi.fn(async () => ({
  id: 'pi_test_123',
  client_secret: 'pi_test_123_secret_xyz',
}));
vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({ paymentIntents: { create: piCreateMock } }),
}));

const sendEmailMock = vi.fn(async (..._args: unknown[]) => ({ id: 'msg_1' }));
vi.mock('@/lib/email', () => ({
  sendBookingConfirmation: sendEmailMock,
}));

// ── Imports after mocks
const { signHoldToken } = await import('../../lib/mcp/tokens');
const { POST } = await import('../../app/api/c/[token]/create-payment-intent/route');

const futureIso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

const baseHold = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'hold-1',
  status: 'pending',
  expires_at: futureIso(5 * 60 * 1000),
  booking_id: 'booking-1',
  ...overrides,
});

const baseBooking = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'booking-1',
  status: 'pending_payment',
  source: 'mcp',
  starts_at: futureIso(60 * 60 * 1000),
  businesses: {
    id: 'biz-1',
    name: 'Evolv',
    stripe_account_id: 'acct_test',
    stripe_charges_enabled: true,
  },
  services: { id: 'svc-1', name: 'PT Session', price_cents: 6000 },
  ...overrides,
});

async function callRoute(token: string, body: Record<string, unknown>) {
  const req = new Request(`http://localhost/api/c/${token}/create-payment-intent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return POST(req as unknown as import('next/server').NextRequest, { params: { token } });
}

beforeEach(() => {
  holdResult = { data: baseHold(), error: null };
  bookingResult = { data: baseBooking(), error: null };
  customerLookup = { data: null, error: null };
  customerInsert = { data: { id: 'cust-1' }, error: null };
  updateCalls.length = 0;
  piCreateMock.mockClear();
  sendEmailMock.mockClear();
});

afterEach(() => vi.useRealTimers());

describe('POST /api/c/[token]/create-payment-intent', () => {
  it('rejects an invalid token with 401', async () => {
    const res = await callRoute('not.a.token', { email: 'x@x.com', name: 'X' });
    expect(res.status).toBe(401);
  });

  it('rejects invalid email with 400', async () => {
    const token = await signHoldToken({
      hold_id: 'hold-1', booking_id: 'booking-1',
      business_id: 'biz-1', service_id: 'svc-1',
      expires_at: futureIso(5 * 60 * 1000),
    });
    const res = await callRoute(token, { email: 'no-at-sign', name: 'X' });
    expect(res.status).toBe(400);
  });

  it('returns 410 when the hold has expired', async () => {
    holdResult = { data: baseHold({ expires_at: futureIso(-1000) }), error: null };
    const token = await signHoldToken({
      hold_id: 'hold-1', booking_id: 'booking-1',
      business_id: 'biz-1', service_id: 'svc-1',
      expires_at: futureIso(5 * 60 * 1000),
    });
    const res = await callRoute(token, { email: 'a@b.com', name: 'A' });
    expect(res.status).toBe(410);
  });

  it('free booking: confirms inline + fires emails + skips Stripe', async () => {
    bookingResult = {
      data: baseBooking({ services: { id: 'svc-1', name: 'Free intro', price_cents: 0 } }),
      error: null,
    };
    const token = await signHoldToken({
      hold_id: 'hold-1', booking_id: 'booking-1',
      business_id: 'biz-1', service_id: 'svc-1',
      expires_at: futureIso(5 * 60 * 1000),
    });

    const res = await callRoute(token, { email: 'a@b.com', name: 'Niamh', phone: '', notes: '' });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ is_free: true, confirmed: true, booking_id: 'booking-1' });
    expect(piCreateMock).not.toHaveBeenCalled();

    // status flipped to confirmed via guarded UPDATE on pending_payment.
    const confirmCall = updateCalls.find(
      (c) => c.table === 'bookings' && c.values.status === 'confirmed',
    );
    expect(confirmCall).toBeDefined();
    expect(confirmCall?.filters.status).toEqual(['pending_payment', 'pending']);

    // mcp_holds marked completed
    expect(updateCalls.find((c) => c.table === 'mcp_holds' && c.values.status === 'completed')).toBeDefined();
  });

  it('paid booking: creates PaymentIntent + flips status to awaiting_payment', async () => {
    const token = await signHoldToken({
      hold_id: 'hold-1', booking_id: 'booking-1',
      business_id: 'biz-1', service_id: 'svc-1',
      expires_at: futureIso(5 * 60 * 1000),
    });
    const res = await callRoute(token, { email: 'a@b.com', name: 'Niamh', phone: '+353', notes: 'tight hammy' });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      is_free: false,
      client_secret: 'pi_test_123_secret_xyz',
      payment_intent_id: 'pi_test_123',
    });

    // PI created on the connected account with destination + booking_id metadata
    expect(piCreateMock).toHaveBeenCalledOnce();
    const piArgs = (piCreateMock.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(piArgs.amount).toBe(6000);
    expect(piArgs.transfer_data).toEqual({ destination: 'acct_test' });
    expect((piArgs.metadata as Record<string, string>).booking_id).toBe('booking-1');
    expect((piArgs.metadata as Record<string, string>).source).toBe('mcp');

    // booking flipped to awaiting_payment so the webhook's guarded UPDATE will fire
    const handoff = updateCalls.find(
      (c) => c.table === 'bookings' && c.values.status === 'awaiting_payment',
    );
    expect(handoff).toBeDefined();
    expect(handoff?.filters.status).toBe('pending_payment');
  });

  it('paid booking: rolls back status when PaymentIntent creation fails', async () => {
    piCreateMock.mockRejectedValueOnce(new Error('stripe down'));
    const token = await signHoldToken({
      hold_id: 'hold-1', booking_id: 'booking-1',
      business_id: 'biz-1', service_id: 'svc-1',
      expires_at: futureIso(5 * 60 * 1000),
    });
    const res = await callRoute(token, { email: 'a@b.com', name: 'Niamh' });
    expect(res.status).toBe(502);

    // rollback: awaiting_payment → pending_payment
    const rollback = updateCalls
      .filter((c) => c.table === 'bookings')
      .find((c) => c.values.status === 'pending_payment' && c.filters.status === 'awaiting_payment');
    expect(rollback).toBeDefined();
  });

  it('reuses an existing customer when email matches', async () => {
    customerLookup = { data: { id: 'cust-existing' }, error: null };
    const token = await signHoldToken({
      hold_id: 'hold-1', booking_id: 'booking-1',
      business_id: 'biz-1', service_id: 'svc-1',
      expires_at: futureIso(5 * 60 * 1000),
    });
    await callRoute(token, { email: 'a@b.com', name: 'Niamh' });

    // booking.customer_id set to the EXISTING id, not a freshly created one
    const link = updateCalls.find(
      (c) => c.table === 'bookings' && c.values.customer_id !== undefined,
    );
    expect(link?.values.customer_id).toBe('cust-existing');
  });

  it('returns 503 when the business has no Stripe account or charges disabled', async () => {
    bookingResult = {
      data: baseBooking({
        businesses: {
          id: 'biz-1', name: 'Evolv', stripe_account_id: null, stripe_charges_enabled: false,
        },
      }),
      error: null,
    };
    const token = await signHoldToken({
      hold_id: 'hold-1', booking_id: 'booking-1',
      business_id: 'biz-1', service_id: 'svc-1',
      expires_at: futureIso(5 * 60 * 1000),
    });
    const res = await callRoute(token, { email: 'a@b.com', name: 'Niamh' });
    expect(res.status).toBe(503);
  });

  it('refuses an already-confirmed booking with 410', async () => {
    bookingResult = { data: baseBooking({ status: 'confirmed' }), error: null };
    const token = await signHoldToken({
      hold_id: 'hold-1', booking_id: 'booking-1',
      business_id: 'biz-1', service_id: 'svc-1',
      expires_at: futureIso(5 * 60 * 1000),
    });
    const res = await callRoute(token, { email: 'a@b.com', name: 'Niamh' });
    expect(res.status).toBe(410);
  });
});
