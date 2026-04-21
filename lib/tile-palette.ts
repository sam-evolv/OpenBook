/**
 * The OpenBook tile palette — single source of truth for tile colours.
 *
 * 24 colours, grouped into 4 families of 6. Every business primary_colour
 * value MUST be one of these slugs. Enforced at the database level by a
 * CHECK constraint (see migration 20260421000001).
 *
 * Adding/removing colours is a breaking change — bump the migration and
 * backfill before deploying.
 */

export type TileColourSlug =
  | 'gold' | 'amber' | 'ember' | 'crimson' | 'rose' | 'orchid'
  | 'violet' | 'indigo' | 'azure' | 'teal' | 'emerald' | 'fern'
  | 'bronze' | 'walnut' | 'terracotta' | 'sage' | 'eucalyptus' | 'stone'
  | 'onyx' | 'graphite' | 'slate' | 'linen' | 'pearl' | 'cream';

export type TileColourFamily = 'warm' | 'cool' | 'earth' | 'neutral';

export interface TileColour {
  slug: TileColourSlug;
  name: string;
  family: TileColourFamily;
  light: string;
  mid: string;
  dark: string;
  isLight: boolean;
}

export const TILE_PALETTE: readonly TileColour[] = [
  { slug: 'gold',       name: 'Gold',       family: 'warm', light: '#E8C968', mid: '#D4AF37', dark: '#A88828', isLight: false },
  { slug: 'amber',      name: 'Amber',      family: 'warm', light: '#FCC271', mid: '#F59E0B', dark: '#C47D07', isLight: false },
  { slug: 'ember',      name: 'Ember',      family: 'warm', light: '#FF9A6B', mid: '#EA6C2D', dark: '#B84D18', isLight: false },
  { slug: 'crimson',    name: 'Crimson',    family: 'warm', light: '#FF7B7B', mid: '#E0453F', dark: '#B02A25', isLight: false },
  { slug: 'rose',       name: 'Rose',       family: 'warm', light: '#F594B4', mid: '#EC4899', dark: '#BD3578', isLight: false },
  { slug: 'orchid',     name: 'Orchid',     family: 'warm', light: '#E87BD4', mid: '#C13FB0', dark: '#972C89', isLight: false },
  { slug: 'violet',     name: 'Violet',     family: 'cool', light: '#A788FF', mid: '#7C3AED', dark: '#5B2BB5', isLight: false },
  { slug: 'indigo',     name: 'Indigo',     family: 'cool', light: '#8A7FFF', mid: '#4F46E5', dark: '#3730B0', isLight: false },
  { slug: 'azure',      name: 'Azure',      family: 'cool', light: '#6AA5F5', mid: '#3B82F6', dark: '#2661C9', isLight: false },
  { slug: 'teal',       name: 'Teal',       family: 'cool', light: '#4DBED1', mid: '#0891B2', dark: '#056A85', isLight: false },
  { slug: 'emerald',    name: 'Emerald',    family: 'cool', light: '#3DD598', mid: '#10B981', dark: '#0C8E64', isLight: false },
  { slug: 'fern',       name: 'Fern',       family: 'cool', light: '#93C85A', mid: '#6BA32B', dark: '#4E7A1E', isLight: false },
  { slug: 'bronze',     name: 'Bronze',     family: 'earth', light: '#C4986B', mid: '#8B5E34', dark: '#654121', isLight: false },
  { slug: 'walnut',     name: 'Walnut',     family: 'earth', light: '#B88C6F', mid: '#8F5F3F', dark: '#6B4529', isLight: false },
  { slug: 'terracotta', name: 'Terracotta', family: 'earth', light: '#D4A890', mid: '#A17050', dark: '#744D33', isLight: false },
  { slug: 'sage',       name: 'Sage',       family: 'earth', light: '#9CB38A', mid: '#6B8A5A', dark: '#4A6540', isLight: false },
  { slug: 'eucalyptus', name: 'Eucalyptus', family: 'earth', light: '#7AA39E', mid: '#4A7772', dark: '#315955', isLight: false },
  { slug: 'stone',      name: 'Stone',      family: 'earth', light: '#B0A088', mid: '#7A6D57', dark: '#554A3A', isLight: false },
  { slug: 'onyx',       name: 'Onyx',       family: 'neutral', light: '#4A4A4A', mid: '#2A2A2A', dark: '#141414', isLight: false },
  { slug: 'graphite',   name: 'Graphite',   family: 'neutral', light: '#7A7A7A', mid: '#4A4A4A', dark: '#2F2F2F', isLight: false },
  { slug: 'slate',      name: 'Slate',      family: 'neutral', light: '#9B9B98', mid: '#6B7280', dark: '#4A525C', isLight: false },
  { slug: 'linen',      name: 'Linen',      family: 'neutral', light: '#C8C0B4', mid: '#8E867A', dark: '#65604F', isLight: true  },
  { slug: 'pearl',      name: 'Pearl',      family: 'neutral', light: '#D9D4CB', mid: '#A8A29A', dark: '#787169', isLight: true  },
  { slug: 'cream',      name: 'Cream',      family: 'neutral', light: '#F0ECE4', mid: '#CFC8BC', dark: '#A29A8C', isLight: true  },
];

export const TILE_PALETTE_MAP: Readonly<Record<TileColourSlug, TileColour>> =
  Object.freeze(
    TILE_PALETTE.reduce((acc, c) => {
      acc[c.slug] = c;
      return acc;
    }, {} as Record<TileColourSlug, TileColour>),
  );

export const TILE_PALETTE_SLUGS: readonly TileColourSlug[] = TILE_PALETTE.map(c => c.slug);

export const DEFAULT_TILE_COLOUR: TileColourSlug = 'gold';

export function isValidTileColour(value: unknown): value is TileColourSlug {
  return typeof value === 'string' && value in TILE_PALETTE_MAP;
}

export function getTileColour(slug: string | null | undefined): TileColour {
  if (slug && isValidTileColour(slug)) return TILE_PALETTE_MAP[slug];
  return TILE_PALETTE_MAP[DEFAULT_TILE_COLOUR];
}

export function tileGradient(c: TileColour): string {
  return `linear-gradient(135deg, ${c.light} 0%, ${c.mid} 45%, ${c.dark} 100%)`;
}

export function tileTextColour(c: TileColour): string {
  return c.isLight ? '#080808' : '#ffffff';
}

export function paletteByFamily(): Record<TileColourFamily, TileColour[]> {
  return TILE_PALETTE.reduce((acc, c) => {
    (acc[c.family] ||= []).push(c);
    return acc;
  }, {} as Record<TileColourFamily, TileColour[]>);
}
