import { beforeEach, describe, expect, it, vi } from 'vitest';

// One controllable result the chain returns. Each test sets it via setRow.
let nextResult: { data: unknown; error: unknown } = { data: null, error: null };
const setRow = (data: unknown, error: unknown = null) => {
  nextResult = { data, error };
};

// Build a chainable mock that ends with .maybeSingle() resolving nextResult.
const buildChain = () => {
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => nextResult);
  return chain;
};

vi.mock('../../lib/supabase', () => ({
  supabaseAdmin: () => ({
    from: vi.fn(() => buildChain()),
  }),
}));

const ctx = { sourceAssistant: 'other', sourceIp: null, requestId: 'req-1' };

const { getBusinessInfoHandler } = await import('../../app/api/mcp/tools/get-business-info');

const baseRow = () => ({
  id: '11111111-1111-1111-1111-111111111111',
  slug: 'evolv-performance',
  name: 'Evolv Performance',
  description: 'Short description.',
  about_long: 'A longer description of the business that should land in full_description.',
  category: 'gym',
  address: null,
  address_line: '12 Main Street',
  city: 'Dublin',
  space_description: null,
  amenities: null,
  accessibility_notes: null,
  parking_info: null,
  nearest_landmark: null,
  public_transport_info: null,
  website: 'https://evolv.example',
  phone: '+353 1 555 0100',
  is_live: true,
  business_hours: [
    { day_of_week: 1, open_time: '08:00', close_time: '20:00', is_open: true, is_closed: false },
    { day_of_week: 0, open_time: '09:00', close_time: '17:00', is_open: true, is_closed: false },
    { day_of_week: 2, open_time: null, close_time: null, is_open: false, is_closed: true },
  ],
  business_closures: [],
  services: [
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'PT Session',
      description: 'One-on-one training.',
      duration_minutes: 60,
      price_cents: 6000,
      sort_order: 2,
      is_active: true,
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      name: 'Class',
      description: null,
      duration_minutes: 45,
      price_cents: 1500,
      sort_order: 1,
      is_active: true,
    },
  ],
  business_media: [],
  reviews: [],
});

beforeEach(() => {
  setRow(null, null);
});

describe('getBusinessInfoHandler', () => {
  it('returns full detail for a known live business', async () => {
    setRow(baseRow());
    const out = (await getBusinessInfoHandler({ slug: 'evolv-performance' }, ctx)) as Record<string, unknown>;

    expect(out.business_id).toBe('11111111-1111-1111-1111-111111111111');
    expect(out.name).toBe('Evolv Performance');
    expect(out.full_description).toBe('A longer description of the business that should land in full_description.');
    expect(out.address).toEqual({ line_1: '12 Main Street', city: 'Dublin', county: '' });
    expect(out.website_url).toBe('https://evolv.example');
    expect(out.contact_phone).toBe('+353 1 555 0100');
    expect(Array.isArray(out.services)).toBe(true);
    expect((out.services as unknown[]).length).toBe(2);
  });

  it('returns BUSINESS_NOT_FOUND when the slug is missing', async () => {
    setRow(null);
    const out = (await getBusinessInfoHandler({ slug: 'does-not-exist' }, ctx)) as { error?: { code: string } };
    expect(out.error?.code).toBe('BUSINESS_NOT_FOUND');
  });

  it('returns BUSINESS_NOT_FOUND when the business exists but is_live is false (filtered out)', async () => {
    // The .eq('is_live', true) clause means a non-live row would never come back.
    setRow(null);
    const out = (await getBusinessInfoHandler({ slug: 'hidden' }, ctx)) as { error?: { code: string } };
    expect(out.error?.code).toBe('BUSINESS_NOT_FOUND');
  });

  it('omits the rating field when there are no reviews', async () => {
    setRow(baseRow());
    const out = (await getBusinessInfoHandler({ slug: 'evolv-performance' }, ctx)) as Record<string, unknown>;
    expect(out.rating).toBeUndefined();
  });

  it('computes the correct average from a 4-review array', async () => {
    const row = baseRow();
    row.reviews = [
      { rating: 5, comment: null, created_at: '2026-04-01' },
      { rating: 4, comment: null, created_at: '2026-04-02' },
      { rating: 4, comment: null, created_at: '2026-04-03' },
      { rating: 3, comment: null, created_at: '2026-04-04' },
    ];
    setRow(row);
    const out = (await getBusinessInfoHandler({ slug: 'x' }, ctx)) as { rating?: { average: number; count: number } };
    expect(out.rating).toEqual({ average: 4, count: 4 });
  });

  it('filters review highlights to rating>=4 with comment length>=30, most recent 3', async () => {
    const row = baseRow();
    const longComment = (n: number) => `Brilliant session ${n}, the trainer was incredibly attentive and adapted everything.`;
    row.reviews = [
      { rating: 5, comment: longComment(1), created_at: '2026-05-01' },
      { rating: 5, comment: longComment(2), created_at: '2026-05-02' },
      { rating: 5, comment: longComment(3), created_at: '2026-05-03' },
      { rating: 5, comment: longComment(4), created_at: '2026-05-04' }, // most recent
      { rating: 3, comment: longComment(0), created_at: '2026-05-05' }, // rating too low
      { rating: 5, comment: 'too short', created_at: '2026-05-06' }, // comment too short
    ];
    setRow(row);
    const out = (await getBusinessInfoHandler({ slug: 'x' }, ctx)) as { recent_review_highlights?: string[] };
    expect(out.recent_review_highlights).toHaveLength(3);
    expect(out.recent_review_highlights?.[0]).toContain('session 4');
    expect(out.recent_review_highlights?.[1]).toContain('session 3');
    expect(out.recent_review_highlights?.[2]).toContain('session 2');
  });

  it('omits the space field entirely when no space data is present', async () => {
    setRow(baseRow());
    const out = (await getBusinessInfoHandler({ slug: 'x' }, ctx)) as Record<string, unknown>;
    expect(out.space).toBeUndefined();
  });

  it('includes the space field with empty photos when only space_description is set', async () => {
    const row = baseRow();
    row.space_description = 'Sun-drenched studio in a converted warehouse';
    setRow(row);
    const out = (await getBusinessInfoHandler({ slug: 'x' }, ctx)) as { space?: { description?: string; photos: unknown[] } };
    expect(out.space).toBeDefined();
    expect(out.space?.description).toBe('Sun-drenched studio in a converted warehouse');
    expect(out.space?.photos).toEqual([]);
  });

  it('filters business_closures to upcoming only', async () => {
    const row = baseRow();
    const today = new Date().toISOString().slice(0, 10);
    const past = '2024-01-01';
    const future = '2099-01-01';
    row.business_closures = [
      { date: past, name: 'Old' },
      { date: future, name: 'Future' },
      { date: today, name: 'Today' },
    ];
    setRow(row);
    const out = (await getBusinessInfoHandler({ slug: 'x' }, ctx)) as { closures_upcoming: Array<{ reason?: string }> };
    const reasons = out.closures_upcoming.map((c) => c.reason);
    expect(reasons).toContain('Today');
    expect(reasons).toContain('Future');
    expect(reasons).not.toContain('Old');
  });

  it('sorts services by sort_order ASC', async () => {
    setRow(baseRow());
    const out = (await getBusinessInfoHandler({ slug: 'x' }, ctx)) as { services: Array<{ name: string }> };
    expect(out.services.map((s) => s.name)).toEqual(['Class', 'PT Session']);
  });

  it('returns RESPONSE_VALIDATION_FAILED when Supabase data is malformed', async () => {
    const row = baseRow() as Record<string, unknown>;
    // Drop the required `id` column to break output validation.
    delete row.id;
    setRow(row);
    const out = (await getBusinessInfoHandler({ slug: 'x' }, ctx)) as { error?: { code: string } };
    expect(out.error?.code).toBe('RESPONSE_VALIDATION_FAILED');
  });
});
