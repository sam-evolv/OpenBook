/**
 * Irish VAT registration threshold for **services**.
 *
 * Source: https://www.revenue.ie/en/vat/vat-registration/who-should-register-for-vat/vat-thresholds.aspx
 * Value verified: 2026-04-22
 * Published by Revenue: 2025-01-01 (Finance Act 2024 raised services threshold
 *   from €37,500 → €42,500)
 * Basis: rolling 12 months — the measurement window is "turnover in any
 *   continuous 12-month period", not the calendar year (the calendar-year
 *   basis only applies to intra-Community distance sales).
 *
 * Owners should re-verify annually — the threshold has changed twice since
 * 2015 and may change again in future Irish budgets.
 */
export const IRISH_SERVICES_VAT_THRESHOLD_CENTS = 42_500 * 100;

/** Ireland standard VAT rate on services, for reference. Not applied client-
 *  side — we surface the threshold as a watch number only. Actual VAT
 *  collection is the owner's responsibility once registered. */
export const IRISH_STANDARD_VAT_RATE = 0.23;
