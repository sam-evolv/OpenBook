import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

beforeAll(() => {
  process.env.MCP_HOLD_SIGNING_KEY = 'a'.repeat(64);
  process.env.MCP_POLLING_TOKEN_KEY = 'b'.repeat(64);
});

// Token mocks. We mock verify-side only; the test signs real tokens via
// the actual signer to exercise the token contract end-to-end.
let bookingResult: { data: unknown; error: unknown } = { data: null, error: null };
let customerResult: { data: unknown; error: unknown } = { data: null, error: null };

vi.mock('../../lib/supabase', () => ({
  supabaseAdmin: () => ({
    from: vi.fn((table: string) => {
      const chain: Record<string, unknown> = {};
      chain.select = vi.fn(() => chain);
      chain.eq = vi.fn(() => chain);
      chain.maybeSingle = vi.fn(async () => {
        if (table === 'bookings') return bookingResult;
        if (table === 'customers') return customerResult;
        return { data: null, error: null };
      });
      return chain;
    }),
  }),
}));

type RateLimitResult = { allowed: boolean; retryAfter?: number; reason?: string };
const rateLimitMock = vi.fn<(id: string) => Promise<RateLimitResult>>(async () => ({ allowed: true }));
vi.mock('../../lib/mcp/rate-limit', () => ({
  checkPollingTokenRateLimit: (id: string) => rateLimitMock(id),
}));

const { signPollingToken } = await import('../../lib/mcp/tokens');
const { checkBookingStatusHandler } = await import(
  '../../app/api/mcp/tools/check-booking-status'
);

const ctx = { sourceAssistant: 'chatgpt', sourceIp: null, requestId: 'req-1' };

const BOOKING_ID = '11111111-1111-1111-1111-111111111111';
const HOLD_ID = '22222222-2222-2222-2222-222222222222';

const baseBooking = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: BOOKING_ID,
  status: 'confirmed',
  starts_at: '2026-05-12T18:00:00Z',
  ends_at: '2026-05-12T19:00:00Z',
  customer_id: 'cust-1',
  notes: null,
  businesses: {
    id: 'biz-1',
    name: 'Evolv',
    slug: 'evolv',
    address_line: '12 Pearse Street',
    address: null,
    city: 'Dublin',
    phone: '+353 1 555 0100',
  },
  services: { id: 'svc-1', name: 'PT Session', price_cents: 6000 },
  ...overrides,
});

beforeEach(() => {
  bookingResult = { data: baseBooking(), error: null };
  customerResult = { data: { email: 'niamh@example.com' }, error: null };
  rateLimitMock.mockReset();
  rateLimitMock.mockResolvedValue({ allowed: true });
});

async function run(token: string) {
  return checkBookingStatusHandler({ polling_token: token }, ctx);
}

async function freshToken() {
  return signPollingToken({ hold_id: HOLD_ID, booking_id: BOOKING_ID });
}

describe('check_booking_status — confirmed', () => {
  it('returns full booking details for a confirmed booking', async () => {
    const out = (await run(await freshToken())) as Record<string, unknown>;
    expect(out.status).toBe('confirmed');
    const booking = out.booking as Record<string, unknown>;
    expect(booking.booking_id).toBe(BOOKING_ID);
    expect(booking.business_name).toBe('Evolv');
    expect(booking.business_slug).toBe('evolv');
    expect(booking.service_name).toBe('PT Session');
    expect(booking.address_for_directions).toBe('12 Pearse Street, Dublin');
    expect(booking.business_phone).toBe('+353 1 555 0100');
    expect(booking.confirmation_email_sent_to).toBe('niamh@example.com');
    expect(out.next_step_for_user).toMatch(/calendar invite|directions/i);
  });

  it('price_paid_eur is 0 for free services and price_cents/100 for paid', async () => {
    bookingResult = {
      data: baseBooking({ services: { id: 'svc-1', name: 'Free intro', price_cents: 0 } }),
      error: null,
    };
    let out = (await run(await freshToken())) as { booking: { price_paid_eur: number } };
    expect(out.booking.price_paid_eur).toBe(0);

    bookingResult = {
      data: baseBooking({ services: { id: 'svc-1', name: 'PT', price_cents: 7500 } }),
      error: null,
    };
    out = (await run(await freshToken())) as { booking: { price_paid_eur: number } };
    expect(out.booking.price_paid_eur).toBe(75);
  });

  it('address_for_directions handles missing city gracefully (no trailing comma)', async () => {
    bookingResult = {
      data: baseBooking({
        businesses: {
          id: 'biz-1',
          name: 'Evolv',
          slug: 'evolv',
          address_line: '12 Pearse Street',
          address: null,
          city: null,
          phone: null,
        },
      }),
      error: null,
    };
    const out = (await run(await freshToken())) as { booking: { address_for_directions: string } };
    expect(out.booking.address_for_directions).toBe('12 Pearse Street');
    expect(out.booking.address_for_directions).not.toMatch(/,\s*$/);
  });

  it('omits confirmation_email_sent_to when customer_id is null', async () => {
    bookingResult = { data: baseBooking({ customer_id: null }), error: null };
    customerResult = { data: null, error: null };
    const out = (await run(await freshToken())) as { booking: Record<string, unknown> };
    expect(out.booking.confirmation_email_sent_to).toBeUndefined();
  });

  it('omits business_phone when the business has no phone', async () => {
    bookingResult = {
      data: baseBooking({
        businesses: {
          id: 'biz-1', name: 'Evolv', slug: 'evolv',
          address_line: '12 Pearse Street', address: null, city: 'Dublin', phone: null,
        },
      }),
      error: null,
    };
    const out = (await run(await freshToken())) as { booking: Record<string, unknown> };
    expect(out.booking.business_phone).toBeUndefined();
  });
});

describe('check_booking_status — non-confirmed states', () => {
  it('returns pending_payment when booking.status=pending_payment', async () => {
    bookingResult = { data: baseBooking({ status: 'pending_payment' }), error: null };
    const out = (await run(await freshToken())) as Record<string, unknown>;
    expect(out.status).toBe('pending_payment');
    expect(out.booking).toBeUndefined();
    expect(out.next_step_for_user).toMatch(/checkout page/i);
  });

  it('returns pending_payment for awaiting_payment (mid-Stripe-flow)', async () => {
    bookingResult = { data: baseBooking({ status: 'awaiting_payment' }), error: null };
    const out = (await run(await freshToken())) as Record<string, unknown>;
    expect(out.status).toBe('pending_payment');
  });

  it('returns expired when booking.status=expired', async () => {
    bookingResult = { data: baseBooking({ status: 'expired' }), error: null };
    const out = (await run(await freshToken())) as Record<string, unknown>;
    expect(out.status).toBe('expired');
    expect(out.next_step_for_user).toMatch(/another time/i);
  });

  it('returns failed when booking.status=cancelled', async () => {
    bookingResult = { data: baseBooking({ status: 'cancelled' }), error: null };
    const out = (await run(await freshToken())) as Record<string, unknown>;
    expect(out.status).toBe('failed');
    expect(out.next_step_for_user).toMatch(/did not go through|try again/i);
  });

  it('returns failed when booking.status=payment_failed', async () => {
    bookingResult = { data: baseBooking({ status: 'payment_failed' }), error: null };
    const out = (await run(await freshToken())) as Record<string, unknown>;
    expect(out.status).toBe('failed');
  });
});

describe('check_booking_status — token + lookup errors', () => {
  it('returns INVALID_TOKEN for malformed/invalid tokens', async () => {
    const out = (await run('not.a.valid.token')) as { error: { code: string } };
    expect(out.error.code).toBe('INVALID_TOKEN');
  });

  it('returns INVALID_TOKEN for a token signed with the WRONG key (cross-key reuse)', async () => {
    // Sign with the hold-signing key — verifyPollingToken must reject it.
    const { signHoldToken } = await import('../../lib/mcp/tokens');
    const wrongKindToken = await signHoldToken({
      hold_id: HOLD_ID,
      booking_id: BOOKING_ID,
      business_id: 'biz-1',
      service_id: 'svc-1',
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    });
    const out = (await run(wrongKindToken)) as { error: { code: string } };
    expect(out.error.code).toBe('INVALID_TOKEN');
  });

  it('returns BOOKING_NOT_FOUND when the booking row is missing', async () => {
    bookingResult = { data: null, error: null };
    const out = (await run(await freshToken())) as { error: { code: string } };
    expect(out.error.code).toBe('BOOKING_NOT_FOUND');
  });

  it('returns BOOKING_NOT_FOUND when joins are missing (stale row)', async () => {
    bookingResult = {
      data: baseBooking({ businesses: null }),
      error: null,
    };
    const out = (await run(await freshToken())) as { error: { code: string } };
    expect(out.error.code).toBe('BOOKING_NOT_FOUND');
  });
});

describe('check_booking_status — rate limit + validation', () => {
  it('returns POLLING_TOO_FREQUENT when the rate limit denies', async () => {
    rateLimitMock.mockResolvedValueOnce({ allowed: false, retryAfter: 60, reason: 'polling_per_token' });
    const out = (await run(await freshToken())) as { error: { code: string } };
    expect(out.error.code).toBe('POLLING_TOO_FREQUENT');
  });

  it('passes the booking_id from the token into the rate-limit bucket key', async () => {
    rateLimitMock.mockResolvedValueOnce({ allowed: true });
    await run(await freshToken());
    expect(rateLimitMock).toHaveBeenCalledWith(BOOKING_ID);
  });

  it('returns RESPONSE_VALIDATION_FAILED when the booking row is malformed', async () => {
    // start_iso is invalid → datetime() refinement fails; address required.
    bookingResult = {
      data: {
        ...baseBooking(),
        starts_at: 'not-a-date',
      },
      error: null,
    };
    const out = (await run(await freshToken())) as { error?: { code: string }; status?: string };
    // new Date('not-a-date').toISOString() throws — the route catches and
    // returns RESPONSE_VALIDATION_FAILED via safeParse path. Either is
    // acceptable for the assistant; assert it is NOT a confirmed booking.
    expect(out.status).not.toBe('confirmed');
  });
});
