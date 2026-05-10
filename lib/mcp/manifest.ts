// MCP `tools/list` manifest. Descriptions are written for the ChatGPT
// App Directory submission flow: narrow user-intent framing, no "any
// intent" or promotional language, no model-steering instructions.
// Annotations follow OpenAI's submission guidance — readOnlyHint,
// openWorldHint, and destructiveHint are set explicitly on every tool.
// Input schemas are JSON Schema (Draft-7) generated from the Zod input
// schemas in ./schemas.ts.

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
      "Search for local Irish service businesses (gyms, salons, barbers, spas, physios, yoga studios, classes, experiences) that have live booking inventory in OpenBook. Use when the user wants to find or book a local service in Ireland. Pass the user's request in `intent` (e.g. \"personal trainer in Dublin\"). Pass `customer_context` with any constraints, accessibility needs, or preferences they shared so we can match suitable businesses and pre-fill checkout. Always returns a `results` array (possibly empty with `notes` guidance); never errors.",
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
      'Get full profile details for a specific business in OpenBook by slug: services, prices, opening hours, address, accessibility, and parking notes. Use when the user wants to evaluate a business before booking, or asks for more detail about one returned by `search_businesses`.',
    inputSchema: toJsonSchema(getBusinessInfoInput),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: true,
    },
  },
  {
    name: 'get_availability',
    description:
      'Return available booking slots for a specific service at a specific business over a date range. Use after the user has chosen a business and service and wants to see times.',
    inputSchema: toJsonSchema(getAvailabilityInput),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: true,
    },
  },
  {
    name: 'hold_and_checkout',
    description:
      "Hold a specific slot for 10 minutes and return a one-tap checkout URL the user opens in their browser to confirm and (if applicable) pay. Use after the user has chosen a specific slot. Pass `customer_hints` with name, email, phone, and any relevant notes from the conversation so the checkout page can pre-fill. The response includes `payment_mode` ('stripe_now' or 'in_person') and a `next_step_for_user` string. Surface that string to the user so they know whether they pay now or at the business on the day.",
    inputSchema: toJsonSchema(holdAndCheckoutInput),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    },
  },
  {
    name: 'check_booking_status',
    description:
      'Check whether a held booking has been confirmed, expired, or is still awaiting payment. Use after `hold_and_checkout` to follow up with the user, typically 30 to 90 seconds later or when their next message implies they may have completed checkout.',
    inputSchema: toJsonSchema(checkBookingStatusInput),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: true,
    },
  },
  {
    name: 'join_waitlist',
    description:
      "Add the user to the waitlist for a specific business and time window when their preferred slot is unavailable. Returns a notification token. We send an SMS or push notification with a one-tap booking link if a matching slot opens before the expiry. Use when the user has expressed a clear preference for a time and the available alternatives don't fit.",
    inputSchema: toJsonSchema(joinWaitlistInput),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    },
  },
  {
    name: 'get_promoted_inventory',
    description:
      "List time slots that businesses are actively promoting in OpenBook (last-minute openings or curated discounts). Use when the user asks what's available now, what's bookable tonight, or wants to discover something local without a specific business in mind. Discounted slots are flagged in the response and should be disclosed to the user as discounted.",
    inputSchema: toJsonSchema(getPromotedInventoryInput),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: true,
    },
  },
  {
    name: 'record_post_booking_feedback',
    description:
      "Record the user's feedback after a booking has happened. Use when the user mentions how it went, either spontaneously or after you asked. Pass their verbatim sentiment and your inferred rating.",
    inputSchema: toJsonSchema(recordPostBookingFeedbackInput),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    },
  },
];
