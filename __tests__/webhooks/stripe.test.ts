import { beforeEach, describe, expect, it, vi } from 'vitest';

// State threaded through the mocked Supabase chain. Each test resets
// `bookingUpdateResult` to control what the guarded UPDATE returns and
// inspects `updateCalls` to assert the actual filters and values used.
type LookupResult = { data: unknown; error: unknown };
let bookingUpdateResult: LookupResult = { data: null, error: null };
let stripeEventInsertResult: LookupResult = { data: null, error: null };
const updateCalls: Array<{
  table: string;
  values: Record<string, unknown>;
  filters: Record<string, unknown>;
  selected?: string;
}> = [];

function buildUpdateChain(
  table: string,
  values: Record<string, unknown>,
): Record<string, unknown> {
  const filters: Record<string, unknown> = {};
  let selected: string | undefined;
  const chain: Record<string, unknown> = {};
  chain.eq = vi.fn((col: string, val: unknown) => {
    filters[col] = val;
    return chain;
  });
  chain.select = vi.fn((cols: string) => {
    selected = cols;
    return chain;
  });
  chain.maybeSingle = vi.fn(async () => {
    updateCalls.push({ table, values, filters, selected });
    if (table === 'bookings') return bookingUpdateResult;
    return { data: null, error: null };
  });
  // Some updates are awaited directly without .select().maybeSingle().
  (chain as { then: (r: (v: unknown) => void) => void }).then = (
    resolve: (v: unknown) => void,
  ) => {
    updateCalls.push({ table, values, filters, selected });
    resolve({ data: null, error: null });
  };
  return chain;
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: () => ({
    from: vi.fn((table: string) => ({
      insert: vi.fn(async () => {
        if (table === 'stripe_events') return stripeEventInsertResult;
        return { data: null, error: null };
      }),
      update: vi.fn((values: Record<string, unknown>) =>
        buildUpdateChain(table, values),
      ),
    })),
  }),
}));

// Webhook signature verification is hard to forge in a unit test without
// stubbing the Stripe SDK; mock constructEvent to return whatever the test
// fixture supplies, sidestepping signature math.
let nextEvent: unknown = null;
vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    webhooks: {
      constructEvent: vi.fn(() => nextEvent),
    },
  }),
}));

const sendEmailMock = vi.fn(async (..._args: unknown[]) => ({ id: 'msg_1' }));
vi.mock('@/lib/email', () => ({
  sendBookingConfirmation: sendEmailMock,
}));

const ORIGINAL_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

const { POST } = await import('../../app/api/webhooks/stripe/route');

beforeEach(() => {
  bookingUpdateResult = { data: null, error: null };
  stripeEventInsertResult = { data: null, error: null };
  updateCalls.length = 0;
  sendEmailMock.mockClear();
  nextEvent = null;
});

function callWebhook(): Promise<Response> {
  const req = new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': 't=1,v1=fake',
    },
    body: '{}',
  });
  return POST(req as unknown as import('next/server').NextRequest);
}

describe('POST /api/webhooks/stripe — payment_intent.succeeded', () => {
  it('flips the booking to confirmed and persists stripe_payment_intent_id', async () => {
    nextEvent = {
      id: 'evt_pi_succeeded_1',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test_777',
          metadata: { booking_id: 'booking-pi-1' },
          receipt_email: 'a@b.com',
          latest_charge: null,
        },
      },
    };
    bookingUpdateResult = {
      data: { id: 'booking-pi-1', customer_id: 'cust-1' },
      error: null,
    };

    const res = await callWebhook();
    expect(res.status).toBe(200);

    // Guarded UPDATE: scoped to the booking, only flips when the row is
    // currently in awaiting_payment, writes both status and PI id.
    const flip = updateCalls.find(
      (c) =>
        c.table === 'bookings' &&
        c.values.status === 'confirmed' &&
        c.values.stripe_payment_intent_id === 'pi_test_777',
    );
    expect(flip).toBeDefined();
    expect(flip?.filters.id).toBe('booking-pi-1');
    expect(flip?.filters.status).toBe('awaiting_payment');
  });

  it('is a no-op when the guarded UPDATE matches no row (replay / late delivery)', async () => {
    nextEvent = {
      id: 'evt_pi_succeeded_2',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test_888',
          metadata: { booking_id: 'booking-pi-2' },
          receipt_email: null,
          latest_charge: null,
        },
      },
    };
    // Simulate the row already being confirmed: guarded UPDATE returns null.
    bookingUpdateResult = { data: null, error: null };

    const res = await callWebhook();
    expect(res.status).toBe(200);

    // No confirmation emails sent when no row was flipped.
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});
