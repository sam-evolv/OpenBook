// The Vercel Cron route is a thin auth + delegate over
// processWaitlistNotifications. Heavy logic tests for the processor
// itself live in __tests__/mcp/process-waitlist-notifications.test.ts.

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

beforeAll(() => {
  process.env.VERCEL_CRON_SECRET = 'cron-secret-xyz';
});

type ProcessSummary = { processed: number; sent: number; failed: number; skipped: number };
const processMock = vi.fn<(args: { limit: number }) => Promise<ProcessSummary>>(async () => ({
  processed: 0,
  sent: 0,
  failed: 0,
  skipped: 0,
}));

vi.mock('@/lib/mcp/process-waitlist-notifications', () => ({
  processWaitlistNotifications: (args: { limit: number }) => processMock(args),
}));

const { GET, POST } = await import('../../app/api/cron/notify-waitlist/route');

function makeReq(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/cron/notify-waitlist', { headers });
}
const authHeaders = { authorization: 'Bearer cron-secret-xyz' };

beforeEach(() => {
  processMock.mockClear();
  processMock.mockResolvedValue({ processed: 0, sent: 0, failed: 0, skipped: 0 });
});

describe('cron auth', () => {
  it('rejects requests without the VERCEL_CRON_SECRET header', async () => {
    const res = await GET(makeReq() as never);
    expect(res.status).toBe(401);
    expect(processMock).not.toHaveBeenCalled();
  });

  it('rejects requests with a wrong-bearer header', async () => {
    const res = await GET(makeReq({ authorization: 'Bearer wrong' }) as never);
    expect(res.status).toBe(401);
    expect(processMock).not.toHaveBeenCalled();
  });

  it('accepts both GET and POST with the right bearer', async () => {
    let res = await GET(makeReq(authHeaders) as never);
    expect(res.status).toBe(200);
    res = await POST(makeReq(authHeaders) as never);
    expect(res.status).toBe(200);
  });
});

describe('cron delegation', () => {
  it('calls processWaitlistNotifications with limit=50', async () => {
    await GET(makeReq(authHeaders) as never);
    expect(processMock).toHaveBeenCalledWith({ limit: 50 });
  });

  it('returns the processor summary verbatim', async () => {
    processMock.mockResolvedValueOnce({
      processed: 7,
      sent: 5,
      failed: 1,
      skipped: 1,
    });
    const res = await GET(makeReq(authHeaders) as never);
    const json = await res.json();
    expect(json).toEqual({ processed: 7, sent: 5, failed: 1, skipped: 1 });
  });
});
