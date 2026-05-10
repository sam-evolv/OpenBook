// Bridges the intent classifier's canonical short forms (e.g. `nails`,
// `barber`, `yoga`) and the `businesses.category` column's marketing-friendly
// display strings (e.g. `Nail Studio`, `Barbershop`, `Yoga & Pilates`).
//
// PR #141 introduced this helper to fix the personal_training case but
// implicitly assumed every other category followed a snake_case to Title Case
// transform. It does not. Audit of mcp_query_log on 2026-05-09 showed 6 of 7
// live categories silently returning zero results because the synthesised
// "Title Case" variant did not match what was actually stored.
//
// This rewrite is driven by an explicit synonym table. Public API
// (normaliseCategory, categoryEquals, categoryQueryVariants) is unchanged
// so callers in search-businesses, get-promoted-inventory, and the ranker
// continue to work without modification.
//
// To add a new category in the dashboard:
//   1. Add the new business with whatever category string makes sense for display
//   2. Add an entry here mapping the canonical key(s) to that display string
//   3. Add the canonical key to the intent classifier's CANONICAL_CATEGORIES
//   4. Deploy
//
// This is a synonym map, not a 1:1 mapping. One canonical key may map to
// multiple display strings (e.g. `wellness` matches both `Sauna / Spa` and
// `Fitness & Wellness`); one display string is reachable via multiple keys
// (e.g. `Yoga & Pilates` is reached by `yoga` AND `pilates` AND `pilates_class`).

const CATEGORY_SYNONYMS: Record<string, string[]> = {
  // Personal training (live: Personal Training)
  personal_training: ['Personal Training'],
  personal_trainer: ['Personal Training'],
  pt: ['Personal Training'],
  coach: ['Personal Training'],
  coaching: ['Personal Training'],

  // Nails (live: Nail Studio)
  nails: ['Nail Studio'],
  nail: ['Nail Studio'],
  nail_studio: ['Nail Studio'],
  manicure: ['Nail Studio'],
  pedicure: ['Nail Studio'],
  gel_nails: ['Nail Studio'],
  acrylics: ['Nail Studio'],

  // Barber (live: Barbershop)
  barber: ['Barbershop'],
  barbers: ['Barbershop'],
  barbershop: ['Barbershop'],
  haircut_men: ['Barbershop'],
  mens_haircut: ['Barbershop'],

  // Yoga & Pilates (live: Yoga & Pilates)
  yoga: ['Yoga & Pilates'],
  pilates: ['Yoga & Pilates'],
  yoga_class: ['Yoga & Pilates'],
  pilates_class: ['Yoga & Pilates'],
  reformer: ['Yoga & Pilates'],

  // Sauna / Spa (live: Sauna / Spa)
  sauna: ['Sauna / Spa'],
  spa: ['Sauna / Spa'],
  steam_room: ['Sauna / Spa'],
  recovery: ['Sauna / Spa'],

  // Fitness & Wellness (live: Fitness & Wellness)
  fitness: ['Fitness & Wellness'],
  gym: ['Fitness & Wellness'],
  gym_class: ['Fitness & Wellness'],
  workout: ['Fitness & Wellness'],

  // Health & Therapy (live: Health & Therapy)
  physio: ['Health & Therapy'],
  physiotherapy: ['Health & Therapy'],
  therapist: ['Health & Therapy'],
  therapy: ['Health & Therapy'],
  massage: ['Health & Therapy'],
  sports_therapy: ['Health & Therapy'],

  // Cross-category synonyms. `wellness` is genuinely ambiguous between the
  // sauna/spa and fitness venues so we surface both and let the ranker
  // disambiguate from intent + customer_context.
  wellness: ['Sauna / Spa', 'Fitness & Wellness'],
};

// All distinct stored category strings, derived from the synonym table.
// Used by the live-DB drift guard test to assert no live category is
// orphaned from the synonym map.
export function allKnownCategories(): string[] {
  const set = new Set<string>();
  for (const variants of Object.values(CATEGORY_SYNONYMS)) {
    for (const v of variants) set.add(v);
  }
  return [...set].sort();
}

// All canonical keys, sorted. Useful for documentation and tests.
export function allCanonicalKeys(): string[] {
  return Object.keys(CATEGORY_SYNONYMS).sort();
}

// Convert any input (canonical key OR stored display string OR a
// dash/space variant of either) to its canonical key. Returns the input
// lowercased and trimmed when nothing matches.
//
// Examples:
//   normaliseCategory("Nail Studio")    -> "nails"
//   normaliseCategory("nails")           -> "nails"
//   normaliseCategory("NAILS")           -> "nails"
//   normaliseCategory("Personal-Training") -> "personal_training"
//   normaliseCategory("xyzunknown")     -> "xyzunknown"
export function normaliseCategory(input: string | null | undefined): string {
  if (!input) return '';
  const trimmedLower = input.trim().toLowerCase();
  if (!trimmedLower) return '';

  // Stored-display-string lookup wins. This ensures "Nail Studio",
  // "NAIL STUDIO", and "nail studio" all resolve to the primary
  // canonical key (`nails`), not to the snake-form transform
  // (`nail_studio`) which would pick a different but still-valid
  // canonical key. Iteration order is insertion order, so synonyms
  // are listed with the most natural canonical key first per group.
  for (const [canonical, variants] of Object.entries(CATEGORY_SYNONYMS)) {
    for (const v of variants) {
      if (v.toLowerCase() === trimmedLower) return canonical;
    }
  }

  // Canonical-key lookup, with dash and space tolerance so an input
  // like "Personal-Training" or "personal training" still resolves
  // to its canonical key. We do this AFTER the display-string lookup
  // so display strings always normalise to the primary canonical key
  // for their group.
  const snakeForm = trimmedLower.replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, '');
  if (snakeForm in CATEGORY_SYNONYMS) return snakeForm;

  // Unknown input. Return the snake form if it's clean, otherwise the
  // raw lowercased input. Either way, it won't match anything in the
  // synonym table when fed back through categoryQueryVariants.
  return snakeForm || trimmedLower;
}

// True when both inputs reach an overlapping set of stored display strings.
// Used by get-promoted-inventory's scorer. Variant-set intersection rather
// than direct canonical-key equality so that asymmetric synonyms work
// symmetrically: `Yoga & Pilates` equals both `yoga` and `pilates` even
// though normaliseCategory("Yoga & Pilates") only picks one of those
// canonical keys (whichever is first in iteration order).
//
// For unknown inputs that map to no variants, we fall back to comparing
// the cleaned canonical-key form so two equally-unknown strings can still
// compare equal.
export function categoryEquals(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a || !b) return false;
  const va = categoryQueryVariants(a);
  const vb = categoryQueryVariants(b);
  if (va.length > 0 && vb.length > 0) {
    return va.some((x) => vb.includes(x));
  }
  const na = normaliseCategory(a);
  const nb = normaliseCategory(b);
  return na !== '' && na === nb;
}

// Given a canonical key (or any input we can normalise to one), return all
// stored display strings that should be matched in the DB query. Used by
// the candidate query in search-businesses and get-promoted-inventory to
// build PostgREST `.in('category', variants)` clauses.
//
// Returns an empty array for unknown keys. Callers must guard against this
// to avoid issuing `.in('category', [])` (which matches zero rows).
export function categoryQueryVariants(canonicalOrDisplay: string | null | undefined): string[] {
  if (!canonicalOrDisplay) return [];
  const canonical = normaliseCategory(canonicalOrDisplay);
  return CATEGORY_SYNONYMS[canonical] ?? [];
}
