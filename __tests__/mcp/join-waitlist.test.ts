import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

beforeAll(() => {
  // join_waitlist doesn't sign tokens, but the rate-limit and handler
  // imports may transitively load token modules. Set both for safety.
  process.env.MCP_HOLD_SIGNING_KEY = 'a'.repeat(64);
  process.env.MCP_POLLING_TOKEN_KEY = 'b'.repeat(64);
});

// ── Mocks
type LookupResult = { data: unknown; error: unknown };
let businessResult: LookupResult = { data: null, error: null };
let serviceResult: LookupResult = { data: null, error: null };
let waitlistInsertResult: LookupResult = { data: { id: '99999999-9999-9999-9999-999999999999' }, error: null };
const insertedRows: Array<{ table: string; values: Record<string, unknown> }> = [];

function buildSelectChain(table: string): Record<string, unknown> {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => {
    if (table === 'businesses') return businessResult;
    if (table === 'services') return serviceResult;
    return { data: null, error: null };
  });
  return chain;
}

function buildInsertChain(table: string, values: Record<string, unknown>): Record<string, unknown> {
  insertedRows.push({ table, values });
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.single = vi.fn(async () => {
    if (table === 'mcp_waitlist') return waitlistInsertResult;
    return { data: null, error: null };
  });
  return chain;
}

vi.mock('../../lib/supabase', () => ({
  supabaseAdmin: () => ({
    from: vi.fn((table: string) => ({
      select: vi.fn(() => buildSelectChain(table)),
      insert: vi.fn((values: Record<string, unknown>) => buildInsertChain(table, values)),
    })),
  }),
}));

type RateLimitResult = { allowed: boolean; reason?: string };
const rateLimitMock = vi.fn<(args: { phone: string | null; email: string | null }) => Promise<RateLimitResult>>(
  async () => ({ allowed: true }),
);
vi.mock('../../lib/mcp/waitlist-rate-limit', () => ({
  checkWaitlistRateLimit: (args: { phone: string | null; email: string | null }) => rateLimitMock(args),
}));

const { joinWaitlistHandler } = await import('../../app/api/mcp/tools/join-waitlist');

const ctx = { sourceAssistant: 'chatgpt', sourceIp: null, requestId: 'req-1' };

const futureIso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

const validInput = (overrides: Partial<Record<string, unknown>> = {}) => ({
  slug: 'evolv',
  service_id: '11111111-1111-1111-1111-111111111111',
  preferred_window: {
    starts_iso: futureIso(2 * 60 * 60 * 1000),
    ends_iso: futureIso(6 * 60 * 60 * 1000),
  },
  contact: { email: 'niamh@example.com' },
  ...overrides,
});

beforeEach(() => {
  businessResult = {
    data: { id: 'biz-1', slug: 'evolv', name: 'Evolv', is_live: true },
    error: null,
  };
  serviceResult = {
    data: { id: '11111111-1111-1111-1111-111111111111', business_id: 'biz-1', is_active: true },
    error: null,
  };
  waitlistInsertResult = { data: { id: '99999999-9999-9999-9999-999999999999' }, error: null };
  insertedRows.length = 0;
  rateLimitMock.mockReset();
  rateLimitMock.mockResolvedValue({ allowed: true });
});

describe('join_waitlist — happy path', () => {
  it('returns waitlist_id, notification_channels=[email], expires_at, next_step_for_user', async () => {
    const input = validInput();
    const out = (await joinWaitlistHandler(input, ctx)) as Record<string, unknown>;
    expect(out.waitlist_id).toBe('99999999-9999-9999-9999-999999999999');
    expect(out.notification_channels).toEqual(['email']);
    expect(typeof out.expires_at).toBe('string');
    expect(out.next_step_for_user).toMatch(/email/i);
    expect(out.next_step_for_user).toMatch(/waitlist clears at/i);
  });

  it('persists customer_hints onto the waitlist row', async () => {
    await joinWaitlistHandler(
      validInput({ customer_hints: { name: 'Niamh', notes: 'tight hammy' } }),
      ctx,
    );
    const insert = insertedRows.find((r) => r.table === 'mcp_waitlist');
    expect(insert?.values.customer_hints).toEqual({ name: 'Niamh', notes: 'tight hammy' });
  });

  it('persists contact email + (when given) phone to the row', async () => {
    await joinWaitlistHandler(
      validInput({ contact: { email: 'a@b.com', phone: '+353861234567' } }),
      ctx,
    );
    const insert = insertedRows.find((r) => r.table === 'mcp_waitlist');
    expect(insert?.values.contact_email).toBe('a@b.com');
    expect(insert?.values.contact_phone).toBe('+353861234567');
  });

  it('defaults expires_at to preferred_window.ends_iso when not provided', async () => {
    const input = validInput();
    const out = (await joinWaitlistHandler(input, ctx)) as { expires_at: string };
    expect(out.expires_at).toBe(input.preferred_window.ends_iso);
  });

  it('honours a caller-provided expires_at when within the window and in the future', async () => {
    const input = validInput();
    const customExpiry = futureIso(4 * 60 * 60 * 1000); // 4h, inside the 2-6h window
    const out = (await joinWaitlistHandler(
      { ...input, expires_at: customExpiry },
      ctx,
    )) as { expires_at: string };
    expect(out.expires_at).toBe(customExpiry);
  });

  it('clamps an out-of-range expires_at back to the window end (silently)', async () => {
    const input = validInput();
    const tooLate = futureIso(48 * 60 * 60 * 1000); // 48h, beyond the 6h window
    const out = (await joinWaitlistHandler(
      { ...input, expires_at: tooLate },
      ctx,
    )) as { expires_at: string };
    expect(out.expires_at).toBe(input.preferred_window.ends_iso);
  });

  it('allows service-agnostic waitlists (service_id omitted)', async () => {
    const { service_id: _, ...rest } = validInput();
    const out = (await joinWaitlistHandler(rest, ctx)) as Record<string, unknown>;
    expect(out.waitlist_id).toBe('99999999-9999-9999-9999-999999999999');
    const insert = insertedRows.find((r) => r.table === 'mcp_waitlist');
    expect(insert?.values.service_id).toBeNull();
  });
});

describe('join_waitlist — validation errors', () => {
  it('BUSINESS_NOT_FOUND for unknown slug', async () => {
    businessResult = { data: null, error: null };
    const out = (await joinWaitlistHandler(validInput(), ctx)) as { error: { code: string } };
    expect(out.error.code).toBe('BUSINESS_NOT_FOUND');
  });

  it("SERVICE_NOT_FOUND when the service doesn't belong to the business", async () => {
    serviceResult = {
      data: { id: '11111111-1111-1111-1111-111111111111', business_id: 'other-biz', is_active: true },
      error: null,
    };
    const out = (await joinWaitlistHandler(validInput(), ctx)) as { error: { code: string } };
    expect(out.error.code).toBe('SERVICE_NOT_FOUND');
  });

  it('SERVICE_NOT_FOUND when the service is inactive', async () => {
    serviceResult = {
      data: { id: '11111111-1111-1111-1111-111111111111', business_id: 'biz-1', is_active: false },
      error: null,
    };
    const out = (await joinWaitlistHandler(validInput(), ctx)) as { error: { code: string } };
    expect(out.error.code).toBe('SERVICE_NOT_FOUND');
  });

  it('INVALID_WINDOW when starts >= ends', async () => {
    const out = (await joinWaitlistHandler(
      validInput({
        preferred_window: {
          starts_iso: futureIso(6 * 60 * 60 * 1000),
          ends_iso: futureIso(2 * 60 * 60 * 1000),
        },
      }),
      ctx,
    )) as { error: { code: string } };
    expect(out.error.code).toBe('INVALID_WINDOW');
  });

  it('INVALID_WINDOW when starts is in the past', async () => {
    const out = (await joinWaitlistHandler(
      validInput({
        preferred_window: {
          starts_iso: futureIso(-60 * 60 * 1000),
          ends_iso: futureIso(60 * 60 * 1000),
        },
      }),
      ctx,
    )) as { error: { code: string } };
    expect(out.error.code).toBe('INVALID_WINDOW');
  });

  it('INVALID_WINDOW when range > 7 days', async () => {
    const out = (await joinWaitlistHandler(
      validInput({
        preferred_window: {
          starts_iso: futureIso(60 * 60 * 1000),
          ends_iso: futureIso((7 * 24 + 2) * 60 * 60 * 1000),
        },
      }),
      ctx,
    )) as { error: { code: string } };
    expect(out.error.code).toBe('INVALID_WINDOW');
  });

  it('CONTACT_REQUIRED when neither phone nor email provided', async () => {
    const out = (await joinWaitlistHandler(
      validInput({ contact: {} }),
      ctx,
    )) as { error: { code: string } };
    expect(out.error.code).toBe('CONTACT_REQUIRED');
  });

  it('INVALID_PHONE for garbage phone strings', async () => {
    const out = (await joinWaitlistHandler(
      validInput({ contact: { phone: 'abc123', email: 'a@b.com' } }),
      ctx,
    )) as { error: { code: string } };
    expect(out.error.code).toBe('INVALID_PHONE');
  });

  it('accepts a valid E.164 phone alongside email', async () => {
    const out = (await joinWaitlistHandler(
      validInput({ contact: { phone: '+353861234567', email: 'a@b.com' } }),
      ctx,
    )) as Record<string, unknown>;
    expect(out.waitlist_id).toBe('99999999-9999-9999-9999-999999999999');
  });

  it('EMAIL_REQUIRED when only phone is provided (v1 email-only constraint)', async () => {
    const out = (await joinWaitlistHandler(
      validInput({ contact: { phone: '+353861234567' } }),
      ctx,
    )) as { error: { code: string } };
    expect(out.error.code).toBe('EMAIL_REQUIRED');
  });

  it('INVALID_EMAIL for malformed email strings', async () => {
    const out = (await joinWaitlistHandler(
      validInput({ contact: { email: 'not-an-email' } }),
      ctx,
    )) as { error: { code: string } };
    expect(out.error.code).toBe('INVALID_EMAIL');
  });
});

describe('join_waitlist — rate limit', () => {
  it('returns WAITLIST_LIMIT_EXCEEDED when the limit denies', async () => {
    rateLimitMock.mockResolvedValueOnce({ allowed: false, reason: 'waitlist_daily_per_contact' });
    const out = (await joinWaitlistHandler(validInput(), ctx)) as { error: { code: string } };
    expect(out.error.code).toBe('WAITLIST_LIMIT_EXCEEDED');
  });

  it('passes phone OR email to the rate-limit check (phone takes priority)', async () => {
    rateLimitMock.mockResolvedValueOnce({ allowed: true });
    await joinWaitlistHandler(
      validInput({ contact: { phone: '+353861234567', email: 'a@b.com' } }),
      ctx,
    );
    expect(rateLimitMock).toHaveBeenCalledWith({
      phone: '+353861234567',
      email: 'a@b.com',
    });
  });
});
