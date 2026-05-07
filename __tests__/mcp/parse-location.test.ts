import { describe, expect, it } from 'vitest';
import { parseLocation } from '../../lib/mcp/parse-location';

describe('parseLocation', () => {
  it('returns null for empty input', () => {
    expect(parseLocation('')).toBeNull();
    expect(parseLocation(undefined)).toBeNull();
  });

  it('parses "Dublin"', () => {
    const out = parseLocation('Dublin');
    expect(out?.city).toBe('dublin');
    expect(out?.county).toBe('dublin');
  });

  it('parses "Dublin 2" with neighbourhood', () => {
    const out = parseLocation('Dublin 2');
    expect(out?.city).toBe('dublin');
    expect(out?.county).toBe('dublin');
    expect(out?.neighbourhood?.toLowerCase()).toBe('dublin 2');
  });

  it('parses "Cork city"', () => {
    const out = parseLocation('Cork city');
    expect(out?.city).toBe('cork');
    expect(out?.county).toBe('cork');
  });

  it('parses "Galway"', () => {
    const out = parseLocation('Galway');
    expect(out?.city).toBe('galway');
    expect(out?.county).toBe('galway');
  });

  it('parses "near Eyre Square" with no city', () => {
    const out = parseLocation('near Eyre Square');
    expect(out?.city).toBeNull();
    expect(out?.neighbourhood).toBe('Eyre Square');
  });

  it('parses "Mayo" as county only', () => {
    const out = parseLocation('Mayo');
    expect(out?.city).toBeNull();
    expect(out?.county).toBe('mayo');
  });

  it('returns gibberish with city/county null', () => {
    const out = parseLocation('gibberish');
    expect(out?.raw).toBe('gibberish');
    expect(out?.city).toBeNull();
    expect(out?.county).toBeNull();
    expect(out?.neighbourhood).toBeNull();
  });
});
