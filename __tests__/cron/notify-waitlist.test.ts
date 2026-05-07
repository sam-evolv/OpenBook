import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

beforeAll(() => {
  process.env.MCP_HOLD_SIGNING_KEY = 'a'.repeat(64);
  process.env.MCP_POLLING_TOKEN_KEY = 'b'.repeat(64);
  process.env.RESEND_API_KEY = 're_test_dummy';
  process.env.VERCEL_CRON_SECRET = 'cron-secret-xyz';
  process.env.APP_DOMAIN = 'app.openbook.ie';
});

// ── State the mock will read from
type Result = { data: unknown; error: unknown };
let pendingQueue: Array<{ id: string; waitlist_id: string; slot_start: string; slot_end: string; status: string }> = [];
let waitlistRow: Result = { data: null, error: null };
let serviceRow: Result = { data: null, error: null };
let rpcResult: Result = { data: [{ hold_id: 'h-1', booking_id: 'bk-1', conflict_reason: null }], error: null };
const updateCalls: Array<{ table: string; values: Record<string, unknown>; idEq?: string }> = [];

function buildSelectChain(table: string): Record<string, unknown> {
  const chain: Record<string, unknown> = {};
  let limit = Infinity;
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn((n: number) => {
    limit = n;
    return chain;
  });
  chain.maybeSingle = vi.fn(async () => {
    if (table === 'mcp_waitlist') return waitlistRow;
    if (table === 'services') return serviceRow;
    return { data: null, error: null };
  });
  // Awaiting the chain itself = the SELECT result (used for the queue read).
  (chain as { then: (r: (v: unknown) => void) => void }).then = (resolve) => {
    if (table === 'mcp_waitlist_notifications') {
      resolve({ data: pendingQueue.slice(0, limit), error: null });
    } else {
      resolve({ data: null, error: null });
    }
  };
  return chain;
}

function buildUpdateChain(table: string, values: Record<string, unknown>): Record<string, unknown> {
  let idEq: string | undefined;
  const chain: Record<string, unknown> = {};
  chain.eq = vi.fn((col: string, val: unknown) => {
    if (col === 'id') idEq = val as string;
    return chain;
  });
  (chain as { then: (r: (v: unknown) => void) => void }).then = (resolve) => {
    updateCalls.push({ table, values, idEq });
    resolve({ data: null, error: null });
  };
  return chain;
}

const rpcMock = vi.fn(async () => rpcResult);

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: () => ({
    from: vi.fn((table: string) => ({
      select: vi.fn(() => buildSelectChain(table)),
      update: vi.fn((values: Record<string, unknown>) => buildUpdateChain(table, values)),
    })),
    rpc: rpcMock,
  }),
}));

vi.mock('@/lib/mcp/tokens', () => ({
  signHoldToken: vi.fn(async () => 'HOLD.TOKEN'),
}));

const resendSendMock = vi.fn(async () => ({ data: { id: 'msg_1' }, error: null }));
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: resendSendMock };
  },
}));

const { GET, POST } = await import('../../app/api/cron/notify-waitlist/route');

function makeReq(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/cron/notify-waitlist', { headers });
}

const authHeaders = { authorization: 'Bearer cron-secret-xyz' };

const futureIso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

const seedPending = (n = 1) => {
  pendingQueue = Array.from({ length: n }, (_, i) => ({
    id: `note-${i + 1}`,
    waitlist_id: `wl-${i + 1}`,
    slot_start: futureIso(60 * 60 * 1000),
    slot_end: futureIso(2 * 60 * 60 * 1000),
    status: 'pending',
  }));
};

beforeEach(() => {
  pendingQueue = [];
  waitlistRow = {
    data: {
      id: 'wl-1',
      business_id: 'biz-1',
      service_id: 'svc-1',
      contact_email: 'niamh@example.com',
      customer_hints: null,
      expires_at: futureIso(2 * 60 * 60 * 1000),
      status: 'active',
      businesses: { id: 'biz-1', name: 'Evolv', slug: 'evolv', primary_colour: '#0F172A' },
    },
    error: null,
  };
  serviceRow = {
    data: { id: 'svc-1', name: 'PT Session', duration_minutes: 60, is_active: true },
    error: null,
  };
  rpcResult = {
    data: [{ hold_id: 'h-1', booking_id: 'bk-1', conflict_reason: null }],
    error: null,
  };
  updateCalls.length = 0;
  rpcMock.mockClear();
  resendSendMock.mockClear();
  resendSendMock.mockResolvedValue({ data: { id: 'msg_1' }, error: null });
});

describe('cron auth', () => {
  it('rejects requests without the VERCEL_CRON_SECRET header', async () => {
    const res = await GET(makeReq() as never);
    expect(res.status).toBe(401);
  });
  it('rejects requests with a wrong-bearer header', async () => {
    const res = await GET(makeReq({ authorization: 'Bearer wrong' }) as never);
    expect(res.status).toBe(401);
  });
  it('accepts POST and GET with the right bearer (Vercel sometimes uses either)', async () => {
    let res = await GET(makeReq(authHeaders) as never);
    expect(res.status).toBe(200);
    res = await POST(makeReq(authHeaders) as never);
    expect(res.status).toBe(200);
  });
});

describe('cron processing', () => {
  it('happy path: creates hold, sends email, marks sent + waitlist notified', async () => {
    seedPending(1);
    const res = await GET(makeReq(authHeaders) as never);
    const json = await res.json();
    expect(json).toMatchObject({ processed: 1, sent: 1 });

    expect(rpcMock).toHaveBeenCalledWith(
      'create_mcp_hold_atomically',
      expect.objectContaining({
        p_business_id: 'biz-1',
        p_service_id: 'svc-1',
        p_source_assistant: 'waitlist',
      }),
    );

    expect(resendSendMock).toHaveBeenCalledOnce();
    const emailArgs = (resendSendMock.mock.calls as unknown as Array<[Record<string, unknown>]>)[0][0];
    expect(emailArgs.to).toBe('niamh@example.com');
    expect(emailArgs.subject).toMatch(/PT Session.*Evolv/);
    expect(String(emailArgs.html)).toContain('/c/HOLD.TOKEN');

    const noteUpdate = updateCalls.find(
      (c) => c.table === 'mcp_waitlist_notifications' && c.values.status === 'sent',
    );
    expect(noteUpdate?.values.booking_id).toBe('bk-1');
    expect(updateCalls.find((c) => c.table === 'mcp_waitlist' && c.values.status === 'notified')).toBeDefined();
  });

  it('SLOT_UNAVAILABLE: marks notification skipped, no email sent', async () => {
    seedPending(1);
    rpcResult = {
      data: [{ hold_id: null, booking_id: null, conflict_reason: 'SLOT_UNAVAILABLE' }],
      error: null,
    };
    const res = await GET(makeReq(authHeaders) as never);
    const json = await res.json();
    expect(json).toMatchObject({ processed: 1, skipped: 1 });
    expect(resendSendMock).not.toHaveBeenCalled();
    const skip = updateCalls.find(
      (c) => c.table === 'mcp_waitlist_notifications' && c.values.status === 'skipped',
    );
    expect(skip).toBeDefined();
  });

  it('email failure: notification marked failed with error_message', async () => {
    seedPending(1);
    resendSendMock.mockRejectedValueOnce(new Error('upstream 500'));
    const res = await GET(makeReq(authHeaders) as never);
    const json = await res.json();
    expect(json).toMatchObject({ processed: 1, failed: 1 });
    const fail = updateCalls.find(
      (c) => c.table === 'mcp_waitlist_notifications' && c.values.status === 'failed',
    );
    expect(fail?.values.error_message).toMatch(/upstream 500/);
  });

  it('skips when waitlist has no email (defensive — should not happen post-EMAIL_REQUIRED handler)', async () => {
    seedPending(1);
    waitlistRow = {
      data: {
        ...(waitlistRow.data as Record<string, unknown>),
        contact_email: null,
      },
      error: null,
    };
    const res = await GET(makeReq(authHeaders) as never);
    const json = await res.json();
    expect(json).toMatchObject({ skipped: 1 });
    expect(resendSendMock).not.toHaveBeenCalled();
  });

  it('skips when the waitlist is no longer active (already notified / expired)', async () => {
    seedPending(1);
    waitlistRow = {
      data: { ...(waitlistRow.data as Record<string, unknown>), status: 'notified' },
      error: null,
    };
    const res = await GET(makeReq(authHeaders) as never);
    const json = await res.json();
    expect(json).toMatchObject({ skipped: 1 });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('skips service-agnostic waitlists (v1 limitation)', async () => {
    seedPending(1);
    waitlistRow = {
      data: { ...(waitlistRow.data as Record<string, unknown>), service_id: null },
      error: null,
    };
    const res = await GET(makeReq(authHeaders) as never);
    const json = await res.json();
    expect(json).toMatchObject({ skipped: 1 });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('processes up to 50 in one tick (51st deferred)', async () => {
    seedPending(60);
    const res = await GET(makeReq(authHeaders) as never);
    const json = await res.json();
    expect(json.processed).toBe(50);
  });
});
