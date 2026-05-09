import { describe, expect, it } from 'vitest';

import {
  categoryEquals,
  categoryQueryVariants,
  normaliseCategory,
} from '../../lib/mcp/category-normalise';

describe('normaliseCategory', () => {
  it('treats Title Case, lowercase, and snake_case as the same canonical form', () => {
    expect(normaliseCategory('Personal Training')).toBe('personal_training');
    expect(normaliseCategory('personal training')).toBe('personal_training');
    expect(normaliseCategory('personal_training')).toBe('personal_training');
    expect(normaliseCategory('  Personal-Training  ')).toBe('personal_training');
  });

  it('returns empty string for null/undefined/empty', () => {
    expect(normaliseCategory(null)).toBe('');
    expect(normaliseCategory(undefined)).toBe('');
    expect(normaliseCategory('')).toBe('');
  });

  it('strips characters outside [a-z0-9_]', () => {
    expect(normaliseCategory('Yoga & Pilates!')).toBe('yoga__pilates');
  });
});

describe('categoryEquals', () => {
  it('matches the variants observed in production data', () => {
    expect(categoryEquals('Personal Training', 'personal_training')).toBe(true);
    expect(categoryEquals('personal training', 'personal_training')).toBe(true);
    expect(categoryEquals('personal_training', 'personal_training')).toBe(true);
  });

  it('rejects mismatched categories', () => {
    expect(categoryEquals('Personal Training', 'yoga')).toBe(false);
  });

  it('returns false when either side is empty', () => {
    expect(categoryEquals(null, 'yoga')).toBe(false);
    expect(categoryEquals('yoga', '')).toBe(false);
    expect(categoryEquals(null, null)).toBe(false);
  });
});

describe('categoryQueryVariants', () => {
  it('expands snake_case into the three plausible DB-stored forms', () => {
    expect(categoryQueryVariants('personal_training').sort()).toEqual(
      ['Personal Training', 'personal training', 'personal_training'].sort(),
    );
  });

  it('returns a single entry for single-word categories', () => {
    expect(categoryQueryVariants('yoga')).toEqual(['yoga', 'Yoga']);
  });

  it('returns [] for empty input', () => {
    expect(categoryQueryVariants('')).toEqual([]);
  });
});
