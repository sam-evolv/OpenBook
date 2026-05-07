// get_business_info — full detail on a single live business.
// Spec: docs/mcp-server-spec.md section 5.3.
//
// Strategy: one Supabase query with nested selects (~p95 < 200ms target,
// section 14). Real column names diverge from the spec's example schema in
// a few places; we adapt where needed. Notable mappings:
//   - businesses.address_line / .address  → address.line_1
//   - businesses.about_long || .description → full_description
//   - businesses.website / .phone          → website_url / contact_phone
//   - business_hours.open_time / .close_time → opens / closes
//   - business_closures.date / .name       → starts / ends / reason
//   - services.price_cents (÷100)          → price_eur

import { getBusinessInfoInput, getBusinessInfoOutput } from '../../../../lib/mcp/schemas';
import { supabaseAdmin } from '../../../../lib/supabase';
import type { ToolHandler } from './index';

const SELECT_COLUMNS = `
  id, slug, name, description, about_long, category,
  address, address_line, city,
  space_description, amenities, accessibility_notes,
  parking_info, nearest_landmark, public_transport_info,
  website, phone, is_live,
  business_hours (day_of_week, open_time, close_time, is_open, is_closed),
  business_closures (date, name),
  services (id, name, description, duration_minutes, price_cents, sort_order, is_active),
  business_media (id, url, caption, kind, sort_order),
  reviews (rating, comment, created_at)
`;

type BusinessRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  about_long: string | null;
  category: string | null;
  address: string | null;
  address_line: string | null;
  city: string | null;
  space_description: string | null;
  amenities: string[] | null;
  accessibility_notes: string | null;
  parking_info: string | null;
  nearest_landmark: string | null;
  public_transport_info: string | null;
  website: string | null;
  phone: string | null;
  is_live: boolean | null;
  business_hours: Array<{
    day_of_week: number;
    open_time: string | null;
    close_time: string | null;
    is_open: boolean | null;
    is_closed: boolean | null;
  }> | null;
  business_closures: Array<{ date: string; name: string | null }> | null;
  services: Array<{
    id: string;
    name: string;
    description: string | null;
    duration_minutes: number;
    price_cents: number;
    sort_order: number | null;
    is_active: boolean | null;
  }> | null;
  business_media: Array<{
    id: string;
    url: string;
    caption: string | null;
    kind: 'interior' | 'exterior' | 'service' | 'team';
    sort_order: number | null;
  }> | null;
  reviews: Array<{
    rating: number | null;
    comment: string | null;
    created_at: string | null;
  }> | null;
};

const NOT_FOUND = {
  error: { code: 'BUSINESS_NOT_FOUND', message: 'Business not found or not currently live.' },
} as const;

function truncateAtWord(s: string, max: number): string {
  if (s.length <= max) return s;
  const slice = s.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  const cut = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
  return `${cut}...`;
}

function dayBoundsIso(date: string): { starts: string; ends: string } {
  // `date` from Postgres comes as YYYY-MM-DD. Treat the whole calendar day in UTC.
  return {
    starts: `${date}T00:00:00.000Z`,
    ends: `${date}T23:59:59.999Z`,
  };
}

export const getBusinessInfoHandler: ToolHandler = async (input) => {
  const { slug } = getBusinessInfoInput.parse(input);

  const { data, error } = await supabaseAdmin()
    .from('businesses')
    .select(SELECT_COLUMNS)
    .eq('slug', slug)
    .eq('is_live', true)
    .maybeSingle<BusinessRow>();

  if (error) {
    console.error('[mcp.get_business_info] supabase error:', { slug, error });
    return {
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch business.' },
    };
  }

  if (!data) {
    return NOT_FOUND;
  }

  const reviews = data.reviews ?? [];
  const ratedReviews = reviews.filter((r): r is { rating: number; comment: string | null; created_at: string | null } => typeof r.rating === 'number');
  const rating =
    ratedReviews.length === 0
      ? undefined
      : {
          average: Math.round((ratedReviews.reduce((sum, r) => sum + r.rating, 0) / ratedReviews.length) * 10) / 10,
          count: ratedReviews.length,
        };

  const highlights = reviews
    .filter((r): r is { rating: number; comment: string; created_at: string | null } =>
      typeof r.rating === 'number' && r.rating >= 4 && typeof r.comment === 'string' && r.comment.length >= 30,
    )
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
    .slice(0, 3)
    .map((r) => truncateAtWord(r.comment, 200));
  const recent_review_highlights = highlights.length > 0 ? highlights : undefined;

  const services = (data.services ?? [])
    .filter((s) => s.is_active !== false)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((s) => ({
      service_id: s.id,
      name: s.name,
      description: s.description ?? undefined,
      duration_minutes: s.duration_minutes,
      price_eur: s.price_cents / 100,
    }));

  const media = (data.business_media ?? []).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const hours = (data.business_hours ?? [])
    .filter(
      (h) =>
        h.is_closed !== true && h.is_open !== false && typeof h.open_time === 'string' && typeof h.close_time === 'string',
    )
    .sort((a, b) => a.day_of_week - b.day_of_week)
    .map((h) => ({
      day_of_week: h.day_of_week,
      opens: h.open_time as string,
      closes: h.close_time as string,
    }));

  const todayIso = new Date().toISOString().slice(0, 10);
  const closures_upcoming = (data.business_closures ?? [])
    .filter((c) => c.date >= todayIso)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((c) => {
      const { starts, ends } = dayBoundsIso(c.date);
      return c.name ? { starts, ends, reason: c.name } : { starts, ends };
    });

  const amenities = data.amenities && data.amenities.length > 0 ? data.amenities : undefined;
  const hasSpace =
    !!data.space_description ||
    media.length > 0 ||
    !!amenities ||
    !!data.accessibility_notes ||
    !!data.parking_info ||
    !!data.nearest_landmark ||
    !!data.public_transport_info;

  const space = hasSpace
    ? {
        description: data.space_description ?? undefined,
        photos: media.map((m) => ({
          url: m.url,
          caption: m.caption ?? undefined,
          kind: m.kind,
        })),
        amenities,
        accessibility_notes: data.accessibility_notes ?? undefined,
        parking: data.parking_info ?? undefined,
        nearest_landmark: data.nearest_landmark ?? undefined,
        public_transport: data.public_transport_info ?? undefined,
      }
    : undefined;

  const fullDescriptionRaw = data.about_long ?? data.description ?? '';
  const full_description = fullDescriptionRaw.length > 1000 ? fullDescriptionRaw.slice(0, 1000) : fullDescriptionRaw;

  const response = {
    business_id: data.id,
    slug: data.slug,
    name: data.name,
    full_description,
    category: data.category ?? '',
    address: {
      line_1: data.address_line ?? data.address ?? '',
      city: data.city ?? '',
      // The current businesses table has no county column. Empty string keeps
      // the shape stable for the assistant; populate when the column lands.
      county: '',
    },
    hours,
    closures_upcoming,
    services,
    rating,
    recent_review_highlights,
    space,
    website_url: data.website ?? undefined,
    contact_phone: data.phone ?? undefined,
  };

  const validation = getBusinessInfoOutput.safeParse(response);
  if (!validation.success) {
    console.error('[mcp.get_business_info] response validation failed:', {
      slug,
      issues: validation.error.format(),
    });
    return {
      error: { code: 'RESPONSE_VALIDATION_FAILED', message: 'Internal error constructing business info.' },
    };
  }

  return validation.data;
};
