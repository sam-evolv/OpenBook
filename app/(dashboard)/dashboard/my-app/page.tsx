import { requireCurrentBusiness } from '@/lib/queries/business';
import { MyAppClient, type MyAppInitial } from '@/components/dashboard-v2/my-app/MyAppClient';
import type { ServiceRow } from '@/components/dashboard-v2/ServiceDrawer';

export const dynamic = 'force-dynamic';

export default async function MyAppPage() {
  const { business, sb } = await requireCurrentBusiness<MyAppInitial>(
    'id, name, slug, category, tagline, about_long, city, primary_colour, logo_url, processed_icon_url, cover_image_url, hero_image_url, gallery_urls, offers',
  );

  const { data: services } = await sb
    .from('services')
    .select('id, name, description, duration_minutes, price_cents, is_active, sort_order')
    .eq('business_id', business.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true, nullsFirst: false });

  return <MyAppClient initial={business} services={(services ?? []) as ServiceRow[]} />;
}
