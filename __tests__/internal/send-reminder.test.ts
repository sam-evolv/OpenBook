import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Result<T = unknown> = { data: T | null; error: unknown };

let reminderRow: Result = { data: null, error: null };
let bookingRow: Result = { data: null, error: null };
let businessRow: Result = { data: null, error: null };
let serviceRow: Result = { data: null, error: null };
let tokenRows: Result<Array<{ token: string; platform: string }>> = { data: [], error: null };

const updates: Array<{ table: string; values: Record<string, unknown>; where: Record<string, unknown> }> = [];
const sendPushMock = vi.fn();

vi.mock('../../lib/push', () => ({
  sendPush: (...args: unknown[]) => sendPushMock(...args),
}));

vi.mock('../../lib/supabase', () => ({
  supabaseAdmin: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: (col1: string, _v1: string) => {
          if (table === 'push_device_tokens') {
            return {
              eq: async () => tokenRows,
            };
          }
          return {
            maybeSingle: async () => {
              if (table === 'pending_reminders') return reminderRow;
              if (table === 'bookings') return bookingRow;
              if (table === 'businesses') return businessRow;
              if (table === 'services') return serviceRow;
              return { data: null, error: null };
            },
          };
        },
      }),
      update: (values: Record<string, unknown>) => ({
        eq: async (col: string, val: unknown) => {
          updates.push({ table, values, where: { [col]: val } });
          return { data: null, error: null };
        },
      }),
    }),
  }),
}));

const { POST } = await import('../../app/api/internal/send-reminder/route');

const VALID_REMINDER_ID = '33333333-3333-3333-3333-333333333333';

function authedReq(body: unknown) {
  return new Request('http://localhost/api/internal/send-reminder', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-secret',
    },
    body: JSON.stringify(body),
  }) as unknown as import('next/server').NextRequest;
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret';
  reminderRow = {
    data: {
      id: VALID_REMINDER_ID,
      booking_id: 'book-1',
      kind: 'reminder_24h',
      status: 'dispatching',
    },
    error: null,
  };
  bookingRow = {
    data: {
      id: 'book-1',
      business_id: 'biz-1',
      service_id: 'svc-1',
      customer_id: 'cust-1',
      starts_at: '2026-05-13T17:00:00Z',
      status: 'confirmed',
    },
    error: null,
  };
  businessRow = { data: { id: 'biz-1', name: 'Cork Physio' }, error: null };
  serviceRow = { data: { id: 'svc-1', name: 'Recovery sauna' }, error: null };
  tokenRows = { data: [{ token: 'tkn-1', platform: 'ios' }], error: null };
  updates.length = 0;
  sendPushMock.mockReset();
  sendPushMock.mockResolvedValue({ success: true });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/internal/send-reminder', () => {
  it('401 when bearer is missing or wrong', async () => {
    const res = await POST(
      new Request('http://localhost/api/internal/send-reminder', {
        method: 'POST',
        body: JSON.stringify({ reminder_id: VALID_REMINDER_ID }),
      }) as unknown as import('next/server').NextRequest,
    );
    expect(res.status).toBe(401);
  });

  it('503 when CRON_SECRET is unset', async () => {
    delete process.env.CRON_SECRET;
    const res = await POST(authedReq({ reminder_id: VALID_REMINDER_ID }));
    expect(res.status).toBe(503);
  });

  it('returns ok when reminder is already sent (idempotency)', async () => {
    reminderRow = {
      data: { ...(reminderRow.data as object), status: 'sent' },
      error: null,
    };
    const res = await POST(authedReq({ reminder_id: VALID_REMINDER_ID }));
    expect(res.status).toBe(200);
    expect(sendPushMock).not.toHaveBeenCalled();
  });

  it('skips when the booking is no longer confirmed', async () => {
    bookingRow = {
      data: { ...(bookingRow.data as object), status: 'cancelled' },
      error: null,
    };
    const res = await POST(authedReq({ reminder_id: VALID_REMINDER_ID }));
    expect(res.status).toBe(200);
    expect(sendPushMock).not.toHaveBeenCalled();
    const pr = updates.find((u) => u.table === 'pending_reminders');
    expect(pr?.values).toMatchObject({ status: 'skipped' });
  });

  it('sends, flips the reminder to sent AND flips bookings.reminder_24h_sent', async () => {
    const res = await POST(authedReq({ reminder_id: VALID_REMINDER_ID }));
    expect(res.status).toBe(200);
    expect(sendPushMock).toHaveBeenCalledTimes(1);
    const reminderUpdate = updates.find(
      (u) => u.table === 'pending_reminders' && u.values.status === 'sent',
    );
    const bookingUpdate = updates.find(
      (u) => u.table === 'bookings' && u.values.reminder_24h_sent === true,
    );
    expect(reminderUpdate).toBeDefined();
    expect(bookingUpdate).toBeDefined();
  });

  it('flips reminder_2h_sent for a 2h reminder', async () => {
    reminderRow = {
      data: { ...(reminderRow.data as object), kind: 'reminder_2h' },
      error: null,
    };
    await POST(authedReq({ reminder_id: VALID_REMINDER_ID }));
    const bookingUpdate = updates.find(
      (u) => u.table === 'bookings' && u.values.reminder_2h_sent === true,
    );
    expect(bookingUpdate).toBeDefined();
  });

  it('marks failed when no active tokens are present', async () => {
    tokenRows = { data: [], error: null };
    const res = await POST(authedReq({ reminder_id: VALID_REMINDER_ID }));
    expect(res.status).toBe(404);
    const pr = updates.find((u) => u.table === 'pending_reminders');
    expect(pr?.values).toMatchObject({ status: 'failed', error: 'no_active_tokens' });
  });
});
