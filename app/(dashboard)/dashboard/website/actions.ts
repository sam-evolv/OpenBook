'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, getCurrentOwner } from '@/lib/supabase-server';

export interface TestimonialEntry {
  quote: string;
  author: string;
  role?: string | null;
}

export interface WebsitePayload {
  website_is_published: boolean;
  website_headline: string | null;
  tagline: string | null;
  about_long: string | null;
  gallery_urls: string[] | null;
  testimonials: TestimonialEntry[];
}

const HEADLINE_MAX = 80;
const TAGLINE_MAX = 140;
const ABOUT_MAX = 4000;
const QUOTE_MAX = 200;
const TESTIMONIAL_MAX = 6;
const GALLERY_MAX = 8;

function sanitiseTestimonials(input: unknown): TestimonialEntry[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const r = row as Record<string, unknown>;
      const quote = typeof r.quote === 'string' ? r.quote.trim().slice(0, QUOTE_MAX) : '';
      const author = typeof r.author === 'string' ? r.author.trim().slice(0, 120) : '';
      const roleRaw = typeof r.role === 'string' ? r.role.trim().slice(0, 120) : '';
      if (!quote || !author) return null;
      const entry: TestimonialEntry = { quote, author };
      if (roleRaw) entry.role = roleRaw;
      return entry;
    })
    .filter((x): x is TestimonialEntry => x !== null)
    .slice(0, TESTIMONIAL_MAX);
}

export async function saveWebsiteSettings(payload: WebsitePayload) {
  const owner = await getCurrentOwner();
  if (!owner) return { ok: false as const, error: 'Not signed in' };

  const sb = createSupabaseServerClient();
  const { data: business } = await sb
    .from('businesses')
    .select('id')
    .eq('owner_id', owner.id)
    .eq('is_live', true)
    .maybeSingle();

  if (!business) return { ok: false as const, error: 'No live business' };

  const headline = (payload.website_headline ?? '').trim().slice(0, HEADLINE_MAX) || null;
  const tagline = (payload.tagline ?? '').trim().slice(0, TAGLINE_MAX) || null;
  const about = (payload.about_long ?? '').trim().slice(0, ABOUT_MAX) || null;
  const gallery = Array.isArray(payload.gallery_urls)
    ? payload.gallery_urls.filter((u) => typeof u === 'string' && u.length > 0).slice(0, GALLERY_MAX)
    : null;
  const testimonials = sanitiseTestimonials(payload.testimonials);

  const { error } = await sb
    .from('businesses')
    .update({
      website_is_published: Boolean(payload.website_is_published),
      website_headline: headline,
      tagline,
      about_long: about,
      gallery_urls: gallery,
      testimonials,
    })
    .eq('id', (business as { id: string }).id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath('/dashboard/website');
  return { ok: true as const };
}
