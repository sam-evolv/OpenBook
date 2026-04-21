import { TILE_PALETTE_MAP, type TileColourSlug } from '@/lib/tile-palette';

/**
 * 8-slug gold-safe palette for multi-staff colour coding on the Calendar.
 * Gold and amber are excluded — too close to brand gold and would mute
 * booking blocks against gold UI elements (sparkle highlights, "Live"
 * badges, quiet-zone nudges).
 *
 * 8 buckets gives us head-room for small-team businesses: a 6-staff
 * business hitting pairwise collisions has probability ≈ 1 − (8!/(2!·8^6))
 * ≈ 55%, but that's collision *frequency*, not problem severity —
 * a collision just means two staff render in the same default colour
 * until the owner overrides via the Team page picker (PR 3.3).
 */
export const STAFF_COLOUR_PALETTE: readonly TileColourSlug[] = [
  'violet',
  'rose',
  'emerald',
  'azure',
  'teal',
  'indigo',
  'crimson',
  'orchid',
];

/**
 * FNV-1a 32-bit hash. Short + fast + decent distribution for UUIDs.
 * We don't need cryptographic strength — just a stable mapping from
 * staff.id (UUID) to a palette index.
 */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export interface StaffColourInput {
  id: string;
  colour?: string | null;
}

/**
 * Resolve a staff member's display colour. Prefers an explicit slug from
 * staff.colour (set via the Team page picker in PR 3.3); falls back to a
 * deterministic hash of staff.id into the gold-safe palette so Calendar
 * looks coloured from day one.
 */
export function colourForStaff(staff: StaffColourInput): TileColourSlug {
  if (staff.colour && staff.colour in TILE_PALETTE_MAP) {
    return staff.colour as TileColourSlug;
  }
  const idx = fnv1a(staff.id) % STAFF_COLOUR_PALETTE.length;
  return STAFF_COLOUR_PALETTE[idx]!;
}

/** Convenience: the tile-palette entry (mid / light / dark hex values). */
export function colourTokensForStaff(staff: StaffColourInput) {
  return TILE_PALETTE_MAP[colourForStaff(staff)];
}

/**
 * Smoke-testable distribution over an arbitrary set of ids. Used by the
 * standalone hash check in stage-1 sub-prereqs verification.
 */
export function hashDistribution(ids: string[]): Record<TileColourSlug, number> {
  const counts = Object.fromEntries(
    STAFF_COLOUR_PALETTE.map((s) => [s, 0]),
  ) as Record<TileColourSlug, number>;
  for (const id of ids) {
    counts[colourForStaff({ id })]++;
  }
  return counts;
}
