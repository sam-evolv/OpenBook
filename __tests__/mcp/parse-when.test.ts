import { describe, expect, it } from 'vitest';
import { parseWhen } from '../../lib/mcp/parse-when';

const MIDWEEK_AFTERNOON = new Date('2026-05-12T13:00:00Z'); // Tue 14:00 IST.
const fmtDublinDate = (d: Date) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Dublin', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(d)
    .reduce((acc, p) => (p.type === 'literal' ? acc : { ...acc, [p.type]: p.value }), {} as Record<string, string>);

describe('parseWhen', () => {
  it('handles ISO date', () => {
    const out = parseWhen({ when: '2026-05-08' })!;
    expect(out).not.toBeNull();
    const fromParts = fmtDublinDate(out.from);
    const toParts = fmtDublinDate(out.to);
    expect(`${fromParts.year}-${fromParts.month}-${fromParts.day}`).toBe('2026-05-08');
    expect(`${toParts.year}-${toParts.month}-${toParts.day}`).toBe('2026-05-08');
    expect(out.to.getTime()).toBeGreaterThan(out.from.getTime());
  });

  it('parses "tonight" as today in Dublin', () => {
    const out = parseWhen({ when: 'tonight', now: MIDWEEK_AFTERNOON });
    expect(out).not.toBeNull();
    const fromParts = fmtDublinDate(out!.from);
    const toParts = fmtDublinDate(out!.to);
    // Both ends fall on the Dublin calendar day of the reference instant.
    expect(`${fromParts.year}-${fromParts.month}-${fromParts.day}`).toBe('2026-05-12');
    expect(`${toParts.year}-${toParts.month}-${toParts.day}`).toBe('2026-05-12');
  });

  it('parses "tomorrow morning"', () => {
    const out = parseWhen({ when: 'tomorrow morning', now: MIDWEEK_AFTERNOON });
    expect(out).not.toBeNull();
    const tomorrow = new Date(MIDWEEK_AFTERNOON);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const next = fmtDublinDate(out!.from);
    const exp = fmtDublinDate(tomorrow);
    expect(next.year + next.month + next.day).toBe(exp.year + exp.month + exp.day);
  });

  it('parses "next Friday"', () => {
    const out = parseWhen({ when: 'next Friday', now: MIDWEEK_AFTERNOON });
    expect(out).not.toBeNull();
    expect(out!.to.getTime()).toBeGreaterThan(out!.from.getTime());
    expect(out!.from.getTime()).toBeGreaterThan(MIDWEEK_AFTERNOON.getTime());
  });

  it('parses "in three weeks"', () => {
    const out = parseWhen({ when: 'in three weeks', now: MIDWEEK_AFTERNOON });
    expect(out).not.toBeNull();
    const expectedSpan = 21 * 24 * 60 * 60 * 1000;
    expect(out!.from.getTime() - MIDWEEK_AFTERNOON.getTime()).toBeGreaterThan(expectedSpan - 5 * 86400000);
  });

  it('returns null for empty/undefined', () => {
    expect(parseWhen({})).toBeNull();
    expect(parseWhen({ when: '' })).toBeNull();
    expect(parseWhen({ when: '   ' })).toBeNull();
  });

  it('returns null for unparseable garbage', () => {
    expect(parseWhen({ when: 'kjsdfh', now: MIDWEEK_AFTERNOON })).toBeNull();
  });
});
