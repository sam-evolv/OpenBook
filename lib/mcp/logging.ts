// Tool-call logging into mcp_tool_calls.
// Fire-and-forget: logging failures must never block or fail the response.

import { supabaseAdmin } from '../supabase';

const MAX_JSON_BYTES = 64 * 1024;

function truncateJson(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  try {
    const json = JSON.stringify(value);
    if (json.length <= MAX_JSON_BYTES) return value;
    return { _truncated: true, _original_bytes: json.length, preview: json.slice(0, MAX_JSON_BYTES) };
  } catch {
    return { _truncated: true, _reason: 'unserialisable' };
  }
}

export async function logToolCall(args: {
  toolName: string;
  sourceAssistant: string | null;
  sourceIp: string | null;
  requestId: string | null;
  arguments: unknown;
  result: unknown | null;
  error: unknown | null;
  latencyMs: number;
}): Promise<void> {
  try {
    const { error } = await supabaseAdmin()
      .from('mcp_tool_calls')
      .insert({
        tool_name: args.toolName,
        source_assistant: args.sourceAssistant,
        source_ip: args.sourceIp,
        request_id: args.requestId,
        arguments: truncateJson(args.arguments),
        result: args.result === null ? null : truncateJson(args.result),
        error: args.error === null ? null : truncateJson(args.error),
        latency_ms: Math.round(args.latencyMs),
      });
    if (error) {
      console.error('[mcp.logging] insert failed:', error);
    }
  } catch (err) {
    console.error('[mcp.logging] insert threw:', err);
  }
}
