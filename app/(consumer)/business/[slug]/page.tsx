import { notFound } from 'next/navigation';
import { supabaseAdmin, type Business, type Service } from '@/lib/supabase';
import { heroForBusiness } from '@/lib/categories';
import { BusinessAppShell } from './BusinessAppShell';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export type BusinessExtended = Business & {
  tagline: string | null;
  about_long: string | null;
  gallery_urls: string[] | null;
  team: Array<{ name: string; role: string; photo_url?: string }> | null;
  testimonials: Array<{ quote: string; author: string; rating?: number }> | null;
  offers: Array<{ title: string; description: string; badge?: string }> | null;
};

async function getBusiness(slug: string): Promise<{
  business: BusinessExtended | null;
  services: Service[];
}> {
  const sb = supabaseAdmin();
  const { data: business } = await sb
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .eq('is_live', true)
    .maybeSingle();

  if (!business) return { business: null, services: [] };

  const { data: services } = await sb
    .from('services')
    .select('*')
    .eq('business_id', business.id)
    .eq('is_active', true)
    .order('price_cents', { ascending: true });

  // If no cover image set, pick a curated one for the category
  const enhanced = {
    ...business,
    cover_image_url:
      business.cover_image_url ??
      heroForBusiness(business.slug, business.category),
  };

  return {
    business: enhanced as BusinessExtended,
    services: (services ?? []) as Service[],
  };
}

export default async function BusinessPage({
  params,
}: {
  params: { slug: string };
}) {
  const { business, services } = await getBusiness(params.slug);
  if (!business) notFound();
  return <BusinessAppShell business={business} services={services} />;
}
