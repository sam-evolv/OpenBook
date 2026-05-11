/**
 * Money formatting helpers. Source of truth for currency rendering.
 *
 * Amounts move through the system as integer cents and are formatted to
 * strings only at the edge. Two replace passes are load-bearing for the
 * rendered output:
 *   - Drop trailing ".00" but keep ".50".
 *   - Strip the U+00A0 NO-BREAK SPACE that some ICU/Node builds insert
 *     between the € symbol and the amount under the en-IE locale, so
 *     output is "€30" rather than "€ 30".
 */

const EUR = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

export function formatEUR(cents: number): string {
  const value = cents / 100;
  const out = EUR.format(value);
  return out.replace(/\.00$/, '').replace(/ /g, '');
}
