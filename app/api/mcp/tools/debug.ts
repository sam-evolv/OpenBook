// Diagnostic MCP tools, gated behind MCP_ENABLE_DEBUG_TOOLS=true.
//
// REMOVE BEFORE PRODUCTION GA. These exist purely to debug runtime
// exceptions surfaced via the MCP transport. They are deliberately not
// registered when the env var is absent so production tools/list stays
// clean.
//
// Health: confirms env wiring (Supabase URL, service-role key, signing
// keys, app domain) without leaking values.
// Smoke: drives the search_businesses implementation with a known
// minimal input and surfaces the exception type / message rather than
// the wrapped fallback shape.

import { _searchBusinessesImpl } from './search-businesses';
import { describeException, jsonSafe } from '../../../../lib/mcp/serialization';
import type { ToolHandler } from './index';

export const DEBUG_TOOLS_ENABLED = process.env.MCP_ENABLE_DEBUG_TOOLS === 'true';

const presence = (key: string): boolean => {
  const v = process.env[key];
  return typeof v === 'string' && v.length > 0;
};

export const debugOpenbookHealthHandler: ToolHandler = async () => {
  return {
    ok: true,
    tz: process.env.TZ ?? 'unset',
    node_env: process.env.NODE_ENV ?? 'unknown',
    vercel_env: process.env.VERCEL_ENV ?? 'unknown',
    vercel_region: process.env.VERCEL_REGION ?? 'unknown',
    supabase_url_set: presence('NEXT_PUBLIC_SUPABASE_URL'),
    supabase_anon_key_set: presence('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    supabase_service_role_key_set: presence('SUPABASE_SERVICE_ROLE_KEY'),
    mcp_hold_signing_key_set: presence('MCP_HOLD_SIGNING_KEY'),
    mcp_polling_token_key_set: presence('MCP_POLLING_TOKEN_KEY'),
    openai_api_key_set: presence('OPENAI_API_KEY'),
    app_domain: process.env.APP_DOMAIN ?? 'unset',
    mcp_include_score_breakdown: process.env.MCP_INCLUDE_SCORE_BREAKDOWN ?? 'unset',
    debug_tools_enabled: DEBUG_TOOLS_ENABLED,
    timestamp_iso: new Date().toISOString(),
  };
};

export const debugOpenbookSearchSmokeHandler: ToolHandler = async (_input, ctx) => {
  // Drive the implementation directly, bypassing the boundary wrapper, so
  // we see the actual exception rather than a swallowed fallback.
  try {
    const result = await _searchBusinessesImpl(
      { intent: 'personal trainer', location: 'Cork', limit: 1 },
      ctx,
    );
    return {
      ok: true,
      result_type: typeof result,
      is_array_results: Array.isArray((result as { results?: unknown })?.results),
      result: jsonSafe(result),
    };
  } catch (err) {
    return {
      ok: false,
      error: describeException(err),
    };
  }
};
