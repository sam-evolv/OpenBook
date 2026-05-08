import {
  Car,
  Dumbbell,
  Flame,
  Hand,
  HandMetal,
  Heart,
  Palette,
  Scissors,
  Sparkles,
  Star,
  Zap,
  type LucideIcon,
} from 'lucide-react';

// Maps a free-text business category onto a Lucide icon for the success
// state's contextual line. The mapping is matched by lowercasing the
// category and using includes(), so "Personal Training" and "personal
// trainer" both resolve to <Dumbbell />.
//
// Order matters in the if/else chain below — most specific match wins.

export function categoryIconFor(category: string | null | undefined): LucideIcon {
  const c = (category ?? '').toLowerCase().trim();
  if (!c) return Star;
  if (c.includes('personal trainer') || c.includes('personal training')) return Dumbbell;
  if (c.includes('gym') || c.includes('fitness')) return Dumbbell;
  if (c.includes('barber') || c.includes('hair')) return Scissors;
  if (c.includes('salon')) return Scissors;
  if (c.includes('spa') || c.includes('sauna')) return Flame;
  if (c.includes('massage')) return Hand;
  if (c.includes('physio')) return Heart;
  if (c.includes('yoga') || c.includes('pilates')) return Sparkles;
  if (c.includes('nail')) return HandMetal;
  if (c.includes('driving')) return Car;
  if (c.includes('pottery') || c.includes('craft')) return Palette;
  if (c.includes('tattoo')) return Zap;
  return Star;
}
