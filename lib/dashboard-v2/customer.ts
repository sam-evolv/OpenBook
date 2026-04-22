/**
 * Canonical customer-name resolver for the dashboard.
 *
 * The `customers` table has `full_name` and `name` (no first/last — see
 * 2026-04-21 bug entry in docs/dashboard-v2-brief.md). Prefer `full_name`
 * (what the consumer booking flow writes), then `name`, then the best
 * phone number we have. `Guest` is only for rows with no identifying data
 * at all, which should be vanishingly rare.
 *
 * Phone fallback is Stage 1 of the Messages work — a conversation can
 * exist before any `customers` row does (WhatsApp inbound from a new
 * number), so the inbox needs a readable name even when the name fields
 * are null. We format the phone as "+353 87 123 4567" style for IE numbers,
 * and otherwise fall back to the raw digits prefixed with "+".
 */
type NameInput = {
  full_name?: string | null;
  name?: string | null;
  phone?: string | null;
  whatsapp_number?: string | null;
  customer_phone?: string | null;
};

export function displayCustomerName(c: NameInput | null | undefined): string {
  if (!c) return 'Guest';
  if (c.full_name?.trim()) return c.full_name.trim();
  if (c.name?.trim()) return c.name.trim();
  const phone = (c.phone ?? c.whatsapp_number ?? c.customer_phone ?? '').trim();
  if (phone) return formatPhoneForDisplay(phone);
  return 'Guest';
}

/**
 * Light formatter for WhatsApp-originated phone numbers. The MSISDN
 * arrives digits-only (e.g. "353871234567"). We only prettify IE numbers
 * because that's ~100% of current traffic; other country codes pass
 * through as "+<digits>".
 */
export function formatPhoneForDisplay(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.startsWith('353') && digits.length === 12) {
    return `+353 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  if (digits.startsWith('44') && digits.length >= 11) {
    return `+44 ${digits.slice(2)}`;
  }
  if (digits.length === 0) return raw;
  return `+${digits}`;
}
