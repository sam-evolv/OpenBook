// Category-aware contextual lines rendered below the success-state headline
// on /c/[token]. Selection is deterministic per booking_id so a reload never
// shows a different line for the same booking.
//
// Future v1.x work may move this to a CMS or per-business customisation; for
// now it lives in code where copy reviewers can edit in a single PR.

export const CONTEXTUAL_LINES: Record<string, string[]> = {
  personal_training: [
    'Earn it.',
    'Get after it.',
    'One more rep is always one more.',
    'Strong work ahead.',
    'The session is yours.',
    'Show up, the rest follows.',
    'Bring the effort.',
    'Quiet work, real results.',
    'Train well.',
    'The hour is set aside.',
  ],
  hair: [
    'Looking sharp.',
    'A fresh chair awaits.',
    'Time to feel new.',
    'Looking forward to seeing you in the chair.',
    'The hour is yours.',
    'Sharper days ahead.',
    "We've got the chair ready.",
    'A small reset.',
    'See you for the trim.',
    'The good kind of self-maintenance.',
  ],
  spa: [
    'Time to switch off.',
    'Slow it down.',
    'Quiet hour ahead.',
    'Stay a while.',
    'Switch off, fully.',
    'The room will be ready.',
    'Less, on purpose.',
    'A real pause.',
    'Take the time.',
    'Rest is productive.',
  ],
  physio: [
    'Mend well.',
    'Healing on the calendar.',
    "You're doing the right thing.",
    'Step by step.',
    'The right kind of slow.',
    'Take care of it.',
    'Looking after the body that carries you.',
    'Steady recovery ahead.',
    "We'll see you for the work.",
    'Patience is part of the plan.',
  ],
  yoga: [
    'Breathe deep.',
    'Make space.',
    'Practice well.',
    'The mat is waiting.',
    'Slow on purpose.',
    'A quieter hour.',
    'Show up to the breath.',
    'Stretch into it.',
    'Practice over perfection.',
    'Just the next breath.',
  ],
  nails: [
    'Treat yourself.',
    'Hands deserve this.',
    'Small luxury, set aside.',
    'The good kind of indulgence.',
    'Polished hour ahead.',
    'A bit of attention to detail.',
    'Earned it.',
    'Time to feel put together.',
    "We've saved you the chair.",
    'The fine things.',
  ],
  driving: [
    'Drive safe.',
    'Eyes up.',
    'One step closer.',
    'Earn the licence.',
    'The road is patient.',
    'Practice makes confident.',
    "You'll do well.",
    'Steady hands.',
    'The hour is set.',
    'One lesson at a time.',
  ],
  craft: [
    'Make something good.',
    'Hands on, mind off.',
    'Let the clay decide.',
    'Slow, deliberate hours.',
    'Build something real.',
    'The studio is open for you.',
    'Get your hands dirty.',
    'Make for the joy of it.',
    'Time well spent.',
    'Quiet making ahead.',
  ],
  tattoo: [
    'Wear it well.',
    'Permanent, in the best way.',
    'The piece is waiting.',
    'Trust the process.',
    'The chair is ready.',
    'Skin and ink, ready.',
    'Mark made on purpose.',
    'The right kind of forever.',
    'Steady hands ahead.',
    'The hour belongs to the work.',
  ],
  default: [
    'Looking forward to it.',
    'The slot is yours.',
    "We'll see you then.",
    'The hour is set aside.',
    'Looking forward to seeing you.',
    "We've got it on the books.",
    'Set, sealed.',
    'Confirmed and ready.',
    'The time is held for you.',
    "We'll be ready.",
  ],
};

export type ContextualCategoryKey = keyof typeof CONTEXTUAL_LINES;

// Maps a free-text category from `businesses.category` onto one of the keys
// in CONTEXTUAL_LINES. Order matters — the first match wins, so put the
// most specific patterns first.
export function categoryKeyFor(category: string | null | undefined): ContextualCategoryKey {
  const c = (category ?? '').toLowerCase().trim();
  if (!c) return 'default';
  if (c.includes('personal trainer') || c.includes('personal training')) return 'personal_training';
  if (c.includes('gym') || c.includes('fitness')) return 'personal_training';
  if (c.includes('barber') || c.includes('hair') || c.includes('salon')) return 'hair';
  if (c.includes('spa') || c.includes('sauna')) return 'spa';
  if (c.includes('massage')) return 'spa';
  if (c.includes('physio')) return 'physio';
  if (c.includes('yoga') || c.includes('pilates')) return 'yoga';
  if (c.includes('nail')) return 'nails';
  if (c.includes('driving')) return 'driving';
  if (c.includes('pottery') || c.includes('craft')) return 'craft';
  if (c.includes('tattoo')) return 'tattoo';
  return 'default';
}

// Deterministic line picker. Same booking_id always renders the same line,
// so a reload doesn't disorient the user with shifting copy. Different
// bookings rotate through the 10 lines naturally.
export function pickContextualLine(
  bookingId: string,
  category: string | null | undefined,
): string {
  const key = categoryKeyFor(category);
  const lines = CONTEXTUAL_LINES[key] ?? CONTEXTUAL_LINES.default;
  if (!bookingId) return lines[0];
  const sum = [...bookingId].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return lines[sum % lines.length];
}
