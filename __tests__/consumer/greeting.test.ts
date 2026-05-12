import { describe, expect, it } from 'vitest';
import {
  firstNameFrom,
  formatGreeting,
  getDublinHour,
  getGreetingBucket,
  type GreetingBucket,
} from '../../lib/greeting';

describe('getGreetingBucket — boundaries', () => {
  // Spec:
  //   05:00–11:59 → morning
  //   12:00–17:59 → afternoon
  //   18:00–21:59 → evening
  //   22:00–04:59 → hello
  const cases: Array<[number, GreetingBucket, string]> = [
    [4, 'hello', '04:00 is hello'],
    [4.99, 'hello', '04:59 is hello (just before morning)'],
    [5, 'morning', '05:00 is morning'],
    [11, 'morning', '11:59 (floor 11) is morning'],
    [12, 'afternoon', '12:00 is afternoon'],
    [17, 'afternoon', '17:59 (floor 17) is afternoon'],
    [18, 'evening', '18:00 is evening'],
    [21, 'evening', '21:59 (floor 21) is evening'],
    [22, 'hello', '22:00 is hello'],
    [23, 'hello', '23:00 is hello'],
    [0, 'hello', '00:00 is hello'],
  ];

  for (const [hour, bucket, label] of cases) {
    it(label, () => {
      expect(getGreetingBucket(Math.floor(hour))).toBe(bucket);
    });
  }
});

describe('getDublinHour', () => {
  // Pick a winter date so Dublin == UTC and the assertions are unambiguous.
  // Ireland follows BST (UTC+1) from late March to late October; the rest of
  // the year (including January 15) Dublin local time equals UTC.
  const winterDate = (hhmm: string) => new Date(`2026-01-15T${hhmm}:00.000Z`);

  it('reads 05:00 UTC as hour 5 in winter Dublin', () => {
    expect(getDublinHour(winterDate('05:00'))).toBe(5);
  });

  it('reads 17:59 UTC as hour 17 in winter Dublin', () => {
    expect(getDublinHour(winterDate('17:59'))).toBe(17);
  });

  it('reads 23:30 UTC as hour 23 in winter Dublin', () => {
    expect(getDublinHour(winterDate('23:30'))).toBe(23);
  });

  it('shifts forward by 1 hour during BST (summer)', () => {
    // 2026-07-15 17:00Z = 18:00 BST Dublin
    expect(getDublinHour(new Date('2026-07-15T17:00:00.000Z'))).toBe(18);
  });
});

describe('formatGreeting', () => {
  it('appends ", FirstName." when name provided', () => {
    expect(formatGreeting('evening', 'Sam')).toBe('Good Evening, Sam.');
  });

  it('ends with a period when no name', () => {
    expect(formatGreeting('morning', null)).toBe('Good Morning.');
  });

  it('uses "Hello" for the late-night bucket', () => {
    expect(formatGreeting('hello', null)).toBe('Hello.');
    expect(formatGreeting('hello', 'Sam')).toBe('Hello, Sam.');
  });
});

describe('firstNameFrom', () => {
  it('returns the first token of a full name', () => {
    expect(firstNameFrom('Sam Donworth')).toBe('Sam');
  });

  it('returns the only token when no surname', () => {
    expect(firstNameFrom('Sam')).toBe('Sam');
  });

  it('returns null for empty / whitespace / null inputs', () => {
    expect(firstNameFrom(null)).toBeNull();
    expect(firstNameFrom(undefined)).toBeNull();
    expect(firstNameFrom('')).toBeNull();
    expect(firstNameFrom('   ')).toBeNull();
  });

  it('collapses internal whitespace', () => {
    expect(firstNameFrom('  Sam   Donworth  ')).toBe('Sam');
  });
});
