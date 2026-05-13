// Unit tests for lib/push. Mocks firebase-admin entirely — no real
// FCM calls. Also mocks @/lib/supabase to capture push_log inserts
// and push_device_tokens deactivations.

import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- firebase-admin mock ------------------------------------------------
const sendMock = vi.fn();
const sendEachForMulticastMock = vi.fn();
const initializeAppMock = vi.fn();
const certMock = vi.fn((sa: unknown) => ({ __credential: sa }));

// `apps` stays empty so initializeApp is exercised at least once in the
// test suite. The push.ts cache short-circuits subsequent calls anyway.
const firebaseAdminMock = {
  apps: [] as unknown[],
  initializeApp: initializeAppMock,
  credential: { cert: certMock },
  messaging: () => ({ send: sendMock, sendEachForMulticast: sendEachForMulticastMock }),
};

vi.mock('firebase-admin', () => ({
  default: firebaseAdminMock,
  ...firebaseAdminMock,
}));

// --- supabase mock ------------------------------------------------------
const pushLogInsertMock = vi.fn(async () => ({ data: null, error: null }));
const tokenUpdateInMock = vi.fn(async () => ({ data: null, error: null }));
const tokenUpdateMock = vi.fn(() => ({ in: tokenUpdateInMock }));

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: () => ({
    from: (table: string) => {
      if (table === 'push_log') {
        return { insert: pushLogInsertMock };
      }
      if (table === 'push_device_tokens') {
        return { update: tokenUpdateMock };
      }
      return {};
    },
  }),
}));

// --- import under test (after mocks are set up) -------------------------
const push = await import('@/lib/push');

const validServiceAccount = JSON.stringify({
  type: 'service_account',
  project_id: 'openbook-push-test',
  private_key: 'fake',
  client_email: 'fake@test',
});

beforeEach(() => {
  vi.clearAllMocks();
  process.env.FIREBASE_SERVICE_ACCOUNT = validServiceAccount;
  push.__resetForTests();
});

// ========================================================================
// sendPush
// ========================================================================

describe('sendPush', () => {
  it('happy path: sends, logs delivered=true, returns success', async () => {
    sendMock.mockResolvedValueOnce('msg_id_42');

    const out = await push.sendPush(
      'cust-1',
      'tok-abc',
      { title: 'hi', body: 'there' },
      'test',
    );

    expect(out).toEqual({ success: true });
    expect(sendMock).toHaveBeenCalledOnce();
    const sentMessage = sendMock.mock.calls[0][0] as {
      token: string;
      apns: { payload: { aps: Record<string, unknown> } };
    };
    expect(sentMessage.token).toBe('tok-abc');
    expect(sentMessage.apns.payload.aps['content-available']).toBe(1);

    expect(pushLogInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: 'cust-1',
        kind: 'test',
        delivered: true,
        error: null,
      }),
    );
    expect(tokenUpdateMock).not.toHaveBeenCalled();
  });

  it('returns firebase_not_configured when FIREBASE_SERVICE_ACCOUNT is unset', async () => {
    delete process.env.FIREBASE_SERVICE_ACCOUNT;

    const out = await push.sendPush(
      'cust-1',
      'tok-abc',
      { title: 'hi', body: 'there' },
      'test',
    );

    expect(out).toEqual({ success: false, error: 'firebase_not_configured' });
    expect(sendMock).not.toHaveBeenCalled();
    expect(pushLogInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ delivered: false, error: 'firebase_not_configured' }),
    );
  });

  it('deactivates the token row when FCM reports invalid-registration-token', async () => {
    sendMock.mockRejectedValueOnce({ code: 'messaging/invalid-registration-token' });

    const out = await push.sendPush(
      'cust-1',
      'bad-token',
      { title: 'hi', body: 'there' },
      'standing_slot_match',
    );

    expect(out.success).toBe(false);
    expect(out.error).toBe('messaging/invalid-registration-token');
    expect(tokenUpdateMock).toHaveBeenCalledWith({ is_active: false });
    expect(tokenUpdateInMock).toHaveBeenCalledWith('token', ['bad-token']);
    expect(pushLogInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        delivered: false,
        error: 'messaging/invalid-registration-token',
      }),
    );
  });

  it('deactivates the token row when FCM reports registration-token-not-registered', async () => {
    sendMock.mockRejectedValueOnce({ code: 'messaging/registration-token-not-registered' });

    const out = await push.sendPush(
      'cust-2',
      'gone-token',
      { title: 'hi', body: 'there' },
      'favourite',
    );

    expect(out.success).toBe(false);
    expect(tokenUpdateMock).toHaveBeenCalled();
    expect(tokenUpdateInMock).toHaveBeenCalledWith('token', ['gone-token']);
  });

  it('does NOT deactivate the token row for non-token errors (e.g. quota)', async () => {
    sendMock.mockRejectedValueOnce({ code: 'messaging/quota-exceeded' });

    const out = await push.sendPush(
      'cust-3',
      'live-token',
      { title: 'hi', body: 'there' },
      'wider',
    );

    expect(out.success).toBe(false);
    expect(out.error).toBe('messaging/quota-exceeded');
    expect(tokenUpdateMock).not.toHaveBeenCalled();
    expect(pushLogInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ delivered: false, error: 'messaging/quota-exceeded' }),
    );
  });

  it('survives a push_log insert failure (logs to console, returns send result)', async () => {
    sendMock.mockResolvedValueOnce('msg_ok');
    pushLogInsertMock.mockRejectedValueOnce(new Error('db down'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const out = await push.sendPush(
      'cust-1',
      'tok-1',
      { title: 'hi', body: 'there' },
      'test',
    );

    expect(out).toEqual({ success: true });
    expect(errSpy).toHaveBeenCalledWith('[push] log write failed', expect.any(Error));
    errSpy.mockRestore();
  });
});

// ========================================================================
// sendPushBatch
// ========================================================================

describe('sendPushBatch', () => {
  it('returns zeros for an empty token list without calling FCM', async () => {
    const out = await push.sendPushBatch([], { title: 'hi', body: 'there' }, 'standing_slot_match');
    expect(out).toEqual({ success: 0, failure: 0, invalidTokens: [] });
    expect(sendEachForMulticastMock).not.toHaveBeenCalled();
  });

  it('chunks 750 tokens into two batches of 500 + 250', async () => {
    sendEachForMulticastMock
      .mockResolvedValueOnce({
        successCount: 500,
        failureCount: 0,
        responses: Array.from({ length: 500 }, () => ({ success: true })),
      })
      .mockResolvedValueOnce({
        successCount: 250,
        failureCount: 0,
        responses: Array.from({ length: 250 }, () => ({ success: true })),
      });

    const tokens = Array.from({ length: 750 }, (_, i) => ({
      customerId: `c-${i}`,
      token: `t-${i}`,
    }));

    const out = await push.sendPushBatch(tokens, { title: 'hi', body: 'there' }, 'standing_slot_match');

    expect(out).toEqual({ success: 750, failure: 0, invalidTokens: [] });
    expect(sendEachForMulticastMock).toHaveBeenCalledTimes(2);
    const firstCall = sendEachForMulticastMock.mock.calls[0][0] as { tokens: string[] };
    const secondCall = sendEachForMulticastMock.mock.calls[1][0] as { tokens: string[] };
    expect(firstCall.tokens).toHaveLength(500);
    expect(secondCall.tokens).toHaveLength(250);
  });

  it('aggregates invalid tokens across batches and deactivates them in one update', async () => {
    sendEachForMulticastMock
      .mockResolvedValueOnce({
        successCount: 499,
        failureCount: 1,
        responses: [
          ...Array.from({ length: 499 }, () => ({ success: true })),
          { success: false, error: { code: 'messaging/invalid-registration-token' } },
        ],
      })
      .mockResolvedValueOnce({
        successCount: 99,
        failureCount: 1,
        responses: [
          ...Array.from({ length: 99 }, () => ({ success: true })),
          { success: false, error: { code: 'messaging/registration-token-not-registered' } },
        ],
      });

    const batchOne = Array.from({ length: 500 }, (_, i) => ({
      customerId: `c-${i}`,
      token: `t-${i}`,
    }));
    const batchTwo = Array.from({ length: 100 }, (_, i) => ({
      customerId: `c-${500 + i}`,
      token: `t-${500 + i}`,
    }));
    const tokens = [...batchOne, ...batchTwo];

    const out = await push.sendPushBatch(tokens, { title: 'hi', body: 'there' }, 'wider');

    expect(out.success).toBe(499 + 99);
    expect(out.failure).toBe(2);
    expect(out.invalidTokens).toEqual(['t-499', 't-599']);

    expect(tokenUpdateMock).toHaveBeenCalledOnce();
    expect(tokenUpdateInMock).toHaveBeenCalledWith('token', ['t-499', 't-599']);
  });

  it('logs per-token outcomes (one push_log row per token, success or failure)', async () => {
    sendEachForMulticastMock.mockResolvedValueOnce({
      successCount: 2,
      failureCount: 1,
      responses: [
        { success: true },
        { success: false, error: { code: 'messaging/quota-exceeded' } },
        { success: true },
      ],
    });

    const tokens = [
      { customerId: 'a', token: 't-a' },
      { customerId: 'b', token: 't-b' },
      { customerId: 'c', token: 't-c' },
    ];
    await push.sendPushBatch(tokens, { title: 'hi', body: 'there' }, 'favourite');

    expect(pushLogInsertMock).toHaveBeenCalledTimes(3);
    const inserted = pushLogInsertMock.mock.calls.map((c) => c[0]);
    expect(inserted).toContainEqual(
      expect.objectContaining({ customer_id: 'a', delivered: true, error: null }),
    );
    expect(inserted).toContainEqual(
      expect.objectContaining({
        customer_id: 'b',
        delivered: false,
        error: 'messaging/quota-exceeded',
      }),
    );
    expect(inserted).toContainEqual(
      expect.objectContaining({ customer_id: 'c', delivered: true, error: null }),
    );
  });

  it('logs all tokens as failed when firebase-admin is not configured', async () => {
    delete process.env.FIREBASE_SERVICE_ACCOUNT;
    const tokens = [
      { customerId: 'a', token: 't-a' },
      { customerId: 'b', token: 't-b' },
    ];

    const out = await push.sendPushBatch(tokens, { title: 'hi', body: 'there' }, 'standing_slot_match');

    expect(out).toEqual({ success: 0, failure: 2, invalidTokens: [] });
    expect(sendEachForMulticastMock).not.toHaveBeenCalled();
    expect(pushLogInsertMock).toHaveBeenCalledTimes(2);
    expect(pushLogInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ delivered: false, error: 'firebase_not_configured' }),
    );
  });

  it('logs all tokens as failed when the multicast call itself throws', async () => {
    sendEachForMulticastMock.mockRejectedValueOnce(new Error('network'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const tokens = [
      { customerId: 'a', token: 't-a' },
      { customerId: 'b', token: 't-b' },
    ];
    const out = await push.sendPushBatch(tokens, { title: 'hi', body: 'there' }, 'wider');

    expect(out).toEqual({ success: 0, failure: 2, invalidTokens: [] });
    expect(pushLogInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ delivered: false, error: 'network' }),
    );
    errSpy.mockRestore();
  });
});
