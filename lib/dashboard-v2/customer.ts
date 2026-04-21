/**
 * Resolve the display name for a customer. The `customers` table carries
 * both `full_name` and `first_name`/`last_name` columns for historical
 * reasons; normalisation to one canonical convention is tracked as a
 * post-Phase-4 cleanup PR in docs/dashboard-v2-brief.md §8.
 *
 * Fallback order: first_name + last_name → full_name → 'Guest'.
 */
export function displayCustomerName(
  c: {
    first_name?: string | null;
    last_name?: string | null;
    full_name?: string | null;
  } | null | undefined,
): string {
  if (!c) return 'Guest';
  const composed = [c.first_name, c.last_name].filter(Boolean).join(' ').trim();
  if (composed) return composed;
  if (c.full_name?.trim()) return c.full_name.trim();
  return 'Guest';
}
