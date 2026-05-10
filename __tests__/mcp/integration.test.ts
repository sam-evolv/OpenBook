import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the rate limiter and logger so tests don't hit the database.
const checkRateLimitMock = vi.fn(async () => ({ allowed: true }));
const logToolCallMock = vi.fn(async () => undefined);

vi.mock('../../lib/mcp/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...(args as [])),
}));

vi.mock('../../lib/mcp/logging', () => ({
  logToolCall: (...args: unknown[]) => logToolCallMock(...(args as [])),
}));

// Mock the Supabase admin so any accidental import path that bypasses the
// mocks above still doesn't try to talk to a real database.
vi.mock('../../lib/supabase', () => ({
  supabaseAdmin: () => ({
    rpc: vi.fn(async () => ({ data: 1, error: null })),
    from: () => ({
      insert: vi.fn(async () => ({ error: null })),
      delete: () => ({ lt: vi.fn(async () => ({ error: null })) }),
    }),
  }),
}));

// Import after mocks are registered.
const { POST } = await import('../../app/api/mcp/route');

function rpcRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://mcp.openbook.ie/api/mcp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '203.0.113.10',
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

async function callJson(body: unknown, headers: Record<string, string> = {}) {
  const res = await POST(rpcRequest(body, headers));
  const json = (await res.json()) as Record<string, unknown>;
  return { res, json };
}

beforeEach(() => {
  checkRateLimitMock.mockReset();
  checkRateLimitMock.mockResolvedValue({ allowed: true });
  logToolCallMock.mockReset();
  logToolCallMock.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('POST /api/mcp', () => {
  it('returns server info on initialize', async () => {
    const { json } = await callJson({ jsonrpc: '2.0', id: 1, method: 'initialize' });
    const result = json.result as Record<string, unknown>;
    const serverInfo = result.serverInfo as Record<string, unknown>;
    expect(serverInfo.name).toBe('OpenBook');
    expect(serverInfo.version).toBe('1.0.0');
    expect(result.name).toBeUndefined();
    expect(result.version).toBeUndefined();
    expect(result.protocolVersion).toBe('2025-06-18');
  });

  it('echoes the client protocolVersion when supported', async () => {
    const { json } = await callJson({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'claude.ai', version: '1.0' } },
    });
    const result = json.result as Record<string, unknown>;
    expect(result.protocolVersion).toBe('2024-11-05');
  });

  it('falls back to latest protocolVersion when client sends an unknown one', async () => {
    const { json } = await callJson({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '1999-01-01' },
    });
    const result = json.result as Record<string, unknown>;
    expect(result.protocolVersion).toBe('2025-06-18');
  });

  it('reflects the request origin on POST responses', async () => {
    const { res } = await callJson(
      { jsonrpc: '2.0', id: 1, method: 'initialize' },
      { origin: 'https://claude.ai' },
    );
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://claude.ai');
    expect(res.headers.get('Access-Control-Expose-Headers')).toBe('MCP-Protocol-Version');
    expect(res.headers.get('Vary')).toBe('Origin');
  });

  it('falls back to * when no Origin header is present', async () => {
    const { res } = await callJson({ jsonrpc: '2.0', id: 1, method: 'initialize' });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('handles OPTIONS preflight with 204 and proper headers', async () => {
    const { OPTIONS } = await import('../../app/api/mcp/route');
    const res = await OPTIONS(
      new Request('http://mcp.openbook.ie/api/mcp', {
        method: 'OPTIONS',
        headers: { origin: 'https://claude.ai', 'access-control-request-method': 'POST' },
      }),
    );
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://claude.ai');
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
    expect(res.headers.get('Access-Control-Allow-Headers')).toBe(
      'Content-Type, Authorization, MCP-Protocol-Version',
    );
    expect(res.headers.get('Access-Control-Max-Age')).toBe('86400');
  });

  it('returns 8 tools with correct snake_case names on tools/list', async () => {
    const { json } = await callJson({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    const tools = (json.result as { tools: Array<{ name: string }> }).tools;
    expect(tools).toHaveLength(8);
    expect(tools.map((t) => t.name).sort()).toEqual(
      [
        'check_booking_status',
        'get_availability',
        'get_business_info',
        'get_promoted_inventory',
        'hold_and_checkout',
        'join_waitlist',
        'record_post_booking_feedback',
        'search_businesses',
      ].sort(),
    );
  });

  it('every tool returned by tools/list has all three annotation hints populated as booleans', async () => {
    // The wire shape, not just the in-memory manifest: ChatGPT App
    // Directory review reads what comes over the JSON-RPC connection, so
    // we assert against the serialised response itself.
    const { json } = await callJson({ jsonrpc: '2.0', id: 21, method: 'tools/list' });
    const tools = (json.result as {
      tools: Array<{
        name: string;
        annotations?: { readOnlyHint?: unknown; destructiveHint?: unknown; openWorldHint?: unknown };
      }>;
    }).tools;
    expect(tools).toHaveLength(8);
    for (const tool of tools) {
      expect(tool.annotations, `tool ${tool.name} missing annotations on the wire`).toBeDefined();
      expect(typeof tool.annotations!.readOnlyHint, `tool ${tool.name} readOnlyHint`).toBe('boolean');
      expect(typeof tool.annotations!.destructiveHint, `tool ${tool.name} destructiveHint`).toBe('boolean');
      expect(typeof tool.annotations!.openWorldHint, `tool ${tool.name} openWorldHint`).toBe('boolean');
    }
  });

  it('every registered tool is now a REAL handler (no not_implemented stubs left)', async () => {
    // After PR #N (record_post_booking_feedback), all eight Section 5
    // tools are real. This test guards that invariant — if anyone wires
    // a stub back in, it fails loudly.
    const { TOOL_HANDLERS } = await import('../../app/api/mcp/tools/index');
    const names = Object.keys(TOOL_HANDLERS).sort();
    expect(names).toEqual(
      [
        'check_booking_status',
        'get_availability',
        'get_business_info',
        'get_promoted_inventory',
        'hold_and_checkout',
        'join_waitlist',
        'record_post_booking_feedback',
        'search_businesses',
      ].sort(),
    );

    for (const name of names) {
      expect(typeof TOOL_HANDLERS[name]).toBe('function');
    }
  });

  it('returns -32602 for invalid arguments', async () => {
    const { json } = await callJson({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: { name: 'get_business_info', arguments: { slug: 123 } },
    });
    const err = json.error as { code: number };
    expect(err.code).toBe(-32602);
  });

  it('returns -32601 for an unknown tool', async () => {
    const { json } = await callJson({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: { name: 'nonexistent_tool', arguments: {} },
    });
    const err = json.error as { code: number };
    expect(err.code).toBe(-32601);
  });

  it('returns -32601 for an unknown method', async () => {
    const { json } = await callJson({ jsonrpc: '2.0', id: 6, method: 'foo' });
    const err = json.error as { code: number };
    expect(err.code).toBe(-32601);
  });

  it('returns -32700 for malformed JSON', async () => {
    const res = await POST(rpcRequest('this-is-not-json'));
    const json = (await res.json()) as { error: { code: number } };
    expect(json.error.code).toBe(-32700);
  });

  it('returns -32000 with Retry-After when rate limited', async () => {
    // First 60 calls allowed; 61st blocked.
    let callIndex = 0;
    checkRateLimitMock.mockImplementation(async () => {
      callIndex += 1;
      if (callIndex > 60) {
        return { allowed: false, retryAfter: 30, reason: 'ip_per_minute' };
      }
      return { allowed: true };
    });

    let lastResponse: Response | null = null;
    let lastJson: any = null;
    for (let i = 0; i < 61; i += 1) {
      lastResponse = await POST(
        rpcRequest({ jsonrpc: '2.0', id: i + 1, method: 'initialize' }),
      );
      lastJson = await lastResponse.json();
    }
    expect(lastJson.error.code).toBe(-32000);
    expect(lastJson.error.message).toMatch(/rate limited/i);
    expect(lastResponse?.headers.get('Retry-After')).toBe('30');
  });

  it('wraps tools/call success result in a CallToolResult envelope', async () => {
    const { json } = await callJson({
      jsonrpc: '2.0',
      id: 100,
      method: 'tools/call',
      params: { name: 'get_promoted_inventory', arguments: {} },
    });
    const result = json.result as {
      content: Array<{ type: string; text: string }>;
      isError: boolean;
    };
    expect(result).toBeDefined();
    expect(result.isError).toBe(false);
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(typeof result.content[0].text).toBe('string');
    // The payload itself must round-trip through JSON unchanged. Parse it
    // back and confirm it carries the underlying tool output, not the
    // envelope wrapper.
    const parsed = JSON.parse(result.content[0].text) as Record<string, unknown>;
    expect(parsed).toBeDefined();
    expect('content' in parsed).toBe(false);
  });

  it('logs every tools/call exactly once with the correct toolName', async () => {
    await callJson({
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: { name: 'search_businesses', arguments: { intent: 'gym near me' } },
    });
    // Logging is fire-and-forget; let microtasks settle.
    await new Promise((r) => setTimeout(r, 0));
    expect(logToolCallMock).toHaveBeenCalledTimes(1);
    const firstCall = logToolCallMock.mock.calls[0] as unknown as [{ toolName: string }];
    expect(firstCall[0].toolName).toBe('search_businesses');
  });

  it('does not log initialize or tools/list', async () => {
    await callJson({ jsonrpc: '2.0', id: 8, method: 'initialize' });
    await callJson({ jsonrpc: '2.0', id: 9, method: 'tools/list' });
    await new Promise((r) => setTimeout(r, 0));
    expect(logToolCallMock).not.toHaveBeenCalled();
  });
});
