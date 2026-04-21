/**
 * Resolve the display name for a customer.
 *
 * The real `customers` table has `full_name` and `name` (no
 * `first_name` / `last_name` despite earlier code assuming otherwise —
 * see 2026-04-21 bug entry in docs/dashboard-v2-brief.md). We prefer
 * `full_name` (what the consumer-side flow writes), then `name`, then
 * fall back to 'Guest'.
 *
 * Canonical name normalisation is tracked as a post-Phase-4 cleanup
 * PR in docs/dashboard-v2-brief.md §8.
 */
export function displayCustomerName(
  c: { full_name?: string | null; name?: string | null } | null | undefined,
): string {
  if (!c) return 'Guest';
  if (c.full_name?.trim()) return c.full_name.trim();
  if (c.name?.trim()) return c.name.trim();
  return 'Guest';
}
