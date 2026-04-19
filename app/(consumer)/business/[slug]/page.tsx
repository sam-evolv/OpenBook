import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { BusinessAppShell } from '@/components/business/BusinessAppShell';

export const dynamic = 'force-dynamic';

interface Props {
  params: { slug: string };
  searchParams: { tab?: string };
}

export default async function BusinessPage({ params, searchParams }: Props) {
  const sb = createSupabaseServerClient();

  // Fetch business + services + hours in parallel
  const { data: business } = await sb
    .from('businesses')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_live', true)
    .maybeSingle();

  if (!business) notFound();

  const [{ data: services }, { data: hours }] = await Promise.all([
    sb
      .from('services')
      .select('*')
      .eq('business_id', business.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
    sb
      .from('business_hours')
      .select('*')
      .eq('business_id', business.id)
      .order('day_of_week', { ascending: true }),
  ]);

  const initialTab =
    (searchParams.tab as 'home' | 'book' | 'gallery' | 'about') ?? 'home';

  return (
    <BusinessAppShell
      business={business}
      services={services ?? []}
      hours={hours ?? []}
      initialTab={initialTab}
    />
  );
}
