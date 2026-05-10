// MCP endpoint — JSON-RPC dispatcher.
// Implements `initialize`, `tools/list`, and `tools/call` per
// docs/mcp-server-spec.md sections 4 and 5. PR 5b adds the runtime layer:
// per-request rate limiting (60/min/IP, 1000/hr/origin) and fire-and-forget
// logging of every tools/call into mcp_tool_calls.

import { z } from 'zod';
import {
  PARSE_ERROR,
  METHOD_NOT_FOUND,
  INVALID_PARAMS,
  INTERNAL_ERROR,
  RATE_LIMITED,
  errorResponse,
  successResponse,
  parseRequest,
  type JsonRpcResponse,
} from '../../../lib/mcp/jsonrpc';
import { TOOL_MANIFEST } from '../../../lib/mcp/manifest';
import { detectSourceAssistant } from '../../../lib/mcp/source-assistant';
import { checkRateLimit } from '../../../lib/mcp/rate-limit';
import { logToolCall } from '../../../lib/mcp/logging';
import { corsHeaders, preflightResponse } from '../../../lib/mcp/cors';
import { TOOL_HANDLERS, type ToolContext } from './tools';
import {
  searchBusinessesInput,
  getBusinessInfoInput,
  getAvailabilityInput,
  holdAndCheckoutInput,
  checkBookingStatusInput,
  joinWaitlistInput,
  getPromotedInventoryInput,
  recordPostBookingFeedbackInput,
} from '../../../lib/mcp/schemas';

const TOOL_INPUT_SCHEMAS: Record<string, z.ZodTypeAny> = {
  search_businesses: searchBusinessesInput,
  get_business_info: getBusinessInfoInput,
  get_availability: getAvailabilityInput,
  hold_and_checkout: holdAndCheckoutInput,
  check_booking_status: checkBookingStatusInput,
  join_waitlist: joinWaitlistInput,
  get_promoted_inventory: getPromotedInventoryInput,
  record_post_booking_feedback: recordPostBookingFeedbackInput,
};

const SUPPORTED_PROTOCOL_VERSIONS = ['2024-11-05', '2025-03-26', '2025-06-18'] as const;
const LATEST_PROTOCOL_VERSION = '2025-06-18';

const INITIALIZE_RESULT_BASE = {
  serverInfo: { name: 'OpenBook', version: '1.0.0' },
  capabilities: { tools: {} },
};

function negotiateProtocolVersion(params: unknown): string {
  const requested = (params as { protocolVersion?: unknown } | undefined)?.protocolVersion;
  if (typeof requested === 'string' && (SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(requested)) {
    return requested;
  }
  return LATEST_PROTOCOL_VERSION;
}

function jsonResponse(payload: JsonRpcResponse, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...(extraHeaders ?? {}) },
  });
}

export async function OPTIONS(request: Request): Promise<Response> {
  return preflightResponse(request.headers.get('origin'));
}

function extractIp(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const real = headers.get('x-real-ip');
  return real?.trim() || null;
}

export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get('origin');
  const cors = corsHeaders(origin);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(errorResponse(null, PARSE_ERROR, 'Parse error'), cors);
  }

  const parsed = parseRequest(body);
  if (!parsed.ok) {
    return jsonResponse(parsed.response, cors);
  }
  const { id, method, params } = parsed.request;

  const sourceAssistant = detectSourceAssistant(request.headers);
  const sourceIp = extractIp(request.headers);
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const ctx: ToolContext = { sourceAssistant, sourceIp, requestId };

  const rl = await checkRateLimit({ ip: sourceIp, origin });
  if (!rl.allowed) {
    const retryAfter = rl.retryAfter ?? 60;
    return jsonResponse(
      errorResponse(id, RATE_LIMITED, 'rate limited', { retryAfter, reason: rl.reason }),
      { ...cors, 'Retry-After': String(retryAfter) },
    );
  }

  try {
    if (method === 'initialize') {
      return jsonResponse(
        successResponse(id, { ...INITIALIZE_RESULT_BASE, protocolVersion: negotiateProtocolVersion(params) }),
        cors,
      );
    }

    if (method === 'tools/list') {
      return jsonResponse(successResponse(id, { tools: TOOL_MANIFEST }), cors);
    }

    if (method === 'tools/call') {
      const callParams = params as { name?: unknown; arguments?: unknown } | undefined;
      const name = typeof callParams?.name === 'string' ? callParams.name : undefined;
      const args = callParams?.arguments;

      if (!name || !(name in TOOL_HANDLERS)) {
        return jsonResponse(errorResponse(id, METHOD_NOT_FOUND, `Unknown tool: ${name ?? '(missing)'}`), cors);
      }

      const schema = TOOL_INPUT_SCHEMAS[name];
      const validation = schema.safeParse(args);
      if (!validation.success) {
        return jsonResponse(
          errorResponse(id, INVALID_PARAMS, 'Invalid tool arguments', validation.error.format()),
          cors,
        );
      }

      const start = performance.now();
      let result: unknown = null;
      let toolError: unknown = null;
      try {
        result = await TOOL_HANDLERS[name](validation.data, ctx);
        // MCP spec: `tools/call` result must be a CallToolResult, not the
        // tool's payload directly. Anthropic's MCP client validates against
        // this shape and surfaces a generic "Error occurred during tool
        // execution" if the envelope is wrong, even when the HTTP status is
        // 200 and the payload is well-formed JSON. isError stays false on
        // every successful response since wrapToolBoundary already converts
        // throws into structured fallback objects.
        const toolResult = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result),
            },
          ],
          isError: false as const,
        };
        return jsonResponse(successResponse(id, toolResult), cors);
      } catch (err) {
        toolError = err instanceof Error ? { message: err.message } : err;
        throw err;
      } finally {
        const latencyMs = performance.now() - start;
        // Fire-and-forget: never await, never crash the response path.
        void logToolCall({
          toolName: name,
          sourceAssistant,
          sourceIp,
          requestId,
          arguments: validation.data,
          result,
          error: toolError,
          latencyMs,
        }).catch((err) => console.error('[mcp.route] logToolCall failed:', err));
      }
    }

    return jsonResponse(errorResponse(id, METHOD_NOT_FOUND, `Unknown method: ${method}`), cors);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return jsonResponse(errorResponse(id, INTERNAL_ERROR, 'Internal error', message), cors);
  }
}
