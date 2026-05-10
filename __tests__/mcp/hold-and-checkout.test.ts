import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

beforeAll(() => {
  process.env.MCP_HOLD_SIGNING_KEY = 'a'.repeat(64);
  process.env.MCP_POLLING_TOKEN_KEY = 'b'.repeat(64);
  process.env.APP_DOMAIN = 'app.openbook.ie';
});

// Token mocks
const signHoldMock = vi.fn(async (_p: unknown) => 'HOLD.JWT');
const signPollMock = vi.fn(async (_p: unknown) => 'POLL.JWT');
vi.mock('../../lib/mcp/tokens', () => ({
  signHoldToken: (p: unknown) => signHoldMock(p),
  signPollingToken: (p: unknown) => signPollMock(p),
}));

// Supabase mock
type LookupResult = { data: unknown; error: unknown };
let businessResult: LookupResult = { data: null, error: null };
let serviceResult: LookupResult = { data: null, error: null };
let rpcAtomicResult: LookupResult = { data: [], error: null };
let rpcAvailabilityResult: LookupResult = { data: [], error: null };
const rpcCalls: Array<{ fn: string; params: Record<string, unknown> }> = [];

function buildChain(table: string): Record<string, unknown> {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  if (table === 'businesses') chain.maybeSingle = vi.fn(async () => businessResult);
  else if (table === 'services') chain.maybeSingle = vi.fn(async () => serviceResult);
  else chain.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
  return chain;
}

vi.mock('../../lib/supabase', () => ({
  supabaseAdmin: () => ({
    from: vi.fn((table: string) => buildChain(table)),
    rpc: vi.fn(async (fn: string, params: Record<string, unknown>) => {
      rpcCalls.push({ fn, params });
      if (fn === 'create_mcp_hold_atomically') return rpcAtomicResult;
      if (fn === 'get_availability_for_ai') return rpcAvailabilityResult;
      return { data: null, error: null };
    }),
  }),
}));

const { holdAndCheckoutHandler, humaniseDateTime } = await import(
  '../../app/api/mcp/tools/hold-and-checkout'
);

const ctx = { sourceAssistant: 'chatgpt', sourceIp: null, requestId: 'req-1' };

const businessFixture = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: '11111111-1111-1111-1111-111111111111',
  slug: 'evolv',
  name: 'Evolv',
  is_live: true,
  // Default fixture posture is "Stripe-onboarded business" so existing
  // paid happy-path tests continue to flow through stripe_now. Override
  // these per-test for in_person scenarios.
  stripe_account_id: 'acct_test_evolv',
  stripe_charges_enabled: true,
  ...overrides,
});

const serviceFixture = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: '22222222-2222-2222-2222-222222222222',
  name: 'PT Session',
  duration_minutes: 60,
  price_cents: 6000,
  is_active: true,
  ...overrides,
});

const futureIso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
const futureMcpStart = () => futureIso(2 * 60 * 60 * 1000); // +2h

beforeEach(() => {
  businessResult = { data: businessFixture(), error: null };
  serviceResult = { data: serviceFixture(), error: null };
  rpcAtomicResult = {
    data: [
      {
        hold_id: '33333333-3333-3333-3333-333333333333',
        booking_id: '44444444-4444-4444-4444-444444444444',
        conflict_reason: null,
      },
    ],
    error: null,
  };
  rpcAvailabilityResult = { data: [], error: null };
  rpcCalls.length = 0;
  signHoldMock.mockClear();
  signHoldMock.mockResolvedValue('HOLD.JWT');
  signPollMock.mockClear();
  signPollMock.mockResolvedValue('POLL.JWT');
});

describe('holdAndCheckoutHandler', () => {
  it('happy path: returns hold_id, polling_token, and checkout_url', async () => {
    const out = (await holdAndCheckoutHandler(
      { slug: 'evolv', service_id: serviceFixture().id, start_iso: futureMcpStart() },
      ctx,
    )) as Record<string, unknown>;
    expect(out.hold_id).toBe('33333333-3333-3333-3333-333333333333');
    expect(out.polling_token).toBe('POLL.JWT');
    expect(out.checkout_url).toMatch(/\/c\/HOLD\.JWT$/);
  });

  it('returns BUSINESS_NOT_FOUND for unknown slug', async () => {
    businessResult = { data: null, error: null };
    const out = (await holdAndCheckoutHandler(
      { slug: 'nope', service_id: serviceFixture().id, start_iso: futureMcpStart() },
      ctx,
    )) as { error?: { code: string } };
    expect(out.error?.code).toBe('BUSINESS_NOT_FOUND');
  });

  it('returns SERVICE_NOT_FOUND when service is missing or inactive', async () => {
    serviceResult = { data: null, error: null };
    const out = (await holdAndCheckoutHandler(
      { slug: 'evolv', service_id: serviceFixture().id, start_iso: futureMcpStart() },
      ctx,
    )) as { error?: { code: string } };
    expect(out.error?.code).toBe('SERVICE_NOT_FOUND');

    serviceResult = { data: serviceFixture({ is_active: false }), error: null };
    const out2 = (await holdAndCheckoutHandler(
      { slug: 'evolv', service_id: serviceFixture().id, start_iso: futureMcpStart() },
      ctx,
    )) as { error?: { code: string } };
    expect(out2.error?.code).toBe('SERVICE_NOT_FOUND');
  });

  it('returns SLOT_IN_PAST for a start_iso in the past', async () => {
    const out = (await holdAndCheckoutHandler(
      { slug: 'evolv', service_id: serviceFixture().id, start_iso: futureIso(-3600 * 1000) },
      ctx,
    )) as { error?: { code: string } };
    expect(out.error?.code).toBe('SLOT_IN_PAST');
  });

  it('returns SLOT_UNAVAILABLE with up to 3 alternatives on conflict', async () => {
    rpcAtomicResult = {
      data: [{ hold_id: null, booking_id: null, conflict_reason: 'SLOT_UNAVAILABLE' }],
      error: null,
    };
    rpcAvailabilityResult = {
      data: [
        { slot_start: futureIso(3 * 3600 * 1000), slot_end: futureIso(4 * 3600 * 1000) },
        { slot_start: futureIso(5 * 3600 * 1000), slot_end: futureIso(6 * 3600 * 1000) },
        { slot_start: futureIso(7 * 3600 * 1000), slot_end: futureIso(8 * 3600 * 1000) },
        { slot_start: futureIso(9 * 3600 * 1000), slot_end: futureIso(10 * 3600 * 1000) },
      ],
      error: null,
    };
    const out = (await holdAndCheckoutHandler(
      { slug: 'evolv', service_id: serviceFixture().id, start_iso: futureMcpStart() },
      ctx,
    )) as { error?: { code: string; alternatives?: unknown[] } };
    expect(out.error?.code).toBe('SLOT_UNAVAILABLE');
    expect(out.error?.alternatives).toHaveLength(3);
  });

  it('passes customer_hints into the rpc call', async () => {
    const hints = { name: 'Niamh', notes: 'knee injury, gentle please' };
    await holdAndCheckoutHandler(
      {
        slug: 'evolv',
        service_id: serviceFixture().id,
        start_iso: futureMcpStart(),
        customer_hints: hints,
      },
      ctx,
    );
    const call = rpcCalls.find((c) => c.fn === 'create_mcp_hold_atomically');
    expect(call?.params.p_customer_hints).toEqual(hints);
  });

  it('is_free=true when price_cents=0; false otherwise', async () => {
    // Free service at a Stripe-onboarded business still resolves to
    // payment_mode=in_person (Stripe rejects PaymentIntents under
    // 0.50 EUR), so the next_step copy is the in_person free variant.
    serviceResult = { data: serviceFixture({ price_cents: 0 }), error: null };
    const free = (await holdAndCheckoutHandler(
      { slug: 'evolv', service_id: serviceFixture().id, start_iso: futureMcpStart() },
      ctx,
    )) as { summary: { is_free: boolean }; next_step_for_user: string };
    expect(free.summary.is_free).toBe(true);
    expect(free.next_step_for_user).toBe('Tap the link to confirm; held for ten minutes.');

    serviceResult = { data: serviceFixture({ price_cents: 6000 }), error: null };
    const paid = (await holdAndCheckoutHandler(
      { slug: 'evolv', service_id: serviceFixture().id, start_iso: futureMcpStart() },
      ctx,
    )) as { summary: { is_free: boolean }; next_step_for_user: string };
    expect(paid.summary.is_free).toBe(false);
    expect(paid.next_step_for_user).toBe('Tap the link to confirm and pay; held for ten minutes.');
  });

  it('signs both tokens with their respective signers', async () => {
    await holdAndCheckoutHandler(
      { slug: 'evolv', service_id: serviceFixture().id, start_iso: futureMcpStart() },
      ctx,
    );
    expect(signHoldMock).toHaveBeenCalledTimes(1);
    expect(signPollMock).toHaveBeenCalledTimes(1);
    const holdPayload = (signHoldMock.mock.calls[0] as unknown as [Record<string, string>])[0];
    expect(holdPayload.hold_id).toBe('33333333-3333-3333-3333-333333333333');
    expect(holdPayload.business_id).toBe('11111111-1111-1111-1111-111111111111');
  });

  it('returns RESPONSE_VALIDATION_FAILED on malformed rpc result', async () => {
    rpcAtomicResult = {
      data: [{ hold_id: 'not-a-uuid', booking_id: 'also-not-a-uuid', conflict_reason: null }],
      error: null,
    };
    const out = (await holdAndCheckoutHandler(
      { slug: 'evolv', service_id: serviceFixture().id, start_iso: futureMcpStart() },
      ctx,
    )) as { error?: { code: string } };
    expect(out.error?.code).toBe('RESPONSE_VALIDATION_FAILED');
  });
});

describe('hold_and_checkout payment_mode surface', () => {
  it("returns payment_mode='stripe_now' and pay-now copy for a paid service at a Stripe-onboarded business", async () => {
    businessResult = {
      data: businessFixture({
        stripe_account_id: 'acct_dublin_iron_gym',
        stripe_charges_enabled: true,
      }),
      error: null,
    };
    serviceResult = { data: serviceFixture({ price_cents: 6500 }), error: null };

    const out = (await holdAndCheckoutHandler(
      { slug: 'evolv', service_id: serviceFixture().id, start_iso: futureMcpStart() },
      ctx,
    )) as { summary: { payment_mode: string }; next_step_for_user: string };

    expect(out.summary.payment_mode).toBe('stripe_now');
    expect(out.next_step_for_user).toBe('Tap the link to confirm and pay; held for ten minutes.');
  });

  it("returns payment_mode='in_person' and pay-on-the-day copy for a paid service at a non-onboarded business", async () => {
    // Reproduction of the Nail Studio bug from PR #145. €40 service,
    // business has no Stripe Connect onboarding.
    businessResult = {
      data: businessFixture({
        name: 'The Nail Studio',
        slug: 'the-nail-studio',
        stripe_account_id: null,
        stripe_charges_enabled: false,
      }),
      error: null,
    };
    serviceResult = {
      data: serviceFixture({ name: 'Gel Manicure', price_cents: 4000 }),
      error: null,
    };

    const out = (await holdAndCheckoutHandler(
      { slug: 'the-nail-studio', service_id: serviceFixture().id, start_iso: futureMcpStart() },
      ctx,
    )) as { summary: { payment_mode: string }; next_step_for_user: string };

    expect(out.summary.payment_mode).toBe('in_person');
    expect(out.next_step_for_user).toBe(
      "Tap the link to confirm. You'll pay €40 at The Nail Studio on the day; held for ten minutes.",
    );
  });

  it("returns payment_mode='in_person' and free-confirm copy for a free service regardless of Stripe state", async () => {
    // Stripe-onboarded business with a free service. Stripe rejects
    // PaymentIntents under 0.50 EUR so getPaymentMode short-circuits
    // free services to in_person regardless of the business state.
    businessResult = {
      data: businessFixture({
        name: 'Evolv Performance',
        stripe_account_id: 'acct_evolv',
        stripe_charges_enabled: true,
      }),
      error: null,
    };
    serviceResult = {
      data: serviceFixture({ name: 'Free Consultation', price_cents: 0 }),
      error: null,
    };

    const out = (await holdAndCheckoutHandler(
      { slug: 'evolv', service_id: serviceFixture().id, start_iso: futureMcpStart() },
      ctx,
    )) as { summary: { payment_mode: string }; next_step_for_user: string };

    expect(out.summary.payment_mode).toBe('in_person');
    expect(out.next_step_for_user).toBe('Tap the link to confirm; held for ten minutes.');
  });
});

describe('humaniseDateTime', () => {
  it('formats today / tomorrow / named days', () => {
    const now = new Date('2026-05-12T13:00:00Z'); // Tue 14:00 IST
    const todayEvening = new Date('2026-05-12T18:00:00Z'); // Tue 19:00 IST
    const tomorrowMorning = new Date('2026-05-13T08:00:00Z'); // Wed 09:00 IST
    const fridayLater = new Date('2026-05-15T18:00:00Z'); // Fri 19:00 IST

    expect(humaniseDateTime(todayEvening, now)).toMatch(/^today at /);
    expect(humaniseDateTime(tomorrowMorning, now)).toMatch(/^tomorrow at /);
    expect(humaniseDateTime(fridayLater, now)).toMatch(/^Friday at /);
    // half past / quarter past variants
    const halfPast = new Date('2026-05-15T20:30:00Z'); // 21:30 IST
    expect(humaniseDateTime(halfPast, now)).toMatch(/half past nine in the evening/);
    const quarterPast = new Date('2026-05-15T07:15:00Z'); // 08:15 IST
    expect(humaniseDateTime(quarterPast, now)).toMatch(/quarter past eight in the morning/);
  });
});
