import { describe, expect, it } from 'vitest';

import {
  GET as authServerGET,
  OPTIONS as authServerOPTIONS,
} from '../../app/.well-known/oauth-authorization-server/route';
import {
  GET as protectedResourceGET,
  OPTIONS as protectedResourceOPTIONS,
} from '../../app/.well-known/oauth-protected-resource/route';
import {
  GET as openidGET,
  OPTIONS as openidOPTIONS,
} from '../../app/.well-known/openid-configuration/route';

function makeRequest(headers: Record<string, string> = {}, method = 'GET'): Request {
  return new Request('http://mcp.openbook.ie/.well-known/oauth-authorization-server', {
    method,
    headers,
  });
}

describe.each([
  ['oauth-authorization-server', authServerGET, authServerOPTIONS],
  ['oauth-protected-resource', protectedResourceGET, protectedResourceOPTIONS],
  ['openid-configuration', openidGET, openidOPTIONS],
] as const)('GET /.well-known/%s', (_name, GET, OPTIONS) => {
  it('returns 404 with a JSON body and CORS headers reflecting the origin', async () => {
    const res = await GET(makeRequest({ origin: 'https://claude.ai' }));
    expect(res.status).toBe(404);
    expect(res.headers.get('Content-Type')).toBe('application/json');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://claude.ai');
    expect(res.headers.get('Vary')).toBe('Origin');
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('not_found');
  });

  it('falls back to * when no Origin header is present', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(404);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('handles OPTIONS preflight with 204 and GET, OPTIONS allowed', async () => {
    const res = await OPTIONS(
      makeRequest(
        { origin: 'https://claude.ai', 'access-control-request-method': 'GET' },
        'OPTIONS',
      ),
    );
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://claude.ai');
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS');
    expect(res.headers.get('Access-Control-Max-Age')).toBe('86400');
  });
});
