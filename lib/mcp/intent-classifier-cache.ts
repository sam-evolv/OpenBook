// Cache layer for the MCP intent classifier.
// 24h TTL, Postgres-backed, fail-open on errors.

import { createHash } from 'node:crypto';
import { supabaseAdmin } from '../supabase';
import type {
  CustomerContext,
  IntentClassification,
} from './intent-classifier';

const TTL_MS = 24 * 60 * 60 * 1000;

function sortKeysDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => sortKeysDeep(v)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(obj).sort()) {
      sorted[k] = sortKeysDeep(obj[k]);
    }
    return sorted as unknown as T;
  }
  return value;
}

export function computeCacheKey(args: {
  intent: string;
  customer_context?: CustomerContext;
}): string {
  const normalised = {
    intent: args.intent.trim().toLowerCase(),
    customer_context: args.customer_context
      ? sortKeysDeep(args.customer_context)
      : null,
  };
  return createHash('sha256').update(JSON.stringify(normalised)).digest('hex');
}

export async function getCachedClassification(
  cacheKey: string,
): Promise<IntentClassification | null> {
  try {
    const { data, error } = await supabaseAdmin()
      .from('mcp_intent_cache')
      .select('classification, expires_at')
      .eq('cache_key', cacheKey)
      .maybeSingle();

    if (error || !data) return null;
    if (new Date(data.expires_at as string).getTime() <= Date.now()) return null;
    return data.classification as IntentClassification;
  } catch (err) {
    console.error('[mcp.intent-cache] read failed:', err);
    return null;
  }
}

export async function setCachedClassification(
  cacheKey: string,
  classification: IntentClassification,
): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + TTL_MS).toISOString();
    const { error } = await supabaseAdmin()
      .from('mcp_intent_cache')
      .upsert(
        { cache_key: cacheKey, classification, expires_at: expiresAt },
        { onConflict: 'cache_key' },
      );
    if (error) console.error('[mcp.intent-cache] write failed:', error);
  } catch (err) {
    console.error('[mcp.intent-cache] write threw:', err);
  }
}
