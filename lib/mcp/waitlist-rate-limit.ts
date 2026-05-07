// Per-contact daily cap for waitlists.
// Per docs/mcp-server-spec.md section 13.1 Threat 6: max 3 active
// waitlists per phone (or email) per day. Stops abusive enumeration
// where an attacker camps on every business's slots.
//
// Reuses the existing mcp_rate_limit table + increment_mcp_rate_limit
// RPC that the IP/origin and polling-token limits already use, so no
// new schema or DB function is needed.
//
// Bucket window is a UTC day, aligned to 24-hour ticks. Same alignment
// caveat as the other limits — a contact that signs up at 23:55 could
// see up to 6 across the day boundary; acceptable for v1, the goal is
// blocking enumeration not exact accounting.
//
// FAIL OPEN on DB errors: a transient outage shouldn't block legitimate
// waitlists. Same posture as the IP/origin limits.

import { supabaseAdmin } from '../supabase';

const WAITLIST_DAILY_LIMIT = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export type WaitlistRateLimitResult = {
  allowed: boolean;
  reason?: string;
};

export async function checkWaitlistRateLimit(args: {
  phone: string | null;
  email: string | null;
}): Promise<WaitlistRateLimitResult> {
  // Phone is the stronger identifier when present (it's harder to fake
  // throwaway phones than emails). When phone is given we limit by phone
  // and ignore email; otherwise we limit by email. Caller is expected to
  // have already validated at least one is non-null — we just no-op if
  // neither is provided.
  const dayIndex = Math.floor(Date.now() / DAY_MS);
  const windowStart = new Date(dayIndex * DAY_MS);

  const identifier = args.phone
    ? { kind: 'phone' as const, value: args.phone.replace(/\s+/g, '') }
    : args.email
      ? { kind: 'email' as const, value: args.email.toLowerCase() }
      : null;

  if (!identifier) return { allowed: true };

  const bucket = `waitlist:${identifier.kind}:${identifier.value}:day:${dayIndex}`;

  try {
    const { data, error } = await supabaseAdmin().rpc('increment_mcp_rate_limit', {
      p_bucket: bucket,
      p_window_start: windowStart.toISOString(),
    });
    if (error) throw error;
    const count = typeof data === 'number' ? data : Number(data);
    if (!Number.isFinite(count)) {
      throw new Error('increment_mcp_rate_limit returned non-number');
    }
    if (count > WAITLIST_DAILY_LIMIT) {
      return { allowed: false, reason: 'waitlist_daily_per_contact' };
    }
    return { allowed: true };
  } catch (err) {
    console.error('[mcp.waitlist-rate-limit] failing open due to error:', err);
    return { allowed: true };
  }
}
