// Voice-friendly Europe/Dublin date/time formatting shared between the
// MCP `hold_and_checkout` tool's `start_human` field and the customer-facing
// /c/[token] checkout page. Same string in both places — the assistant says
// "Tuesday at seven in the evening" and the page renders the same phrase.

const DUBLIN_TZ = 'Europe/Dublin';

const NUMBER_WORDS: Record<number, string> = {
  0: 'midnight',
  1: 'one',
  2: 'two',
  3: 'three',
  4: 'four',
  5: 'five',
  6: 'six',
  7: 'seven',
  8: 'eight',
  9: 'nine',
  10: 'ten',
  11: 'eleven',
  12: 'twelve',
};

export function dublinParts(date: Date) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: DUBLIN_TZ,
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return {
    weekday: get('weekday'),
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
  };
}

function dublinDayKey(date: Date): string {
  const p = dublinParts(date);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

function partOfDay(hour: number): string {
  if (hour >= 5 && hour < 12) return 'in the morning';
  if (hour >= 12 && hour < 17) return 'in the afternoon';
  if (hour >= 17 && hour < 22) return 'in the evening';
  return 'at night';
}

function humaniseTime(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const hourWord = NUMBER_WORDS[h12] ?? String(h12);
  if (minute === 0) return `${hourWord} ${partOfDay(hour)}`;
  if (minute === 15) return `quarter past ${hourWord} ${partOfDay(hour)}`;
  if (minute === 30) return `half past ${hourWord} ${partOfDay(hour)}`;
  if (minute === 45) return `quarter to ${hourWord === 'twelve' ? 'one' : NUMBER_WORDS[(h12 % 12) + 1] ?? ''} ${partOfDay(hour)}`;
  return `${hourWord} ${String(minute).padStart(2, '0')} ${partOfDay(hour)}`;
}

export function humaniseDateTime(date: Date, now: Date = new Date()): string {
  const dKey = dublinDayKey(date);
  const nowKey = dublinDayKey(now);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowKey = dublinDayKey(tomorrow);

  const p = dublinParts(date);
  const time = humaniseTime(p.hour, p.minute);

  if (dKey === nowKey) return `today at ${time}`;
  if (dKey === tomorrowKey) return `tomorrow at ${time}`;
  return `${p.weekday} at ${time}`;
}

// Compact "Tue 7 May, 7:00pm" used in the checkout summary block. Keeps the
// information dense for the page; humaniseDateTime keeps it warm for voice.
export function formatCompactDublin(date: Date): string {
  const dateLabel = new Intl.DateTimeFormat('en-IE', {
    timeZone: DUBLIN_TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
  const timeLabel = new Intl.DateTimeFormat('en-IE', {
    timeZone: DUBLIN_TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
    .format(date)
    .replace(' ', '')
    .toLowerCase();
  return `${dateLabel}, ${timeLabel}`;
}
