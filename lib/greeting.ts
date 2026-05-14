/**
 * Greeting helpers for the consumer home hero.
 *
 * Buckets are anchored to Europe/Dublin local time so the greeting reads
 * correctly regardless of server timezone (Vercel functions run UTC).
 * BST/IST shifts are handled by Intl.DateTimeFormat automatically.
 *
 *   05:00 – 11:59 Dublin → Good morning
 *   12:00 – 17:59 Dublin → Good afternoon
 *   18:00 – 21:59 Dublin → Good evening
 *   22:00 – 04:59 Dublin → Hello
 *
 * "Hello" is used in place of "Good night" so the late-night/early-morning
 * bucket doesn't read like a goodbye. Phrasing is sentence case to match
 * the dashboard greeting and the rest of the consumer copy.
 */

export type GreetingBucket = 'morning' | 'afternoon' | 'evening' | 'hello';

export function getGreetingBucket(hourInDublin: number): GreetingBucket {
  if (hourInDublin >= 5 && hourInDublin < 12) return 'morning';
  if (hourInDublin >= 12 && hourInDublin < 18) return 'afternoon';
  if (hourInDublin >= 18 && hourInDublin < 22) return 'evening';
  return 'hello';
}

export function getDublinHour(date: Date): number {
  const formatted = date.toLocaleString('en-GB', {
    timeZone: 'Europe/Dublin',
    hour: '2-digit',
    hour12: false,
  });
  return parseInt(formatted, 10);
}

export function formatGreeting(
  bucket: GreetingBucket,
  firstName: string | null,
): string {
  const phrase = ({
    morning: 'Good morning',
    afternoon: 'Good afternoon',
    evening: 'Good evening',
    hello: 'Hello',
  } as const)[bucket];
  return firstName ? `${phrase}, ${firstName}` : `${phrase}, Guest`;
}

/**
 * Extract the first name from a customers.full_name value.
 * "Sam Donworth" → "Sam"; "Sam" → "Sam"; null/empty → null.
 */
export function firstNameFrom(fullName: string | null | undefined): string | null {
  if (!fullName) return null;
  const first = fullName.trim().split(/\s+/)[0];
  return first ? first : null;
}
