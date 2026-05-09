// Defensive serialization and exception-boundary helpers for MCP tools.
//
// The OpenBook MCP server hand-rolls JSON-RPC dispatch in app/api/mcp/route.ts.
// When a tool handler threw an unexpected error, the dispatcher converted it
// to a JSON-RPC INTERNAL_ERROR; agentic clients (Claude desktop, the Python
// MCP SDK) surface that as a generic ToolError that disrupts the conversation
// rather than degrades it.
//
// The helpers here let each tool:
//   1. Wrap its body in a top-level boundary that returns a shape-appropriate
//      fallback object on throw, so the client always sees a structured
//      response.
//   2. Run parallel fan-outs with per-task fault isolation, so one failed
//      Supabase RPC does not reject the whole Promise.all.
//   3. Coerce the response through jsonSafe before returning, so accidental
//      Date / BigInt / circular shapes do not blow up JSON.stringify.

type ToolCtx = {
  sourceAssistant: string;
  sourceIp: string | null;
  requestId: string;
};

type Handler = (input: unknown, ctx: ToolCtx) => Promise<unknown>;

// Recursively coerce a value into a JSON.stringify-safe equivalent.
//
// Supabase JS already returns dates as ISO strings, decimals as numbers, and
// UUIDs as strings, so this is mostly defensive. The cases that do matter:
//   - Date instances (from custom code paths) become ISO strings.
//   - BigInt becomes a string. JSON.stringify throws on BigInt.
//   - NaN / Infinity become null. JSON.stringify emits null for these.
//   - undefined is omitted from objects. JSON.stringify drops them.
//   - Circular references resolve to '[circular]' instead of throwing.
//   - Set / Map are flattened to array / plain-object.
//   - Functions and Symbols are stripped.
export function jsonSafe(value: unknown, _visited: WeakSet<object> = new WeakSet()): unknown {
  if (value === null || value === undefined) return value;

  const t = typeof value;
  if (t === 'string' || t === 'boolean') return value;
  if (t === 'number') {
    const n = value as number;
    return Number.isFinite(n) ? n : null;
  }
  if (t === 'bigint') return (value as bigint).toString();
  if (t === 'symbol' || t === 'function') return undefined;

  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? null : value.toISOString();
  }

  if (typeof value !== 'object') return String(value);

  const obj = value as object;
  if (_visited.has(obj)) return '[circular]';
  _visited.add(obj);

  if (Array.isArray(value)) {
    return value.map((v) => {
      const safe = jsonSafe(v, _visited);
      return safe === undefined ? null : safe;
    });
  }

  if (value instanceof Set) {
    return Array.from(value).map((v) => jsonSafe(v, _visited));
  }
  if (value instanceof Map) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of value) {
      const safe = jsonSafe(v, _visited);
      if (safe !== undefined) out[String(k)] = safe;
    }
    return out;
  }

  // Plain object or class instance. Use Object.keys to skip symbol-keyed and
  // non-enumerable properties (matches JSON.stringify behaviour).
  const record = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(record)) {
    const safe = jsonSafe(record[key], _visited);
    if (safe !== undefined) out[key] = safe;
  }
  return out;
}

// Structured error description for log lines.
export function describeException(err: unknown): Record<string, unknown> {
  if (err instanceof AggregateError) {
    return {
      type: 'AggregateError',
      message: err.message,
      sub_exceptions: err.errors.map((e) => describeException(e)),
    };
  }
  if (err instanceof Error) {
    return {
      type: err.name,
      message: err.message,
      stack: err.stack,
    };
  }
  if (err && typeof err === 'object') {
    return { type: 'object', value: err as Record<string, unknown> };
  }
  return { type: typeof err, value: String(err) };
}

// Fault-isolating wrapper for parallel fan-out. Equivalent in spirit to
// Promise.allSettled but logs the failure and returns null for the failing
// child so the caller can keep iterating without explicit settled-result
// shape gymnastics.
//
// Accepts PromiseLike rather than Promise so that Supabase query builders
// (which are thenables, not strict Promises) can be passed in directly.
export async function safeTask<T>(name: string, p: PromiseLike<T>): Promise<T | null> {
  try {
    return await p;
  } catch (err) {
    console.error(`[openbook.task] ${name} failed:`, describeException(err));
    return null;
  }
}

// Top-level exception boundary for an MCP tool. The implementation function
// runs as before; a thrown error is logged with full context and the supplied
// fallback shape is returned in its place. The successful return value is
// passed through jsonSafe so any stray non-JSON values are coerced.
export function wrapToolBoundary(
  name: string,
  fallbackFactory: () => unknown,
  impl: Handler,
): Handler {
  return async (input, ctx) => {
    try {
      const result = await impl(input, ctx);
      return jsonSafe(result);
    } catch (err) {
      console.error(
        `[mcp.${name}] outermost boundary caught exception. Returning fallback. error=`,
        describeException(err),
      );
      return jsonSafe(fallbackFactory());
    }
  };
}
