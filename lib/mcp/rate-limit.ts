// Postgres-backed rate limiter for the MCP endpoint.
// Per docs/mcp-server-spec.md section 5.1: 60 req/min/IP, 1000 req/hr/origin.
// Per docs/mcp-server-spec.md section 5.6: 30 calls per polling token.
//
// Each check fires one RPC against `increment_mcp_rate_limit`, which atomically
// upserts the bucket row and returns the new count. We FAIL OPEN on any DB
// error — a transient outage should not take the endpoint down.

import { supabaseAdmin } from '../supabase';

const IP_LIMIT_PER_MINUTE = 60;
const ORIGIN_LIMIT_PER_HOUR = 1000;
const POLLING_LIMIT_PER_TOKEN = 30;
const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const TWO_HOUR_MS = 2 * HOUR_MS;

export type RateLimitResult = {
  allowed: boolean;
  retryAfter?: number;
  reason?: string;
};

async function bumpBucket(bucket: string, windowStart: Date): Promise<number> {
  const { data, error } = await supabaseAdmin().rpc('increment_mcp_rate_limit', {
    p_bucket: bucket,
    p_window_start: windowStart.toISOString(),
  });
  if (error) throw error;
  if (typeof data !== 'number') throw new Error('increment_mcp_rate_limit returned non-number');
  return data;
}

export async function checkRateLimit(args: {
  ip: string | null;
  origin: string | null;
}): Promise<RateLimitResult> {
  const now = Date.now();

  try {
    if (args.ip) {
      const minuteIndex = Math.floor(now / MINUTE_MS);
      const windowStart = new Date(minuteIndex * MINUTE_MS);
      const bucket = `ip:${args.ip}:minute:${minuteIndex}`;
      const count = await bumpBucket(bucket, windowStart);
      if (count > IP_LIMIT_PER_MINUTE) {
        const retryAfter = Math.ceil((windowStart.getTime() + MINUTE_MS - now) / 1000);
        return { allowed: false, retryAfter, reason: 'ip_per_minute' };
      }
    }

    if (args.origin) {
      const hourIndex = Math.floor(now / HOUR_MS);
      const windowStart = new Date(hourIndex * HOUR_MS);
      const bucket = `origin:${args.origin}:hour:${hourIndex}`;
      const count = await bumpBucket(bucket, windowStart);
      if (count > ORIGIN_LIMIT_PER_HOUR) {
        const retryAfter = Math.ceil((windowStart.getTime() + HOUR_MS - now) / 1000);
        return { allowed: false, retryAfter, reason: 'origin_per_hour' };
      }
    }

    return { allowed: true };
  } catch (err) {
    console.error('[mcp.rate-limit] failing open due to error:', err);
    return { allowed: true };
  }
}

// Per-polling-token limit for check_booking_status. Bucket window is 2
// hours, aligned to 2-hour ticks of wall-clock time, matching the polling
// token's TTL. Note the alignment caveat: a token issued near a boundary
// could see up to 2× the limit across its lifetime (30 in the current
// window + 30 after the boundary). Acceptable for v1 — it's the same
// approximation the existing IP/origin limits use, and the goal here is
// blocking pathological loops, not exact accounting.
export async function checkPollingTokenRateLimit(
  bookingId: string,
): Promise<RateLimitResult> {
  if (!bookingId) return { allowed: true };
  try {
    const now = Date.now();
    const windowIndex = Math.floor(now / TWO_HOUR_MS);
    const windowStart = new Date(windowIndex * TWO_HOUR_MS);
    const bucket = `polling:${bookingId}:${windowIndex}`;
    const count = await bumpBucket(bucket, windowStart);
    if (count > POLLING_LIMIT_PER_TOKEN) {
      const retryAfter = Math.ceil((windowStart.getTime() + TWO_HOUR_MS - now) / 1000);
      return { allowed: false, retryAfter, reason: 'polling_per_token' };
    }
    return { allowed: true };
  } catch (err) {
    console.error('[mcp.rate-limit] polling check failing open:', err);
    return { allowed: true };
  }
}

export async function cleanupOldRateLimitBuckets(): Promise<void> {
  const cutoff = new Date(Date.now() - 2 * HOUR_MS).toISOString();
  const { error } = await supabaseAdmin().from('mcp_rate_limit').delete().lt('window_start', cutoff);
  if (error) {
    console.error('[mcp.rate-limit] cleanup failed:', error);
  }
}
