import { beforeAll, describe, expect, it, vi } from 'vitest';

const HOLD_KEY = 'a'.repeat(64);
const POLL_KEY = 'b'.repeat(64);

beforeAll(() => {
  process.env.MCP_HOLD_SIGNING_KEY = HOLD_KEY;
  process.env.MCP_POLLING_TOKEN_KEY = POLL_KEY;
});

const { signHoldToken, verifyHoldToken, signPollingToken, verifyPollingToken } = await import(
  '../../lib/mcp/tokens'
);

const futureIso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

const holdPayload = () => ({
  hold_id: '11111111-1111-1111-1111-111111111111',
  booking_id: '22222222-2222-2222-2222-222222222222',
  business_id: '33333333-3333-3333-3333-333333333333',
  service_id: '44444444-4444-4444-4444-444444444444',
  expires_at: futureIso(10 * 60 * 1000),
});

describe('hold tokens', () => {
  it('signHoldToken + verifyHoldToken roundtrips', async () => {
    const p = holdPayload();
    const t = await signHoldToken(p);
    const back = await verifyHoldToken(t);
    expect(back?.hold_id).toBe(p.hold_id);
    expect(back?.booking_id).toBe(p.booking_id);
    expect(back?.business_id).toBe(p.business_id);
    expect(back?.service_id).toBe(p.service_id);
  });

  it('verifyHoldToken returns null for tampered token', async () => {
    const t = await signHoldToken(holdPayload());
    const tampered = `${t.slice(0, -2)}xx`;
    expect(await verifyHoldToken(tampered)).toBeNull();
  });

  it('verifyHoldToken returns null for token signed with the polling key', async () => {
    // Sign with the polling-token signer; the audience claim and signing key
    // both differ, so verifyHoldToken must reject.
    const polling = await signPollingToken({ hold_id: 'a', booking_id: 'b' });
    expect(await verifyHoldToken(polling)).toBeNull();
  });

  it('verifyHoldToken returns null for an expired token', async () => {
    // Expiry in the past — the JWT exp claim controls this regardless of the
    // payload.expires_at field we stash.
    const past = futureIso(-60 * 1000);
    const t = await signHoldToken({ ...holdPayload(), expires_at: past });
    expect(await verifyHoldToken(t)).toBeNull();
  });
});

describe('polling tokens', () => {
  it('signPollingToken expires in 2 hours (within a small tolerance)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-08T12:00:00Z'));
    const t = await signPollingToken({ hold_id: 'h', booking_id: 'b' });
    vi.useRealTimers();
    // Decode the JWT body manually — base64url middle segment.
    const body = JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString());
    const expSeconds = body.exp as number;
    const expectedExp = Math.floor(new Date('2026-05-08T14:00:00Z').getTime() / 1000);
    expect(Math.abs(expSeconds - expectedExp)).toBeLessThan(2);
  });

  it('verifyPollingToken returns null for malformed token', async () => {
    expect(await verifyPollingToken('not.a.token')).toBeNull();
    expect(await verifyPollingToken('')).toBeNull();
  });
});
