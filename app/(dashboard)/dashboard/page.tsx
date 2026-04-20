import { createSupabaseServerClient, getCurrentOwner } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { OverviewClient } from '@/components/dashboard/OverviewClient';

export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
  const owner = await getCurrentOwner();
  if (!owner) redirect('/onboard');

  const sb = createSupabaseServerClient();
  const { data: business } = await sb
    .from('businesses')
    .select('id, name, slug, stripe_account_id, processed_icon_url, hero_image_url, gallery_urls')
    .eq('owner_id', owner.id)
    .eq('is_live', true)
    .maybeSingle();

  if (!business) redirect('/onboard/flow');

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString();
  const startOfLastWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7 - now.getDay()).toISOString();

  const [todayRes, weekRes, lastWeekRes, upcomingRes, customerCountRes, servicesCountRes] = await Promise.all([
    sb.from('bookings').select('id, price_cents', { count: 'exact' })
      .eq('business_id', business.id).gte('starts_at', startOfToday).lt('starts_at', endOfToday).neq('status', 'cancelled'),
    sb.from('bookings').select('id, price_cents', { count: 'exact' })
      .eq('business_id', business.id).gte('starts_at', startOfWeek).neq('status', 'cancelled'),
    sb.from('bookings').select('id, price_cents', { count: 'exact' })
      .eq('business_id', business.id).gte('starts_at', startOfLastWeek).lt('starts_at', startOfWeek).neq('status', 'cancelled'),
    sb.from('bookings').select('id, starts_at, price_cents, services(name), customers(first_name, last_name)')
      .eq('business_id', business.id).gte('starts_at', now.toISOString()).neq('status', 'cancelled')
      .order('starts_at', { ascending: true }).limit(5),
    sb.from('customer_businesses').select('customer_id', { count: 'exact', head: true }).eq('business_id', business.id),
    sb.from('services').select('id', { count: 'exact', head: true }).eq('business_id', business.id),
  ]);

  const stats = {
    todayCount: todayRes.count ?? 0,
    todayRevenue: (todayRes.data ?? []).reduce((s, b) => s + (b.price_cents ?? 0), 0),
    weekCount: weekRes.count ?? 0,
    weekRevenue: (weekRes.data ?? []).reduce((s, b) => s + (b.price_cents ?? 0), 0),
    lastWeekCount: lastWeekRes.count ?? 0,
    lastWeekRevenue: (lastWeekRes.data ?? []).reduce((s, b) => s + (b.price_cents ?? 0), 0),
    customerCount: customerCountRes.count ?? 0,
  };

  const checklistItems = {
    hasServices: (servicesCountRes.count ?? 0) > 0,
    hasHero: !!business.hero_image_url,
    hasGallery: (business.gallery_urls ?? []).length > 0,
    hasStripe: !!business.stripe_account_id,
    hasFirstBooking: (upcomingRes.data ?? []).length > 0 || (weekRes.count ?? 0) > 0,
  };

  return (
    <OverviewClient
      business={business}
      ownerName={owner.full_name ?? undefined}
      stats={stats}
      upcoming={upcomingRes.data ?? []}
      checklist={checklistItems}
    />
  );
}
