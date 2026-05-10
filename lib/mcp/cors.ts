// CORS for the public MCP endpoint.
//
// MCP servers are anonymous and credential-free, so there is no security
// boundary CORS would protect — we simply reflect the request origin (or `*`
// when none is sent) so browser-based clients like Claude.ai, ChatGPT, and
// Gemini can talk to us.

const ALLOWED_HEADERS = 'Content-Type, Authorization, MCP-Protocol-Version';
const DEFAULT_METHODS = 'POST, OPTIONS';
const EXPOSED_HEADERS = 'MCP-Protocol-Version';
const MAX_AGE = '86400';

export function corsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin = origin ?? '*';
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Expose-Headers': EXPOSED_HEADERS,
  };
  if (origin) headers['Vary'] = 'Origin';
  return headers;
}

export function preflightResponse(origin: string | null, methods: string = DEFAULT_METHODS): Response {
  const allowOrigin = origin ?? '*';
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': ALLOWED_HEADERS,
    'Access-Control-Max-Age': MAX_AGE,
  };
  if (origin) headers['Vary'] = 'Origin';
  return new Response(null, { status: 204, headers });
}
