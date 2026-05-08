import { describe, expect, it } from 'vitest';

import {
  buildOrFilter,
  escapeIlikePattern,
  extractKeywords,
} from '../../lib/mcp/keyword-fallback';

describe('extractKeywords', () => {
  it('drops stopwords and short tokens', () => {
    expect(extractKeywords('find me a personal trainer in dublin')).toEqual([
      'personal',
      'trainer',
      'dublin',
    ]);
  });

  it('combines intent and location, deduplicates, lowercases', () => {
    expect(extractKeywords('Personal trainer', 'Dublin')).toEqual(['personal', 'trainer', 'dublin']);
  });

  it('strips punctuation', () => {
    expect(extractKeywords('Yoga, near Eyre Square!')).toEqual(['yoga', 'eyre', 'square']);
  });

  it('returns [] when only stopwords are present', () => {
    expect(extractKeywords('find me a place to go')).toEqual([]);
  });
});

describe('escapeIlikePattern', () => {
  it('strips PostgREST-meaningful characters', () => {
    expect(escapeIlikePattern('foo,bar%baz_qux(hi)')).toBe('foobarbazquxhi');
  });
});

describe('buildOrFilter', () => {
  it('emits column.ilike pairs for every (column, keyword) combination', () => {
    expect(buildOrFilter(['category', 'city'], ['personal', 'dublin'])).toBe(
      'category.ilike.%personal%,city.ilike.%personal%,category.ilike.%dublin%,city.ilike.%dublin%',
    );
  });

  it('returns empty string when no keywords are given', () => {
    expect(buildOrFilter(['category'], [])).toBe('');
  });
});
