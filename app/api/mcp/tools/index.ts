// Tool handler registry. Real handlers replace the not_implemented stubs
// one at a time; the remaining stubs stay until their PR lands (per the
// build plan in docs/mcp-server-spec.md section 15.1).

import { getBusinessInfoHandler } from './get-business-info';
import { getAvailabilityHandler } from './get-availability';
import { searchBusinessesHandler } from './search-businesses';
import { holdAndCheckoutHandler } from './hold-and-checkout';
import { checkBookingStatusHandler } from './check-booking-status';
import { joinWaitlistHandler } from './join-waitlist';

export type ToolContext = {
  sourceAssistant: string;
  sourceIp: string | null;
  requestId: string;
};

export type ToolHandler = (input: unknown, ctx: ToolContext) => Promise<unknown>;

const notImplemented: ToolHandler = async () => ({ error: 'not_implemented' });

export const TOOL_HANDLERS: Record<string, ToolHandler> = {
  search_businesses: searchBusinessesHandler,
  get_business_info: getBusinessInfoHandler,
  get_availability: getAvailabilityHandler,
  hold_and_checkout: holdAndCheckoutHandler,
  check_booking_status: checkBookingStatusHandler,
  join_waitlist: joinWaitlistHandler,
  get_promoted_inventory: notImplemented,
  record_post_booking_feedback: notImplemented,
};
