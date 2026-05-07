// Tool handler stubs. Each returns { error: 'not_implemented' }; real
// behaviour lands in subsequent PRs (one per tool, per the build plan
// in docs/mcp-server-spec.md section 15.1).

export type ToolContext = {
  sourceAssistant: string;
  sourceIp: string | null;
  requestId: string;
};

export type ToolHandler = (input: unknown, ctx: ToolContext) => Promise<unknown>;

const notImplemented: ToolHandler = async () => ({ error: 'not_implemented' });

export const TOOL_HANDLERS: Record<string, ToolHandler> = {
  search_businesses: notImplemented,
  get_business_info: notImplemented,
  get_availability: notImplemented,
  hold_and_checkout: notImplemented,
  check_booking_status: notImplemented,
  join_waitlist: notImplemented,
  get_promoted_inventory: notImplemented,
  record_post_booking_feedback: notImplemented,
};
