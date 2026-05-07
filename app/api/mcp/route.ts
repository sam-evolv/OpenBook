// MCP endpoint — protocol shell.
// Implements `initialize`, `tools/list`, and `tools/call` dispatch per
// docs/mcp-server-spec.md sections 4 and 5. Tool handlers are stubs in
// this PR; rate limiting and tool-call logging arrive in PR 5b.

import { z } from 'zod';
import {
  PARSE_ERROR,
  METHOD_NOT_FOUND,
  INVALID_PARAMS,
  INTERNAL_ERROR,
  errorResponse,
  successResponse,
  parseRequest,
  type JsonRpcResponse,
} from '../../../lib/mcp/jsonrpc';
import { TOOL_MANIFEST } from '../../../lib/mcp/manifest';
import { detectSourceAssistant } from '../../../lib/mcp/source-assistant';
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

const SERVER_INFO = {
  name: 'OpenBook',
  version: '1.0.0',
  protocolVersion: '2025-06-18',
  capabilities: { tools: {} },
};

function jsonResponse(payload: JsonRpcResponse): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(errorResponse(null, PARSE_ERROR, 'Parse error'));
  }

  const parsed = parseRequest(body);
  if (!parsed.ok) {
    return jsonResponse(parsed.response);
  }
  const { id, method, params } = parsed.request;

  const sourceAssistant = detectSourceAssistant(request.headers);
  const sourceIp = request.headers.get('x-forwarded-for');
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const ctx: ToolContext = { sourceAssistant, sourceIp, requestId };

  try {
    if (method === 'initialize') {
      return jsonResponse(successResponse(id, SERVER_INFO));
    }

    if (method === 'tools/list') {
      return jsonResponse(successResponse(id, { tools: TOOL_MANIFEST }));
    }

    if (method === 'tools/call') {
      const callParams = params as { name?: unknown; arguments?: unknown } | undefined;
      const name = typeof callParams?.name === 'string' ? callParams.name : undefined;
      const args = callParams?.arguments;

      if (!name || !(name in TOOL_HANDLERS)) {
        return jsonResponse(errorResponse(id, METHOD_NOT_FOUND, `Unknown tool: ${name ?? '(missing)'}`));
      }

      const schema = TOOL_INPUT_SCHEMAS[name];
      const validation = schema.safeParse(args);
      if (!validation.success) {
        return jsonResponse(
          errorResponse(id, INVALID_PARAMS, 'Invalid tool arguments', validation.error.format()),
        );
      }

      const result = await TOOL_HANDLERS[name](validation.data, ctx);
      return jsonResponse(successResponse(id, result));
    }

    return jsonResponse(errorResponse(id, METHOD_NOT_FOUND, `Unknown method: ${method}`));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return jsonResponse(errorResponse(id, INTERNAL_ERROR, 'Internal error', message));
  }
}
