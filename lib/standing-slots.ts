/**
 * Standing-slots shared types and server helpers.
 *
 * A standing_slot is a customer's persistent "ping me when X opens" alert.
 * They can target a specific business, a category, or both; the matching
 * RPC fires when a flash_sale lands that satisfies day_mask + price +
 * time window.
 */

import { z } from 'zod';

export const TIME_HHMM = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

export const StandingSlotCreateSchema = z.object({
  business_id: z.string().uuid().nullable().optional(),
  service_id: z.string().uuid().nullable().optional(), // accepted, not yet persisted
  category: z.string().min(1).max(64).nullable().optional(),
  max_price_cents: z.number().int().min(0).max(10_000_00),
  day_mask: z.number().int().min(0).max(127),
  time_start: z.string().regex(TIME_HHMM, 'time_start must be HH:MM'),
  time_end: z.string().regex(TIME_HHMM, 'time_end must be HH:MM'),
  city: z.string().min(1).max(80).nullable().optional(),
  radius_km: z.number().int().min(0).max(200).optional(),
});

export const StandingSlotPatchSchema = z.object({
  active: z.boolean().optional(),
  paused_until: z.string().datetime().nullable().optional(),
  max_price_cents: z.number().int().min(0).max(10_000_00).optional(),
  day_mask: z.number().int().min(0).max(127).optional(),
  time_start: z.string().regex(TIME_HHMM).optional(),
  time_end: z.string().regex(TIME_HHMM).optional(),
});

export type StandingSlotCreate = z.infer<typeof StandingSlotCreateSchema>;
export type StandingSlotPatch = z.infer<typeof StandingSlotPatchSchema>;

export interface StandingSlotRow {
  id: string;
  customer_id: string;
  business_id: string | null;
  category: string | null;
  max_price_cents: number;
  day_mask: number;
  time_start: string;
  time_end: string;
  city: string | null;
  radius_km: number;
  active: boolean;
  matched_count: number;
  paused_until: string | null;
  last_notified_at: string | null;
  created_at: string;
}

/**
 * Day-mask bit positions match Postgres EXTRACT(DOW): 0 = Sunday, 1 = Monday, … 6 = Saturday.
 * The UI presents Monday-first; conversion happens at the form edge.
 */
export const DAY_MASK_BITS = {
  sun: 1,
  mon: 2,
  tue: 4,
  wed: 8,
  thu: 16,
  fri: 32,
  sat: 64,
} as const;

export const ALL_DAYS_MASK = 127;
