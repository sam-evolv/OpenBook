// Route tests for /api/notifications/register-device.
// Mocks next/headers cookies and supabase to capture insert/upsert calls.

import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- cookies() mock -----------------------------------------------------
let cookieJar = new Map<string, string>();
const cookieSetMock = vi.fn((name: string, value: string) => {
  cookieJar.set(name, value);
});
const cookieGetMock = vi.fn((name: string) => {
  const v = cookieJar.get(name);
  return v === undefined ? undefined : { name, value: v };
});

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: cookieGetMock, set: cookieSetMock }),
}));

// --- supabase mock ------------------------------------------------------
type CustomerInsertResult = { data: { id: string } | null; error: { message: string } | null };
let customerInsertResult: CustomerInsertResult = { data: { id: 'new-cust-id' }, error: null };
let upsertResult: { error: { message: string } | null } = { error: null };

const customerSingleMock = vi.fn(async () => customerInsertResult);
const customerSelectMock = vi.fn(() => ({ single: customerSingleMock }));
const customerInsertMock = vi.fn(() => ({ select: customerSelectMock }));

const tokenUpsertMock = vi.fn(async () => upsertResult);

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: () => ({
    from: (table: string) => {
      if (table === 'customers') return { insert: customerInsertMock };
      if (table === 'push_device_tokens') return { upsert: tokenUpsertMock };
      return {};
    },
  }),
}));

// --- import after mocks -------------------------------------------------
const { POST } = await import('../../app/api/notifications/register-device/route');

function makeReq(body: unknown): Request {
  return new Request('http://localhost/api/notifications/register-device', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  cookieJar = new Map();
  cookieSetMock.mockClear();
  cookieGetMock.mockClear();
  customerInsertMock.mockClear();
  customerSelectMock.mockClear();
  customerSingleMock.mockClear();
  tokenUpsertMock.mockClear();
  customerInsertResult = { data: { id: 'new-cust-id' }, error: null };
  upsertResult = { error: null };
});

describe('POST /api/notifications/register-device — body validation', () => {
  it('rejects an empty body with 400 invalid_body', async () => {
    const res = await POST(makeReq({}) as never);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_body' });
    expect(tokenUpsertMock).not.toHaveBeenCalled();
  });

  it('rejects an unsupported platform with 400', async () => {
    const res = await POST(
      makeReq({ token: 'a-valid-token-with-enough-length', platform: 'tizen' }) as never,
    );
    expect(res.status).toBe(400);
    expect(tokenUpsertMock).not.toHaveBeenCalled();
  });

  it('rejects a token shorter than 10 chars with 400', async () => {
    const res = await POST(makeReq({ token: 'tooshort', platform: 'ios' }) as never);
    expect(res.status).toBe(400);
    expect(tokenUpsertMock).not.toHaveBeenCalled();
  });
});

describe('POST /api/notifications/register-device — guest-mint flow', () => {
  it('mints a guest customer when no ob_customer_id cookie is present', async () => {
    const res = await POST(
      makeReq({ token: 'apns-token-aaaaaaaaaaa', platform: 'ios' }) as never,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    expect(customerInsertMock).toHaveBeenCalledWith({
      full_name: 'Guest',
      email: null,
      phone: null,
    });
    expect(cookieSetMock).toHaveBeenCalledWith(
      'ob_customer_id',
      'new-cust-id',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' }),
    );
    expect(tokenUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: 'new-cust-id',
        token: 'apns-token-aaaaaaaaaaa',
        platform: 'ios',
        is_active: true,
      }),
      { onConflict: 'customer_id,token' },
    );
  });

  it('returns 500 if guest-mint fails', async () => {
    customerInsertResult = { data: null, error: { message: 'db down' } };
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await POST(
      makeReq({ token: 'apns-token-aaaaaaaaaaa', platform: 'ios' }) as never,
    );
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'customer_create_failed' });
    expect(tokenUpsertMock).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });
});

describe('POST /api/notifications/register-device — existing customer flow', () => {
  it('reuses ob_customer_id from the cookie and does not mint', async () => {
    cookieJar.set('ob_customer_id', 'existing-cust-id');

    const res = await POST(
      makeReq({ token: 'fcm-android-token-bbbb', platform: 'android' }) as never,
    );
    expect(res.status).toBe(200);

    expect(customerInsertMock).not.toHaveBeenCalled();
    expect(cookieSetMock).not.toHaveBeenCalled();
    expect(tokenUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: 'existing-cust-id',
        token: 'fcm-android-token-bbbb',
        platform: 'android',
      }),
      { onConflict: 'customer_id,token' },
    );
  });

  it('passes last_seen_at as an ISO timestamp on each call', async () => {
    cookieJar.set('ob_customer_id', 'existing-cust-id');

    await POST(makeReq({ token: 'apns-token-aaaaaaaaaaa', platform: 'ios' }) as never);

    const call = tokenUpsertMock.mock.calls[0][0] as { last_seen_at: string };
    expect(call.last_seen_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('returns 500 if the token upsert fails', async () => {
    cookieJar.set('ob_customer_id', 'existing-cust-id');
    upsertResult = { error: { message: 'constraint violation' } };
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await POST(
      makeReq({ token: 'apns-token-aaaaaaaaaaa', platform: 'ios' }) as never,
    );
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'register_failed' });
    errSpy.mockRestore();
  });
});

describe('POST /api/notifications/register-device — platform values', () => {
  it.each(['ios', 'android', 'web'])('accepts platform=%s', async (platform) => {
    cookieJar.set('ob_customer_id', 'cust-id');
    const res = await POST(
      makeReq({ token: 'plenty-long-token-value', platform }) as never,
    );
    expect(res.status).toBe(200);
  });
});
