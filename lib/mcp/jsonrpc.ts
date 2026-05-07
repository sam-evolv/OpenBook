// JSON-RPC 2.0 helpers for the MCP endpoint.

export const PARSE_ERROR = -32700;
export const INVALID_REQUEST = -32600;
export const METHOD_NOT_FOUND = -32601;
export const INVALID_PARAMS = -32602;
export const INTERNAL_ERROR = -32603;
export const RATE_LIMITED = -32000;

export type JsonRpcId = string | number | null;

export type JsonRpcRequest = {
  jsonrpc: '2.0';
  id: JsonRpcId;
  method: string;
  params?: unknown;
};

export type JsonRpcSuccess = {
  jsonrpc: '2.0';
  id: JsonRpcId;
  result: unknown;
};

export type JsonRpcErrorPayload = {
  code: number;
  message: string;
  data?: unknown;
};

export type JsonRpcErrorResponse = {
  jsonrpc: '2.0';
  id: JsonRpcId;
  error: JsonRpcErrorPayload;
};

export type JsonRpcResponse = JsonRpcSuccess | JsonRpcErrorResponse;

// Returned by parseRequest when the body cannot be coerced into a request.
export type JsonRpcParseFailure = {
  ok: false;
  response: JsonRpcErrorResponse;
};

export type JsonRpcParseSuccess = {
  ok: true;
  request: JsonRpcRequest;
};

export function parseRequest(body: unknown): JsonRpcParseSuccess | JsonRpcParseFailure {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return {
      ok: false,
      response: errorResponse(null, INVALID_REQUEST, 'Invalid JSON-RPC request'),
    };
  }

  const obj = body as Record<string, unknown>;
  const rawId = obj.id;
  const id: JsonRpcId =
    typeof rawId === 'string' || typeof rawId === 'number' || rawId === null ? rawId : null;

  if (obj.jsonrpc !== '2.0') {
    return {
      ok: false,
      response: errorResponse(id, INVALID_REQUEST, 'Invalid JSON-RPC version'),
    };
  }

  if (typeof obj.method !== 'string') {
    return {
      ok: false,
      response: errorResponse(id, INVALID_REQUEST, 'Missing or invalid method'),
    };
  }

  return {
    ok: true,
    request: {
      jsonrpc: '2.0',
      id,
      method: obj.method,
      params: obj.params,
    },
  };
}

export function successResponse(id: JsonRpcId, result: unknown): JsonRpcSuccess {
  return { jsonrpc: '2.0', id, result };
}

export function errorResponse(
  id: JsonRpcId,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcErrorResponse {
  const error: JsonRpcErrorPayload = { code, message };
  if (data !== undefined) error.data = data;
  return { jsonrpc: '2.0', id, error };
}
