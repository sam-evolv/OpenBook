import { describe, expect, it } from 'vitest';
import {
  formatDayLabel,
  formatFullDate,
  formatTimeRange,
} from '../../lib/dublin-time';

describe('formatDayLabel', () => {
  it('returns "Today" when slot is on the same Dublin calendar day as now', () => {
    const now = new Date('2026-05-11T10:00:00Z');
    const slot = new Date('2026-05-11T16:00:00Z'); // same Dublin day
    expect(formatDayLabel(slot, now)).toBe('Today');
  });

  it('returns "Tomorrow" when slot is 24h ahead', () => {
    const now = new Date('2026-05-11T10:00:00Z');
    const slot = new Date('2026-05-12T10:00:00Z');
    expect(formatDayLabel(slot, now)).toBe('Tomorrow');
  });

  it('returns a weekday/date label for slots more than 1 day ahead', () => {
    const now = new Date('2026-05-11T10:00:00Z');
    const slot = new Date('2026-05-18T10:00:00Z');
    // en-IE short weekday + day + short month, Dublin timezone
    const result = formatDayLabel(slot, now);
    // Must not collapse to Today/Tomorrow and should mention "May"
    expect(result).not.toBe('Today');
    expect(result).not.toBe('Tomorrow');
    expect(result).toMatch(/Mon|May/);
  });

  it('handles DST transition (Mar) without sliding into Yesterday/Day after', () => {
    // 2026-03-29 02:00 Dublin is the spring-forward day. Pin "now" to noon
    // on the day before, and check that 24h later is still labelled
    // "Tomorrow" (not "Today" or "Day after tomorrow") even though only
    // 23h of wall-clock time elapsed locally.
    const now = new Date('2026-03-28T12:00:00Z');
    const slotNextDay = new Date('2026-03-29T12:00:00Z');
    expect(formatDayLabel(slotNextDay, now)).toBe('Tomorrow');

    // 2026-10-25 02:00 Dublin is the fall-back. 24h forward should still
    // be "Tomorrow", not collapse to "Today" because of the extra hour.
    const fallNow = new Date('2026-10-24T12:00:00Z');
    const fallSlot = new Date('2026-10-25T12:00:00Z');
    expect(formatDayLabel(fallSlot, fallNow)).toBe('Tomorrow');
  });
});

describe('formatTimeRange', () => {
  it('formats a 45-minute range in Dublin local time', () => {
    // 15:00 Dublin in May = 14:00 UTC (Dublin is UTC+1 in summer).
    const start = new Date('2026-05-12T14:00:00Z');
    expect(formatTimeRange(start, 45)).toBe('3:00 PM – 3:45 PM');
  });
});

describe('formatFullDate', () => {
  it('formats as "day Mon yyyy" in Dublin', () => {
    const d = new Date('2026-05-12T12:00:00Z');
    expect(formatFullDate(d)).toBe('12 May 2026');
  });
});
