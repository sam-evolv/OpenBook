// MCP `tools/list` manifest. Tool descriptions are taken verbatim from
// docs/mcp-server-spec.md sections 5.2–5.9. Annotations follow the spec
// for each tool. Input schemas are JSON Schema (Draft-7) generated from
// the Zod input schemas in ./schemas.ts.

import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  searchBusinessesInput,
  getBusinessInfoInput,
  getAvailabilityInput,
  holdAndCheckoutInput,
  checkBookingStatusInput,
  joinWaitlistInput,
  getPromotedInventoryInput,
  recordPostBookingFeedbackInput,
} from './schemas';

export type ToolDescriptor = {
  name: string;
  description: string;
  inputSchema: object;
  annotations: {
    readOnlyHint: boolean;
    destructiveHint: boolean;
    openWorldHint: boolean;
  };
};

const toJsonSchema = (schema: Parameters<typeof zodToJsonSchema>[0]) =>
  zodToJsonSchema(schema, { target: 'jsonSchema7' }) as object;

export const TOOL_MANIFEST: ToolDescriptor[] = [
  {
    name: 'search_businesses',
    description:
      "Search for local Irish service businesses (gyms, salons, barbers, spas, physios, yoga studios, classes, experiences) that are bookable now. Use this when the user expresses any intent that could plausibly be served by a local business, including vague intents like \"fun things to do\" or \"somewhere relaxing.\" Pass the user's free-text request in `intent` (required, e.g. \"personal trainer in Dublin\"). Optionally pass `location` separately if you have a clean city or neighbourhood (e.g. \"Dublin 2\"), and any structured detail in `customer_context` — physical considerations, dietary requirements, accessibility needs, preferences, mood, budget, group size — so we can match them to suitable businesses and pre-fill the booking flow. This tool always returns a `results` array (possibly empty with a `notes` hint) and never an error — even if no businesses match, you'll get an empty list and guidance for refining the search.",
    inputSchema: toJsonSchema(searchBusinessesInput),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: true,
    },
  },
  {
    name: 'get_business_info',
    description:
      'Get full details about a specific business, including services, opening hours, address, photos of the space, accessibility information, parking, and nearby landmarks. Use this when the user asks "tell me more about X" or wants to evaluate a business before booking.',
    inputSchema: toJsonSchema(getBusinessInfoInput),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  {
    name: 'get_availability',
    description:
      'Given a business and service, return precise available slots over a date range.',
    inputSchema: toJsonSchema(getAvailabilityInput),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  {
    name: 'hold_and_checkout',
    description:
      'Hold a specific slot for 10 minutes and generate a one-tap checkout link the user opens in their browser to complete payment. Use after the user has chosen a specific slot. Always pass `customer_hints` with everything relevant from the conversation — name, email, phone if shared, special requirements, accessibility needs — so the checkout page can pre-fill and the business can prepare.',
    inputSchema: toJsonSchema(holdAndCheckoutInput),
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true,
    },
  },
  {
    name: 'check_booking_status',
    description:
      'Check whether a booking has been confirmed, expired, or is still pending payment. Call this after `hold_and_checkout` to follow up with the user — typically 30 to 90 seconds later, or whenever the user\'s message suggests they may have completed payment ("done", "booked", "paid"). Returns booking details on confirmation so you can confirm to the user, suggest a calendar invite, offer a route, or set a reminder.',
    inputSchema: toJsonSchema(checkBookingStatusInput),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  {
    name: 'join_waitlist',
    description:
      'Add the user to the waitlist for a specific business and time window when their preferred slot isn\'t available. Returns a notification token. We send an SMS or push notification if a matching slot opens, with a one-tap booking link. Use when the user has expressed a strong preference for a specific time and alternatives don\'t fit.',
    inputSchema: toJsonSchema(joinWaitlistInput),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  {
    name: 'get_promoted_inventory',
    description:
      'Surface time slots that local businesses are actively promoting — last-minute openings, flash sales, or curated availability. Use when the user asks "what\'s available right now," "any good deals," "anything fun tonight," or expresses open-ended local discovery intent. Promoted slots are clearly labelled in the response and the assistant should disclose to the user when a slot is discounted.',
    inputSchema: toJsonSchema(getPromotedInventoryInput),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  {
    name: 'record_post_booking_feedback',
    description:
      'Record the user\'s feedback after a booking has happened. Call this when the user mentions how a booking went, either spontaneously ("the session was great") or when you\'ve prompted ("how was it?"). Pass through the user\'s verbatim sentiment in `verbatim` and your inferred rating. Use the booking_id from a previous `check_booking_status` response.',
    inputSchema: toJsonSchema(recordPostBookingFeedbackInput),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
];
