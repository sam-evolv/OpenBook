/**
 * In-memory rate limiter keyed on a caller identifier (typically a
 * customer id). Holds a sliding 60-second window per key with a small
 * request cap and exposes a structured error so callers can return 429
 * with the right `Retry-After` header.
 *
 * TODO: migrate to Redis (Upstash) when traffic justifies. In-memory is
 * fine for now — a single Vercel function instance absorbs typical bursts
 * within a 60s window, and the failure mode of multiple instances is at
 * worst a higher effective limit, never a lower one.
 */

export class RateLimitError extends Error {
  constructor(public retryAfterSeconds: number) {
    super('rate_limited');
    this.name = 'RateLimitError';
  }
}

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 3;

const buckets = new Map<string, number[]>();

export function checkRateLimit(key: string): void {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    const oldest = recent[0];
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((WINDOW_MS - (now - oldest)) / 1000),
    );
    throw new RateLimitError(retryAfterSeconds);
  }
  recent.push(now);
  buckets.set(key, recent);
}

if (typeof setInterval !== 'undefined') {
  const timer = setInterval(() => {
    const cutoff = Date.now() - WINDOW_MS;
    for (const [id, timestamps] of buckets.entries()) {
      const filtered = timestamps.filter((t) => t > cutoff);
      if (filtered.length === 0) buckets.delete(id);
      else buckets.set(id, filtered);
    }
  }, WINDOW_MS);
  timer.unref?.();
}

/** Test-only: wipe the bucket map so tests start from a clean state. */
export function __resetRateLimitForTests(): void {
  buckets.clear();
}
