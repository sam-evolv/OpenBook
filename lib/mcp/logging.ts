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

export type SearchQueryLog = {
  queryId: string;
  sourceAssistant: string | null;
  intentText: string;
  parsedCategory: string | null;
  parsedLocation: string | null;
  parsedWhen: Date | null;
  customerContext: unknown;
  resultCount: number;
  resultBusinessIds: string[];
};

export async function logSearchQuery(args: SearchQueryLog): Promise<void> {
  try {
    const { error } = await supabaseAdmin().from('mcp_query_log').insert({
      query_id: args.queryId,
      source_assistant: args.sourceAssistant,
      intent_text: args.intentText,
      parsed_category: args.parsedCategory,
      parsed_location: args.parsedLocation,
      parsed_when: args.parsedWhen ? args.parsedWhen.toISOString() : null,
      customer_context: truncateJson(args.customerContext),
      result_count: args.resultCount,
      result_business_ids: args.resultBusinessIds,
      led_to_hold: false,
      led_to_booking: false,
      led_to_waitlist: false,
    });
    if (error) console.error('[mcp.logging] query log insert failed:', error);
  } catch (err) {
    console.error('[mcp.logging] query log insert threw:', err);
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
