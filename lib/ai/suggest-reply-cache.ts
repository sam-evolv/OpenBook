/**
 * Module-level cache for reply suggestions.
 *
 * Keyed by `${conversation_id}:${last_inbound_message_id}` so a new
 * inbound naturally invalidates without explicit eviction. 60-second
 * TTL — owners tend to either respond or move on within that window,
 * and beyond it the suggestion has probably gone stale relative to the
 * rest of their unread queue.
 *
 * Known limitation: cache is per Node instance. Vercel Fluid Compute
 * reuses instances aggressively so cache hits are still common, but a
 * redeploy or cold start clears it. Documented in the Stage 2 brief
 * entry; revisit with Redis/KV only if OpenAI costs become material.
 *
 * Cooldown is separate from cache: a 2-second floor on distinct calls
 * per conversation to survive a bad client loop. Independent from TTL
 * because cooldown persists even when the cache key changes.
 */

export interface CacheEntry {
  suggestions: string[];
  expiresAt: number;
}

const CACHE = new Map<string, CacheEntry>();
const COOLDOWN = new Map<string, number>();

const TTL_MS = 60_000;
const COOLDOWN_MS = 2_000;

export function cacheKey(conversationId: string, lastInboundId: string): string {
  return `${conversationId}:${lastInboundId}`;
}

export function readCache(conversationId: string, lastInboundId: string): string[] | null {
  const entry = CACHE.get(cacheKey(conversationId, lastInboundId));
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    CACHE.delete(cacheKey(conversationId, lastInboundId));
    return null;
  }
  return entry.suggestions;
}

export function writeCache(
  conversationId: string,
  lastInboundId: string,
  suggestions: string[],
): void {
  CACHE.set(cacheKey(conversationId, lastInboundId), {
    suggestions,
    expiresAt: Date.now() + TTL_MS,
  });
}

/**
 * Returns true if this conversation called the endpoint within the
 * last COOLDOWN_MS. When true, the caller should skip the OpenAI fetch
 * and return an empty suggestion list — the cache entry (if any) from
 * the prior call will still serve the UI, and the client will retry
 * on the next inbound.
 */
export function isInCooldown(conversationId: string): boolean {
  const last = COOLDOWN.get(conversationId);
  if (!last) return false;
  return Date.now() - last < COOLDOWN_MS;
}

export function stampCooldown(conversationId: string): void {
  COOLDOWN.set(conversationId, Date.now());
}
