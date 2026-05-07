import { requireCurrentBusiness } from '@/lib/queries/business';
import { MyAppClient, type MyAppInitial } from '@/components/dashboard-v2/my-app/MyAppClient';

export const dynamic = 'force-dynamic';

export default async function MyAppPage() {
  const { business } = await requireCurrentBusiness<MyAppInitial>(
    'id, name, slug, category, tagline, about_long, city, primary_colour, logo_url, processed_icon_url, cover_image_url, hero_image_url, gallery_urls',
  );

  return <MyAppClient initial={business} />;
}
