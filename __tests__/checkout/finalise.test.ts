import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

beforeAll(() => {
  process.env.MCP_HOLD_SIGNING_KEY = 'a'.repeat(64);
  process.env.MCP_POLLING_TOKEN_KEY = 'b'.repeat(64);
});

// ── Booking row state across poll iterations
let bookingRow: { id: string; status: string; starts_at: string; ends_at: string } | null = {
  id: 'booking-1',
  status: 'awaiting_payment',
  starts_at: '2026-05-12T18:00:00Z',
  ends_at: '2026-05-12T19:00:00Z',
};
let pollIndex = 0;
const bookingSequence: Array<typeof bookingRow> = [];
const updateCalls: Array<{ table: string; values: Record<string, unknown> }> = [];

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: () => ({
    from: vi.fn((table: string) => {
      const chain: Record<string, unknown> = {};
      chain.select = vi.fn(() => chain);
      chain.eq = vi.fn(() => chain);
      chain.maybeSingle = vi.fn(async () => {
        const next = bookingSequence.length > pollIndex ? bookingSequence[pollIndex] : bookingRow;
        pollIndex += 1;
        return { data: next, error: null };
      });
      chain.update = vi.fn((values: Record<string, unknown>) => {
        updateCalls.push({ table, values });
        return chain;
      });
      return chain;
    }),
  }),
}));

const piRetrieveMock = vi.fn(async (_id: string) => ({
  id: 'pi_test_123',
  status: 'succeeded',
  metadata: { booking_id: 'booking-1' },
}));
vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({ paymentIntents: { retrieve: piRetrieveMock } }),
}));

const { signHoldToken } = await import('../../lib/mcp/tokens');
const { POST } = await import('../../app/api/c/[token]/finalise/route');

const futureIso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

async function callRoute(token: string, body: Record<string, unknown> = {}) {
  const req = new Request(`http://localhost/api/c/${token}/finalise`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return POST(req as unknown as import('next/server').NextRequest, { params: { token } });
}

beforeEach(() => {
  bookingRow = { id: 'booking-1', status: 'awaiting_payment', starts_at: '2026-05-12T18:00:00Z', ends_at: '2026-05-12T19:00:00Z' };
  bookingSequence.length = 0;
  pollIndex = 0;
  piRetrieveMock.mockClear();
  piRetrieveMock.mockResolvedValue({ id: 'pi_test_123', status: 'succeeded', metadata: { booking_id: 'booking-1' } });
  updateCalls.length = 0;
});

describe('POST /api/c/[token]/finalise', () => {
  it('rejects an invalid token with 401', async () => {
    const res = await callRoute('not.a.token', {});
    expect(res.status).toBe(401);
  });

  it('returns confirmed=true when the webhook has already flipped the row', async () => {
    bookingRow = { id: 'booking-1', status: 'confirmed', starts_at: '2026-05-12T18:00:00Z', ends_at: '2026-05-12T19:00:00Z' };
    const token = await signHoldToken({
      hold_id: 'hold-1', booking_id: 'booking-1',
      business_id: 'biz-1', service_id: 'svc-1',
      expires_at: futureIso(5 * 60 * 1000),
    });
    const res = await callRoute(token, { payment_intent_id: 'pi_test_123' });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.confirmed).toBe(true);
    expect(json.booking_id).toBe('booking-1');
  });

  it('does NOT write to bookings under any path', async () => {
    bookingRow = { id: 'booking-1', status: 'confirmed', starts_at: 'x', ends_at: 'y' };
    const token = await signHoldToken({
      hold_id: 'hold-1', booking_id: 'booking-1',
      business_id: 'biz-1', service_id: 'svc-1',
      expires_at: futureIso(5 * 60 * 1000),
    });
    await callRoute(token, { payment_intent_id: 'pi_test_123' });
    expect(updateCalls.length).toBe(0);
  });

  it('returns confirmed=false, pending=true when the webhook is delayed past the polling window', async () => {
    bookingRow = { id: 'booking-1', status: 'awaiting_payment', starts_at: 'x', ends_at: 'y' };
    const token = await signHoldToken({
      hold_id: 'hold-1', booking_id: 'booking-1',
      business_id: 'biz-1', service_id: 'svc-1',
      expires_at: futureIso(5 * 60 * 1000),
    });
    const res = await callRoute(token, { payment_intent_id: 'pi_test_123' });
    const json = await res.json();
    expect(json.confirmed).toBe(false);
    expect(json.pending).toBe(true);
  }, 10_000);

  it('returns payment_failed when the PaymentIntent did not succeed', async () => {
    piRetrieveMock.mockResolvedValueOnce({
      id: 'pi_test_123', status: 'requires_payment_method', metadata: { booking_id: 'booking-1' },
    });
    const token = await signHoldToken({
      hold_id: 'hold-1', booking_id: 'booking-1',
      business_id: 'biz-1', service_id: 'svc-1',
      expires_at: futureIso(5 * 60 * 1000),
    });
    const res = await callRoute(token, { payment_intent_id: 'pi_test_123' });
    const json = await res.json();
    expect(json.confirmed).toBe(false);
    expect(json.payment_failed).toBe(true);
  });

  it('rejects a PaymentIntent whose metadata.booking_id does not match the token', async () => {
    piRetrieveMock.mockResolvedValueOnce({
      id: 'pi_test_123', status: 'succeeded', metadata: { booking_id: 'different-booking' },
    });
    const token = await signHoldToken({
      hold_id: 'hold-1', booking_id: 'booking-1',
      business_id: 'biz-1', service_id: 'svc-1',
      expires_at: futureIso(5 * 60 * 1000),
    });
    const res = await callRoute(token, { payment_intent_id: 'pi_test_123' });
    expect(res.status).toBe(400);
  });

  it('confirms the row that lands mid-poll (webhook arrives after 1 retry)', async () => {
    // First read: still awaiting_payment. Second read: confirmed.
    bookingSequence.push(
      { id: 'booking-1', status: 'awaiting_payment', starts_at: 'x', ends_at: 'y' },
      { id: 'booking-1', status: 'confirmed', starts_at: 'x', ends_at: 'y' },
    );
    const token = await signHoldToken({
      hold_id: 'hold-1', booking_id: 'booking-1',
      business_id: 'biz-1', service_id: 'svc-1',
      expires_at: futureIso(5 * 60 * 1000),
    });
    const res = await callRoute(token, { payment_intent_id: 'pi_test_123' });
    const json = await res.json();
    expect(json.confirmed).toBe(true);
  });
});
