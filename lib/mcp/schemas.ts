// Zod schemas for the MCP tool inputs and outputs.
// Matches docs/mcp-server-spec.md sections 5.2–5.9 verbatim.

import { z } from 'zod';

const sourceAssistant = z.enum(['chatgpt', 'claude', 'gemini', 'siri', 'other']);

const customerContext = z
  .object({
    preferences: z.array(z.string()).optional(),
    constraints: z.array(z.string()).optional(),
    party_size: z.number().optional(),
    mood_or_vibe: z.string().optional(),
    prior_experience: z.string().optional(),
  })
  .optional();

const customerHints = z
  .object({
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    notes: z.string().optional(),
    party_size: z.number().optional(),
    accessibility_needs: z.string().optional(),
  })
  .optional();

const promotedKind = z.enum(['standard', 'flash_sale']);
const photoKind = z.enum(['interior', 'exterior', 'service', 'team']);

// 5.2 search_businesses
export const searchBusinessesInput = z.object({
  intent: z.string(),
  location: z.string().optional(),
  when: z.string().optional(),
  price_max_eur: z.number().optional(),
  customer_context: customerContext,
  limit: z.number().min(1).max(10).default(5).optional(),
});

const sampleSlot = z.object({
  service_id: z.string().uuid(),
  service_name: z.string(),
  start_iso: z.string().datetime(),
  duration_minutes: z.number(),
  price_eur: z.number(),
  deposit_eur: z.number().optional(),
  promoted: z
    .object({
      kind: promotedKind,
      original_price_eur: z.number().optional(),
      discount_percent: z.number().optional(),
      message: z.string().optional(),
    })
    .optional(),
});

export const searchBusinessesOutput = z.object({
  results: z.array(
    z.object({
      slug: z.string(),
      name: z.string(),
      category: z.string(),
      short_description: z.string().max(140).optional(),
      location_summary: z.string(),
      rating: z
        .object({
          average: z.number(),
          count: z.number(),
        })
        .optional(),
      sample_slots: z.array(sampleSlot),
      why_recommended: z.string().optional(),
      booking_url_hint: z.string(),
    }),
  ),
  query_id: z.string().uuid(),
  notes: z.string().optional(),
});

// 5.3 get_business_info
export const getBusinessInfoInput = z.object({
  slug: z.string(),
});

export const getBusinessInfoOutput = z.object({
  business_id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  full_description: z.string().max(1000),
  category: z.string(),
  address: z.object({
    line_1: z.string(),
    line_2: z.string().optional(),
    city: z.string(),
    county: z.string(),
    eircode: z.string().optional(),
  }),
  hours: z.array(
    z.object({
      day_of_week: z.number(),
      opens: z.string(),
      closes: z.string(),
    }),
  ),
  closures_upcoming: z.array(
    z.object({
      starts: z.string().datetime(),
      ends: z.string().datetime(),
      reason: z.string().optional(),
    }),
  ),
  services: z.array(
    z.object({
      service_id: z.string().uuid(),
      name: z.string(),
      description: z.string().optional(),
      duration_minutes: z.number(),
      price_eur: z.number(),
      deposit_eur: z.number().optional(),
      cancellation_policy: z.string().optional(),
    }),
  ),
  rating: z
    .object({
      average: z.number(),
      count: z.number(),
    })
    .optional(),
  recent_review_highlights: z.array(z.string()).optional(),
  space: z
    .object({
      description: z.string().optional(),
      photos: z.array(
        z.object({
          url: z.string(),
          caption: z.string().optional(),
          kind: photoKind,
        }),
      ),
      amenities: z.array(z.string()).optional(),
      accessibility_notes: z.string().optional(),
      parking: z.string().optional(),
      nearest_landmark: z.string().optional(),
      public_transport: z.string().optional(),
    })
    .optional(),
  website_url: z.string().optional(),
  contact_phone: z.string().optional(),
});

// 5.4 get_availability
export const getAvailabilityInput = z.object({
  slug: z.string(),
  service_id: z.string().uuid(),
  date_from: z.string(),
  date_to: z.string().optional(),
});

export const getAvailabilityOutput = z.object({
  business: z.object({
    slug: z.string(),
    name: z.string(),
  }),
  service: z.object({
    service_id: z.string().uuid(),
    name: z.string(),
    duration_minutes: z.number(),
    price_eur: z.number(),
    deposit_eur: z.number().optional(),
  }),
  slots: z.array(
    z.object({
      start_iso: z.string().datetime(),
      end_iso: z.string().datetime(),
      promoted: z
        .object({
          kind: promotedKind,
          discount_percent: z.number().optional(),
          message: z.string().optional(),
        })
        .optional(),
    }),
  ),
  timezone: z.literal('Europe/Dublin'),
  notes: z.string().optional(),
});

// 5.5 hold_and_checkout
export const holdAndCheckoutInput = z.object({
  slug: z.string(),
  service_id: z.string().uuid(),
  start_iso: z.string().datetime(),
  customer_hints: customerHints,
  source_assistant: sourceAssistant.optional(),
});

export const holdAndCheckoutOutput = z.object({
  hold_id: z.string().uuid(),
  polling_token: z.string(),
  expires_at: z.string().datetime(),
  checkout_url: z.string(),
  summary: z.object({
    business_name: z.string(),
    service_name: z.string(),
    start_iso: z.string().datetime(),
    start_human: z.string(),
    duration_minutes: z.number(),
    price_eur: z.number(),
    deposit_eur: z.number().optional(),
    is_free: z.boolean(),
    payment_mode: z.enum(['stripe_now', 'in_person']),
  }),
  next_step_for_user: z.string(),
});

// 5.6 check_booking_status
export const checkBookingStatusInput = z.object({
  polling_token: z.string(),
});

export const checkBookingStatusOutput = z.object({
  status: z.enum(['pending_payment', 'confirmed', 'expired', 'failed']),
  booking: z
    .object({
      booking_id: z.string().uuid(),
      business_name: z.string(),
      business_slug: z.string(),
      service_name: z.string(),
      start_iso: z.string().datetime(),
      end_iso: z.string().datetime(),
      price_paid_eur: z.number(),
      address_for_directions: z.string(),
      business_phone: z.string().optional(),
      cancellation_policy: z.string().optional(),
      // Optional defensively: a confirmed booking should always have a
      // customer_id (the /c/[token] checkout backfills it before the
      // PaymentIntent is created), but if a row is somehow confirmed
      // without one we omit this field rather than emit an empty string.
      confirmation_email_sent_to: z.string().optional(),
    })
    .optional(),
  next_step_for_user: z.string().optional(),
});

// 5.7 join_waitlist
export const joinWaitlistInput = z.object({
  slug: z.string(),
  service_id: z.string().uuid().optional(),
  preferred_window: z.object({
    starts_iso: z.string().datetime(),
    ends_iso: z.string().datetime(),
  }),
  contact: z.object({
    phone: z.string().optional(),
    email: z.string().optional(),
  }),
  customer_hints: z
    .object({
      name: z.string().optional(),
      notes: z.string().optional(),
      accessibility_needs: z.string().optional(),
    })
    .optional(),
  expires_at: z.string().datetime().optional(),
});

export const joinWaitlistOutput = z.object({
  waitlist_id: z.string().uuid(),
  notification_channels: z.array(z.enum(['sms', 'email', 'push'])),
  expires_at: z.string().datetime(),
  next_step_for_user: z.string(),
});

// 5.8 get_promoted_inventory
export const getPromotedInventoryInput = z.object({
  location: z.string().optional(),
  when: z.string().optional(),
  category: z.string().optional(),
  kinds: z.array(promotedKind).optional(),
  limit: z.number().min(1).max(10).default(5).optional(),
});

export const getPromotedInventoryOutput = z.object({
  results: z.array(
    z.object({
      slug: z.string(),
      name: z.string(),
      category: z.string(),
      location_summary: z.string(),
      promoted_slots: z.array(
        z.object({
          service_id: z.string().uuid(),
          service_name: z.string(),
          start_iso: z.string().datetime(),
          duration_minutes: z.number(),
          original_price_eur: z.number(),
          promoted_price_eur: z.number(),
          kind: promotedKind,
          discount_percent: z.number().optional(),
          message: z.string().optional(),
          slots_remaining: z.number(),
        }),
      ),
    }),
  ),
  query_id: z.string().uuid(),
  disclosure_required: z.literal(true),
});

// 5.9 record_post_booking_feedback
export const recordPostBookingFeedbackInput = z.object({
  booking_id: z.string().uuid(),
  inferred_rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
  verbatim: z.string().optional(),
  showed_up: z.boolean().optional(),
  would_rebook: z.boolean().optional(),
});

export const recordPostBookingFeedbackOutput = z.object({
  acknowledged: z.literal(true),
  thanks_message: z.string().optional(),
});

// Diagnostic tools (gated behind MCP_ENABLE_DEBUG_TOOLS=true).
// REMOVE BEFORE PRODUCTION GA.
export const debugOpenbookHealthInput = z.object({}).passthrough();
export const debugOpenbookSearchSmokeInput = z.object({}).passthrough();
