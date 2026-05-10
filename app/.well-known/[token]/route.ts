// OpenAI domain-verification scaffold for the ChatGPT App Directory
// submission flow. During submission OpenAI issues a verification token
// and a specific path under /.well-known/ where it must be served as
// plain text. We don't bake either value into the codebase: both come
// from env vars so Sam can rotate or re-issue without a redeploy of the
// route file itself.
//
// OPENAI_DOMAIN_VERIFICATION_PATH is the segment under /.well-known/
// (e.g. "openai-domain-verification.txt"). OPENAI_DOMAIN_VERIFICATION_TOKEN
// is the verbatim string OpenAI hands you. With either env var unset, or
// the requested path not matching, this returns a clean 404 so it is safe
// to deploy ahead of submission.
//
// Note for mcp.openbook.ie: the host middleware (middleware.ts) only
// passes `/.well-known/*` paths through to their own route handlers; any
// other path on that host is rewritten to /api/mcp. So the verification
// path MUST be under /.well-known/ for OpenAI's verifier to reach it on
// the MCP subdomain.

import { corsHeaders } from '../../../lib/mcp/cors';

function notFound(origin: string | null): Response {
  return new Response('Not found', {
    status: 404,
    headers: { 'Content-Type': 'text/plain', ...corsHeaders(origin) },
  });
}

export async function GET(
  request: Request,
  { params }: { params: { token: string } },
): Promise<Response> {
  const origin = request.headers.get('origin');
  const expectedPath = process.env.OPENAI_DOMAIN_VERIFICATION_PATH;
  const token = process.env.OPENAI_DOMAIN_VERIFICATION_TOKEN;

  if (!expectedPath || !token) return notFound(origin);
  if (params.token !== expectedPath) return notFound(origin);

  return new Response(token, {
    status: 200,
    headers: { 'Content-Type': 'text/plain', ...corsHeaders(origin) },
  });
}
