import { describe, expect, it } from 'vitest';
import { formatCompactDublin, humaniseDateTime } from '../../lib/checkout/format-datetime';

describe('humaniseDateTime', () => {
  it('renders today / tomorrow / weekday', () => {
    const now = new Date('2026-05-12T13:00:00Z'); // Tue 14:00 IST
    expect(humaniseDateTime(new Date('2026-05-12T18:00:00Z'), now)).toMatch(/^today at /);
    expect(humaniseDateTime(new Date('2026-05-13T08:00:00Z'), now)).toMatch(/^tomorrow at /);
    expect(humaniseDateTime(new Date('2026-05-15T18:00:00Z'), now)).toMatch(/^Friday at /);
  });

  it('uses voice-friendly minute words', () => {
    const now = new Date('2026-05-12T13:00:00Z');
    expect(humaniseDateTime(new Date('2026-05-15T20:30:00Z'), now)).toMatch(/half past nine in the evening/);
    expect(humaniseDateTime(new Date('2026-05-15T07:15:00Z'), now)).toMatch(/quarter past eight in the morning/);
    expect(humaniseDateTime(new Date('2026-05-15T18:00:00Z'), now)).toMatch(/seven in the evening/);
  });
});

describe('formatCompactDublin', () => {
  it('renders the short Dublin form (weekday short, day, month short, time)', () => {
    const dt = new Date('2026-05-12T18:00:00Z'); // 19:00 IST in May (BST)
    const out = formatCompactDublin(dt);
    expect(out).toMatch(/^Tue.{0,2} 12 May, /);
    expect(out).toMatch(/(7:00pm|07:00pm|7pm)/);
  });
});
