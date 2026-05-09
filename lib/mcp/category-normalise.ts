// Canonical category form: lowercase, snake_case. The intent classifier
// emits this form (see lib/mcp/intent-classifier.ts CANONICAL_CATEGORIES),
// but the businesses table stores categories in mixed cases —
// "Personal Training", "personal training", "personal_training" all exist
// in the wild. Normalising on both sides before comparing turns those
// silent zero-result mismatches into matches.
//
// We don't migrate the database (out of scope per the bug brief); we
// expand the canonical form to its likely DB-stored variants when filtering
// at query time, and we normalise both sides when comparing in JS.

export function normaliseCategory(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

export function categoryEquals(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const na = normaliseCategory(a);
  const nb = normaliseCategory(b);
  return na !== '' && na === nb;
}

// PostgREST `.in()` does exact-match on the column value, so we can't apply
// a JS function inside the query. Instead we pass every plausible
// stored-form variant of a canonical category. Three forms cover what's
// observed in the data: snake_case, lowercase-with-spaces, and Title Case
// with spaces.
export function categoryQueryVariants(canonical: string): string[] {
  const norm = normaliseCategory(canonical);
  if (!norm) return [];
  const spaced = norm.replace(/_/g, ' ');
  const titleCased = spaced.replace(/\b\w/g, (c) => c.toUpperCase());
  return Array.from(new Set([norm, spaced, titleCased]));
}
