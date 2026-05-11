import { describe, expect, it } from 'vitest';
import { formatEUR } from '../../lib/money';

describe('formatEUR', () => {
  it('formats zero as €0 (no decimals)', () => {
    expect(formatEUR(0)).toBe('€0');
  });

  it('formats €1 without trailing .00', () => {
    expect(formatEUR(100)).toBe('€1');
  });

  it('formats €65 without trailing .00', () => {
    expect(formatEUR(6500)).toBe('€65');
  });

  it('formats large amounts with locale thousands separator', () => {
    expect(formatEUR(1_000_000)).toBe('€10,000');
  });
});
