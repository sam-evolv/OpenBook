import { requireCurrentBusiness } from '@/lib/queries/business';
import { WebsiteForm, type WebsiteInitial } from '@/components/dashboard-v2/WebsiteForm';

export const dynamic = 'force-dynamic';

export default async function WebsitePage() {
  const { business } = await requireCurrentBusiness<WebsiteInitial>(
    `
    id, slug, name,
    website_is_published, website_headline,
    tagline, about_long,
    hero_image_url, gallery_urls,
    testimonials, instagram_access_token
    `.replace(/\s+/g, ' '),
  );
  return <WebsiteForm initial={business} />;
}
