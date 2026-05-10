import { describe, expect, it } from 'vitest';

import {
  allCanonicalKeys,
  allKnownCategories,
  categoryEquals,
  categoryQueryVariants,
  normaliseCategory,
} from '../../lib/mcp/category-normalise';

// Snapshot of distinct category values for is_live=true rows in the
// production businesses table, captured 2026-05-09. The drift guard
// test below asserts every entry here is reachable from at least one
// canonical key. When a new business is added with a new display string,
// add it here AND extend lib/mcp/category-normalise.ts CATEGORY_SYNONYMS.
const LIVE_CATEGORIES_SNAPSHOT = [
  'Personal Training',
  'Nail Studio',
  'Barbershop',
  'Yoga & Pilates',
  'Sauna / Spa',
  'Fitness & Wellness',
  'Health & Therapy',
];

describe('normaliseCategory', () => {
  it('maps stored display strings to a canonical key', () => {
    expect(normaliseCategory('Personal Training')).toBe('personal_training');
    expect(normaliseCategory('Nail Studio')).toBe('nails');
    expect(normaliseCategory('Barbershop')).toBe('barber');
    expect(normaliseCategory('Yoga & Pilates')).toBe('yoga');
    expect(normaliseCategory('Sauna / Spa')).toBe('sauna');
    expect(normaliseCategory('Fitness & Wellness')).toBe('fitness');
    expect(normaliseCategory('Health & Therapy')).toBe('physio');
  });

  it('returns canonical keys unchanged', () => {
    expect(normaliseCategory('personal_training')).toBe('personal_training');
    expect(normaliseCategory('nails')).toBe('nails');
    expect(normaliseCategory('barber')).toBe('barber');
    expect(normaliseCategory('yoga')).toBe('yoga');
  });

  it('is case-insensitive across canonical keys and display strings', () => {
    expect(normaliseCategory('NAIL STUDIO')).toBe('nails');
    expect(normaliseCategory('nail studio')).toBe('nails');
    expect(normaliseCategory('NAILS')).toBe('nails');
    expect(normaliseCategory('Nails')).toBe('nails');
  });

  it('tolerates dashes and surrounding whitespace in canonical-key inputs', () => {
    expect(normaliseCategory('  Personal-Training  ')).toBe('personal_training');
    expect(normaliseCategory('personal-training')).toBe('personal_training');
  });

  it('returns empty string for null/undefined/empty', () => {
    expect(normaliseCategory(null)).toBe('');
    expect(normaliseCategory(undefined)).toBe('');
    expect(normaliseCategory('')).toBe('');
    expect(normaliseCategory('   ')).toBe('');
  });

  it('returns the cleaned input for unknown categories', () => {
    // Fall-through behaviour. The synonym table doesn't know about it,
    // so we hand back a clean snake form which is harmless when fed
    // back into categoryQueryVariants (returns []).
    expect(normaliseCategory('xyz_unknown')).toBe('xyz_unknown');
    expect(normaliseCategory('Some New Category')).toBe('some_new_category');
  });
});

describe('categoryEquals', () => {
  it('matches Personal Training and personal_training (PR #141 case)', () => {
    expect(categoryEquals('Personal Training', 'personal_training')).toBe(true);
    expect(categoryEquals('personal training', 'personal_training')).toBe(true);
    expect(categoryEquals('personal_training', 'personal_training')).toBe(true);
  });

  it('matches Nail Studio and nails (the bug)', () => {
    expect(categoryEquals('Nail Studio', 'nails')).toBe(true);
    expect(categoryEquals('nails', 'Nail Studio')).toBe(true);
  });

  it('matches Yoga & Pilates against both yoga and pilates synonyms', () => {
    expect(categoryEquals('Yoga & Pilates', 'yoga')).toBe(true);
    expect(categoryEquals('Yoga & Pilates', 'pilates')).toBe(true);
  });

  it('treats different stored categories as not equal even when sharing a synonym', () => {
    // `wellness` is a synonym for both Sauna / Spa and Fitness & Wellness,
    // but the two stored categories are still distinct businesses and
    // should not compare equal directly.
    expect(categoryEquals('Sauna / Spa', 'Fitness & Wellness')).toBe(false);
  });

  it('rejects mismatched categories', () => {
    expect(categoryEquals('Personal Training', 'yoga')).toBe(false);
    expect(categoryEquals('Nail Studio', 'Barbershop')).toBe(false);
  });

  it('returns false when either side is null/empty', () => {
    expect(categoryEquals(null, 'yoga')).toBe(false);
    expect(categoryEquals('yoga', '')).toBe(false);
    expect(categoryEquals(null, null)).toBe(false);
  });
});

describe('categoryQueryVariants', () => {
  it('returns the stored display string(s) for a canonical key', () => {
    expect(categoryQueryVariants('personal_training')).toEqual(['Personal Training']);
    expect(categoryQueryVariants('nails')).toEqual(['Nail Studio']);
    expect(categoryQueryVariants('barber')).toEqual(['Barbershop']);
    expect(categoryQueryVariants('yoga')).toEqual(['Yoga & Pilates']);
    expect(categoryQueryVariants('sauna')).toEqual(['Sauna / Spa']);
    expect(categoryQueryVariants('fitness')).toEqual(['Fitness & Wellness']);
    expect(categoryQueryVariants('physio')).toEqual(['Health & Therapy']);
  });

  it('returns multiple display strings for cross-category synonyms', () => {
    expect(categoryQueryVariants('wellness')).toEqual(
      expect.arrayContaining(['Sauna / Spa', 'Fitness & Wellness']),
    );
    expect(categoryQueryVariants('wellness')).toHaveLength(2);
  });

  it('accepts user-phrasing synonyms (manicure, gel_nails, gym, massage)', () => {
    expect(categoryQueryVariants('manicure')).toEqual(['Nail Studio']);
    expect(categoryQueryVariants('gel_nails')).toEqual(['Nail Studio']);
    expect(categoryQueryVariants('pedicure')).toEqual(['Nail Studio']);
    expect(categoryQueryVariants('gym')).toEqual(['Fitness & Wellness']);
    expect(categoryQueryVariants('massage')).toEqual(['Health & Therapy']);
    expect(categoryQueryVariants('barbershop')).toEqual(['Barbershop']);
    expect(categoryQueryVariants('pilates')).toEqual(['Yoga & Pilates']);
  });

  it('accepts a stored display string directly', () => {
    expect(categoryQueryVariants('Nail Studio')).toEqual(['Nail Studio']);
    expect(categoryQueryVariants('Personal Training')).toEqual(['Personal Training']);
  });

  it('returns empty array for unknown inputs', () => {
    expect(categoryQueryVariants('xyz_unknown')).toEqual([]);
    expect(categoryQueryVariants('completely_made_up')).toEqual([]);
  });

  it('returns empty array for null/undefined/empty', () => {
    expect(categoryQueryVariants(null)).toEqual([]);
    expect(categoryQueryVariants(undefined)).toEqual([]);
    expect(categoryQueryVariants('')).toEqual([]);
  });
});

describe('round-trip coverage', () => {
  it('every display string in the synonym table round-trips back to itself', () => {
    // For every distinct stored display string, normaliseCategory should
    // produce a canonical key, and categoryQueryVariants applied to that
    // key should include the original display string.
    for (const display of allKnownCategories()) {
      const canonical = normaliseCategory(display);
      const roundTrip = categoryQueryVariants(canonical);
      expect(canonical).not.toBe('');
      expect(roundTrip, `round-trip failed for "${display}"`).toContain(display);
    }
  });

  it('every canonical key resolves to a non-empty variants array', () => {
    for (const key of allCanonicalKeys()) {
      expect(categoryQueryVariants(key).length, `canonical "${key}" had no variants`).toBeGreaterThan(0);
    }
  });
});

describe('live-DB drift guard', () => {
  it('every category in the live businesses snapshot is covered by the synonym table', () => {
    // Snapshot of `SELECT DISTINCT category FROM businesses WHERE is_live=true`
    // captured 2026-05-09. If a new live business is added with a category
    // not in the snapshot, this test still passes because the snapshot
    // hasn't been updated; but the round-trip test above will catch any
    // existing snapshot entry that loses its synonym mapping.
    //
    // To extend coverage when new live categories ship: update both
    // LIVE_CATEGORIES_SNAPSHOT here and CATEGORY_SYNONYMS in
    // lib/mcp/category-normalise.ts.
    for (const cat of LIVE_CATEGORIES_SNAPSHOT) {
      const variants = categoryQueryVariants(cat);
      expect(
        variants,
        `live category "${cat}" has no synonym mapping; add it to CATEGORY_SYNONYMS`,
      ).toContain(cat);
    }
  });

  it('every live category resolves to a canonical key when normalised', () => {
    for (const cat of LIVE_CATEGORIES_SNAPSHOT) {
      const canonical = normaliseCategory(cat);
      expect(canonical, `"${cat}" normalised to empty`).not.toBe('');
      expect(allCanonicalKeys(), `canonical for "${cat}" not in keys`).toContain(canonical);
    }
  });
});
