// Behaviour tests for the OpenAI domain-verification scaffold at
// /.well-known/[token]. Verifies that the route stays silent (404) until
// both env vars are set, returns the configured token as plain text when
// the path matches, and 404s on path mismatch even when the token is set.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GET } from '../../app/.well-known/[token]/route';

const PATH_VAR = 'OPENAI_DOMAIN_VERIFICATION_PATH';
const TOKEN_VAR = 'OPENAI_DOMAIN_VERIFICATION_TOKEN';

function req(token: string): Request {
  return new Request(`https://mcp.openbook.ie/.well-known/${token}`, {
    method: 'GET',
    headers: { origin: 'https://chatgpt.com' },
  });
}

let origPath: string | undefined;
let origToken: string | undefined;

beforeEach(() => {
  origPath = process.env[PATH_VAR];
  origToken = process.env[TOKEN_VAR];
  delete process.env[PATH_VAR];
  delete process.env[TOKEN_VAR];
});

afterEach(() => {
  if (origPath === undefined) delete process.env[PATH_VAR];
  else process.env[PATH_VAR] = origPath;
  if (origToken === undefined) delete process.env[TOKEN_VAR];
  else process.env[TOKEN_VAR] = origToken;
});

describe('GET /.well-known/[token] (OpenAI domain verification)', () => {
  it('404s when neither env var is set', async () => {
    const res = await GET(req('anything.txt'), { params: { token: 'anything.txt' } });
    expect(res.status).toBe(404);
  });

  it('404s when only the token is set (path missing)', async () => {
    process.env[TOKEN_VAR] = 'tok-123';
    const res = await GET(req('anything.txt'), { params: { token: 'anything.txt' } });
    expect(res.status).toBe(404);
  });

  it('404s when only the path is set (token missing)', async () => {
    process.env[PATH_VAR] = 'openai-domain-verification.txt';
    const res = await GET(req('openai-domain-verification.txt'), {
      params: { token: 'openai-domain-verification.txt' },
    });
    expect(res.status).toBe(404);
  });

  it('404s when both env vars are set but the path does not match', async () => {
    process.env[PATH_VAR] = 'openai-domain-verification.txt';
    process.env[TOKEN_VAR] = 'tok-abc';
    const res = await GET(req('something-else.txt'), { params: { token: 'something-else.txt' } });
    expect(res.status).toBe(404);
  });

  it('returns the token as text/plain with CORS when the path matches', async () => {
    process.env[PATH_VAR] = 'openai-domain-verification.txt';
    process.env[TOKEN_VAR] = 'tok-abc-very-secret';
    const res = await GET(req('openai-domain-verification.txt'), {
      params: { token: 'openai-domain-verification.txt' },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/plain');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://chatgpt.com');
    const body = await res.text();
    expect(body).toBe('tok-abc-very-secret');
  });
});
