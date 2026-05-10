// Handlers for OAuth/OIDC discovery probes that browser-based MCP clients
// (notably Claude.ai) issue before opening a JSON-RPC connection. We don't
// implement OAuth — the MCP server is anonymous — so we return a clean 404
// with CORS headers, which the MCP spec says triggers fallback to
// unauthenticated access. Without CORS the browser drops the response and
// the client can't tell discovery from a network error.

import { corsHeaders, preflightResponse } from './cors';

const DISCOVERY_METHODS = 'GET, OPTIONS';

export function discoveryNotFoundResponse(origin: string | null): Response {
  return new Response(
    JSON.stringify({ error: 'not_found', error_description: 'No OAuth is configured for this MCP server.' }),
    {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    },
  );
}

export function discoveryPreflightResponse(origin: string | null): Response {
  return preflightResponse(origin, DISCOVERY_METHODS);
}
