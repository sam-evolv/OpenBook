// Tool handler registry. All eight MCP tools (Section 5) are now real;
// the `not_implemented` placeholder has been retired.
//
// Two diagnostic tools (debug_openbook_health, debug_openbook_search_smoke)
// register only when MCP_ENABLE_DEBUG_TOOLS=true. REMOVE BEFORE PRODUCTION GA.

import { getBusinessInfoHandler } from './get-business-info';
import { getAvailabilityHandler } from './get-availability';
import { searchBusinessesHandler } from './search-businesses';
import { holdAndCheckoutHandler } from './hold-and-checkout';
import { checkBookingStatusHandler } from './check-booking-status';
import { joinWaitlistHandler } from './join-waitlist';
import { getPromotedInventoryHandler } from './get-promoted-inventory';
import { recordPostBookingFeedbackHandler } from './record-post-booking-feedback';
import {
  DEBUG_TOOLS_ENABLED,
  debugOpenbookHealthHandler,
  debugOpenbookSearchSmokeHandler,
} from './debug';

export type ToolContext = {
  sourceAssistant: string;
  sourceIp: string | null;
  requestId: string;
};

export type ToolHandler = (input: unknown, ctx: ToolContext) => Promise<unknown>;

const baseHandlers: Record<string, ToolHandler> = {
  search_businesses: searchBusinessesHandler,
  get_business_info: getBusinessInfoHandler,
  get_availability: getAvailabilityHandler,
  hold_and_checkout: holdAndCheckoutHandler,
  check_booking_status: checkBookingStatusHandler,
  join_waitlist: joinWaitlistHandler,
  get_promoted_inventory: getPromotedInventoryHandler,
  record_post_booking_feedback: recordPostBookingFeedbackHandler,
};

const debugHandlers: Record<string, ToolHandler> = DEBUG_TOOLS_ENABLED
  ? {
      debug_openbook_health: debugOpenbookHealthHandler,
      debug_openbook_search_smoke: debugOpenbookSearchSmokeHandler,
    }
  : {};

export const TOOL_HANDLERS: Record<string, ToolHandler> = {
  ...baseHandlers,
  ...debugHandlers,
};
