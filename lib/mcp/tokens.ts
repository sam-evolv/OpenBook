// JWT signing/verification for MCP hold and polling tokens.
// Uses `jose` (edge-runtime safe) with HS256 + per-token-type secrets.
//
// We deliberately use two different secrets (MCP_HOLD_SIGNING_KEY and
// MCP_POLLING_TOKEN_KEY) — the tokens have different lifetimes and threat
// models, and a key compromise on one should not cross-grant the other.

import { jwtVerify, SignJWT } from 'jose';

const MIN_KEY_BYTES = 32;

function loadKey(envVar: string): Uint8Array {
  const raw = process.env[envVar];
  if (!raw) {
    throw new Error(`${envVar} is required for MCP token signing`);
  }
  if (raw.length < MIN_KEY_BYTES) {
    throw new Error(
      `${envVar} must be at least ${MIN_KEY_BYTES} bytes; generate with \`openssl rand -hex 32\``,
    );
  }
  return new TextEncoder().encode(raw);
}

let _holdKey: Uint8Array | null = null;
let _pollKey: Uint8Array | null = null;

function holdKey(): Uint8Array {
  if (!_holdKey) _holdKey = loadKey('MCP_HOLD_SIGNING_KEY');
  return _holdKey;
}
function pollKey(): Uint8Array {
  if (!_pollKey) _pollKey = loadKey('MCP_POLLING_TOKEN_KEY');
  return _pollKey;
}

export type HoldTokenPayload = {
  hold_id: string;
  booking_id: string;
  business_id: string;
  service_id: string;
  expires_at: string;
};

export type PollingTokenPayload = {
  hold_id: string;
  booking_id: string;
};

const HOLD_AUDIENCE = 'mcp.openbook.ie/hold';
const POLL_AUDIENCE = 'mcp.openbook.ie/polling';

export async function signHoldToken(payload: HoldTokenPayload): Promise<string> {
  const expSeconds = Math.floor(new Date(payload.expires_at).getTime() / 1000);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(payload.hold_id)
    .setIssuedAt()
    .setAudience(HOLD_AUDIENCE)
    .setExpirationTime(expSeconds)
    .sign(holdKey());
}

export async function verifyHoldToken(token: string): Promise<HoldTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, holdKey(), { audience: HOLD_AUDIENCE });
    if (
      typeof payload.hold_id !== 'string' ||
      typeof payload.booking_id !== 'string' ||
      typeof payload.business_id !== 'string' ||
      typeof payload.service_id !== 'string' ||
      typeof payload.expires_at !== 'string'
    ) {
      return null;
    }
    return {
      hold_id: payload.hold_id,
      booking_id: payload.booking_id,
      business_id: payload.business_id,
      service_id: payload.service_id,
      expires_at: payload.expires_at,
    };
  } catch {
    return null;
  }
}

export async function signPollingToken(payload: PollingTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(payload.hold_id)
    .setIssuedAt()
    .setAudience(POLL_AUDIENCE)
    .setExpirationTime('2h')
    .sign(pollKey());
}

export async function verifyPollingToken(token: string): Promise<PollingTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, pollKey(), { audience: POLL_AUDIENCE });
    if (typeof payload.hold_id !== 'string' || typeof payload.booking_id !== 'string') return null;
    return { hold_id: payload.hold_id, booking_id: payload.booking_id };
  } catch {
    return null;
  }
}
