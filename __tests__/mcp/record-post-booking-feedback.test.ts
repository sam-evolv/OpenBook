import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────
type LookupResult = { data: unknown; error: unknown };
let bookingResult: LookupResult = { data: null, error: null };
let upsertResult: LookupResult = { data: null, error: null };
const upsertCalls: Array<{ table: string; values: Record<string, unknown>; options?: Record<string, unknown> }> = [];
const updateCalls: Array<{ table: string; values: Record<string, unknown>; filters: Record<string, unknown> }> = [];

function buildSelectChain(table: string): Record<string, unknown> {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => {
    if (table === 'bookings') return bookingResult;
    return { data: null, error: null };
  });
  return chain;
}

function buildUpsertChain(table: string, values: Record<string, unknown>, options?: Record<string, unknown>): Record<string, unknown> {
  upsertCalls.push({ table, values, options });
  const chain: Record<string, unknown> = {};
  (chain as { then: (r: (v: LookupResult) => void) => void }).then = (resolve) => {
    if (table === 'booking_feedback') resolve(upsertResult);
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
  chain.is = vi.fn((col: string, val: unknown) => {
    filters[`${col}__is`] = val;
    return chain;
  });
  (chain as { then: (r: (v: LookupResult) => void) => void }).then = (resolve) => {
    updateCalls.push({ table, values, filters });
    resolve({ data: null, error: null });
  };
  return chain;
}

vi.mock('../../lib/supabase', () => ({
  supabaseAdmin: () => ({
    from: vi.fn((table: string) => ({
      select: vi.fn(() => buildSelectChain(table)),
      upsert: vi.fn((values: Record<string, unknown>, options?: Record<string, unknown>) =>
        buildUpsertChain(table, values, options),
      ),
      update: vi.fn((values: Record<string, unknown>) => buildUpdateChain(table, values)),
    })),
  }),
}));

const { recordPostBookingFeedbackHandler } = await import(
  '../../app/api/mcp/tools/record-post-booking-feedback'
);

const ctx = { sourceAssistant: 'chatgpt', sourceIp: null, requestId: 'req-1' };

const BOOKING_ID = '11111111-1111-1111-1111-111111111111';

const baseBooking = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: BOOKING_ID,
  status: 'confirmed',
  source: 'mcp',
  customer_id: 'cust-1',
  business_id: 'biz-1',
  outcome: null,
  starts_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  businesses: { id: 'biz-1', name: 'Evolv' },
  ...overrides,
});

beforeEach(() => {
  bookingResult = { data: baseBooking(), error: null };
  upsertResult = { data: null, error: null };
  upsertCalls.length = 0;
  updateCalls.length = 0;
});

describe('record_post_booking_feedback — happy paths', () => {
  it('high rating + verbatim + showed_up=true: acknowledged with warm message and outcome=completed', async () => {
    const out = (await recordPostBookingFeedbackHandler(
      {
        booking_id: BOOKING_ID,
        inferred_rating: 5,
        verbatim: 'Sam was great',
        showed_up: true,
        would_rebook: true,
      },
      ctx,
    )) as Record<string, unknown>;

    expect(out.acknowledged).toBe(true);
    expect(out.thanks_message).toBe('Thanks — passed that along to Evolv.');

    // Upsert keyed on booking_id with onConflict.
    const upsert = upsertCalls.find((c) => c.table === 'booking_feedback');
    expect(upsert?.values.booking_id).toBe(BOOKING_ID);
    expect(upsert?.values.inferred_rating).toBe(5);
    expect(upsert?.values.would_rebook).toBe(true);
    expect(upsert?.options?.onConflict).toBe('booking_id');

    // Outcome backfilled to completed via guarded UPDATE.
    const outcomeUpdate = updateCalls.find(
      (c) => c.table === 'bookings' && c.values.outcome === 'completed',
    );
    expect(outcomeUpdate).toBeDefined();
    expect(outcomeUpdate?.filters.outcome__is).toBeNull();
  });

  it('low rating: uses honest-feedback variant (not the warm one)', async () => {
    const out = (await recordPostBookingFeedbackHandler(
      { booking_id: BOOKING_ID, inferred_rating: 2 },
      ctx,
    )) as Record<string, unknown>;
    expect(out.thanks_message).toBe('Thanks for the honest feedback. I have noted it.');
    expect(String(out.thanks_message)).not.toMatch(/Evolv/);
  });

  it('verbatim-only (no rating): uses recorded variant', async () => {
    const out = (await recordPostBookingFeedbackHandler(
      { booking_id: BOOKING_ID, verbatim: 'It was fine' },
      ctx,
    )) as Record<string, unknown>;
    expect(out.thanks_message).toBe('Thanks — I have recorded that for you.');
  });

  it('default: no rating, no verbatim, just showed_up=true', async () => {
    const out = (await recordPostBookingFeedbackHandler(
      { booking_id: BOOKING_ID, showed_up: true },
      ctx,
    )) as Record<string, unknown>;
    expect(out.thanks_message).toBe('Thanks for letting me know.');
  });

  it('all thanks_message variants are <= 12 words', () => {
    const variants = [
      'Thanks — passed that along to Evolv.',
      'Thanks for the honest feedback. I have noted it.',
      'Thanks — I have recorded that for you.',
      'Thanks for letting me know.',
    ];
    for (const v of variants) {
      const wordCount = v.split(/\s+/).filter(Boolean).length;
      expect(wordCount).toBeLessThanOrEqual(12);
    }
  });
});

describe('record_post_booking_feedback — outcome backfill', () => {
  it('showed_up=false sets outcome=no_show via guarded UPDATE (only when null)', async () => {
    await recordPostBookingFeedbackHandler(
      { booking_id: BOOKING_ID, showed_up: false },
      ctx,
    );
    const update = updateCalls.find(
      (c) => c.table === 'bookings' && c.values.outcome === 'no_show',
    );
    expect(update).toBeDefined();
    expect(update?.filters.id).toBe(BOOKING_ID);
    // Critical: the .is('outcome', null) filter — never overwrite an existing outcome.
    expect(update?.filters.outcome__is).toBeNull();
  });

  it('does not backfill outcome when showed_up is omitted', async () => {
    await recordPostBookingFeedbackHandler(
      { booking_id: BOOKING_ID, inferred_rating: 4 },
      ctx,
    );
    expect(updateCalls.find((c) => c.table === 'bookings' && c.values.outcome !== undefined)).toBeUndefined();
  });
});

describe('record_post_booking_feedback — re-submission', () => {
  it('uses upsert with onConflict=booking_id so revisions overwrite cleanly', async () => {
    // First submission.
    await recordPostBookingFeedbackHandler(
      { booking_id: BOOKING_ID, inferred_rating: 4 },
      ctx,
    );
    // Second submission — assistant revises rating up.
    await recordPostBookingFeedbackHandler(
      { booking_id: BOOKING_ID, inferred_rating: 5 },
      ctx,
    );

    const upserts = upsertCalls.filter((c) => c.table === 'booking_feedback');
    expect(upserts).toHaveLength(2);
    for (const u of upserts) {
      expect(u.options?.onConflict).toBe('booking_id');
    }
    expect(upserts[0].values.inferred_rating).toBe(4);
    expect(upserts[1].values.inferred_rating).toBe(5);
  });
});

describe('record_post_booking_feedback — guards', () => {
  it('BOOKING_NOT_FOUND when the booking row is missing', async () => {
    bookingResult = { data: null, error: null };
    const out = (await recordPostBookingFeedbackHandler(
      { booking_id: BOOKING_ID, inferred_rating: 4 },
      ctx,
    )) as { error: { code: string } };
    expect(out.error.code).toBe('BOOKING_NOT_FOUND');
  });

  it('BOOKING_NOT_FINALISED when status=pending_payment (or any in-flight state)', async () => {
    bookingResult = { data: baseBooking({ status: 'pending_payment' }), error: null };
    const out = (await recordPostBookingFeedbackHandler(
      { booking_id: BOOKING_ID, inferred_rating: 5 },
      ctx,
    )) as { error: { code: string } };
    expect(out.error.code).toBe('BOOKING_NOT_FINALISED');
  });

  it('BOOKING_NOT_FINALISED for awaiting_payment too (mid-Stripe)', async () => {
    bookingResult = { data: baseBooking({ status: 'awaiting_payment' }), error: null };
    const out = (await recordPostBookingFeedbackHandler(
      { booking_id: BOOKING_ID, inferred_rating: 5 },
      ctx,
    )) as { error: { code: string } };
    expect(out.error.code).toBe('BOOKING_NOT_FINALISED');
  });

  it('cancelled bookings ARE allowed (user can leave feedback after cancelling)', async () => {
    bookingResult = { data: baseBooking({ status: 'cancelled' }), error: null };
    const out = (await recordPostBookingFeedbackHandler(
      { booking_id: BOOKING_ID, would_rebook: false },
      ctx,
    )) as Record<string, unknown>;
    expect(out.acknowledged).toBe(true);
  });
});
