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

  it('free booking: returns in_person shape + skips Stripe + leaves booking write to /confirm', async () => {
    // Free services flow through payment_mode='in_person'. The actual
    // booking confirmation now happens in /api/c/[token]/confirm so this
    // route only emits the discriminator and the confirm_endpoint URL.
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
    expect(json.payment_mode).toBe('in_person');
    expect(json.payment_required_now).toBe(false);
    expect(json.is_free).toBe(true);
    expect(json.amount_due_at_business_cents).toBe(0);
    expect(json.confirm_endpoint).toBe(`/api/c/${token}/confirm`);
    expect(piCreateMock).not.toHaveBeenCalled();

    // No inline status flip and no hold completion in this route anymore.
    expect(updateCalls.find((c) => c.table === 'bookings' && c.values.status === 'confirmed')).toBeUndefined();
    expect(updateCalls.find((c) => c.table === 'mcp_holds' && c.values.status === 'completed')).toBeUndefined();
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
      payment_mode: 'stripe_now',
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

    // PI id persisted to the booking row so ops can resolve the booking
    // from a Stripe PI id even if the webhook is delayed or lost.
    const piPersist = updateCalls.find(
      (c) => c.table === 'bookings' && c.values.stripe_payment_intent_id === 'pi_test_123',
    );
    expect(piPersist).toBeDefined();
    expect(piPersist?.filters.id).toBe('booking-1');
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
    customerLookup = { data: [{ id: 'cust-existing', created_at: '2024-01-01T00:00:00Z' }], error: null };
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

  it('Nail Studio repro: business without Stripe returns the in_person shape, not 503', async () => {
    // Reproduction case from the bug: paid service on a business without
    // Stripe Connect onboarding. Before this PR the route returned 503
    // (or a thrown 500); now it returns the in_person shape so the page
    // can collect a phone number and POST to /confirm.
    bookingResult = {
      data: baseBooking({
        businesses: {
          id: 'biz-1', name: 'The Nail Studio', stripe_account_id: null, stripe_charges_enabled: false,
        },
        services: { id: 'svc-1', name: 'Gel Manicure', price_cents: 4000 },
      }),
      error: null,
    };
    const token = await signHoldToken({
      hold_id: 'hold-1', booking_id: 'booking-1',
      business_id: 'biz-1', service_id: 'svc-1',
      expires_at: futureIso(5 * 60 * 1000),
    });
    const res = await callRoute(token, { email: 'a@b.com', name: 'Niamh' });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.payment_mode).toBe('in_person');
    expect(json.payment_required_now).toBe(false);
    expect(json.amount_due_at_business_eur).toBe(40);
    expect(piCreateMock).not.toHaveBeenCalled();
  });

  it('Evolv partial Stripe (acct id but charges disabled) routes to in_person', async () => {
    // Evolv Performance has a Stripe account id but charges are disabled.
    // Treated identically to "no Stripe at all".
    bookingResult = {
      data: baseBooking({
        businesses: {
          id: 'biz-1', name: 'Evolv Performance',
          stripe_account_id: 'acct_partial', stripe_charges_enabled: false,
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
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.payment_mode).toBe('in_person');
  });

  it('never returns 500: handler throws are caught and surfaced as 503', async () => {
    // Force a Supabase failure that bypasses all the inline checks. The
    // handler must catch and emit 503, not propagate a 500.
    bookingResult = {
      data: null,
      error: { message: 'simulated supabase outage' },
    };
    const token = await signHoldToken({
      hold_id: 'hold-1', booking_id: 'booking-1',
      business_id: 'biz-1', service_id: 'svc-1',
      expires_at: futureIso(5 * 60 * 1000),
    });
    const res = await callRoute(token, { email: 'a@b.com', name: 'Niamh' });
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBe('checkout_unavailable');
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
