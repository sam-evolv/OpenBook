// Tool handler registry. All eight MCP tools (Section 5) are now real;
// the `not_implemented` placeholder has been retired.

import { getBusinessInfoHandler } from './get-business-info';
import { getAvailabilityHandler } from './get-availability';
import { searchBusinessesHandler } from './search-businesses';
import { holdAndCheckoutHandler } from './hold-and-checkout';
import { checkBookingStatusHandler } from './check-booking-status';
import { joinWaitlistHandler } from './join-waitlist';
import { getPromotedInventoryHandler } from './get-promoted-inventory';
import { recordPostBookingFeedbackHandler } from './record-post-booking-feedback';

export type ToolContext = {
  sourceAssistant: string;
  sourceIp: string | null;
  requestId: string;
};

export type ToolHandler = (input: unknown, ctx: ToolContext) => Promise<unknown>;

export const TOOL_HANDLERS: Record<string, ToolHandler> = {
  search_businesses: searchBusinessesHandler,
  get_business_info: getBusinessInfoHandler,
  get_availability: getAvailabilityHandler,
  hold_and_checkout: holdAndCheckoutHandler,
  check_booking_status: checkBookingStatusHandler,
  join_waitlist: joinWaitlistHandler,
  get_promoted_inventory: getPromotedInventoryHandler,
  record_post_booking_feedback: recordPostBookingFeedbackHandler,
};
