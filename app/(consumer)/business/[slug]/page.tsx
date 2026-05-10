import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { BusinessAppShell } from '@/components/business/BusinessAppShell';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function BusinessPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const sb = createSupabaseServerClient();

  // Fetch business + services + hours in parallel
  const { data: business } = await sb
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .eq('is_live', true)
    .maybeSingle();

  if (!business) notFound();

  const [{ data: services }, { data: hours }] = await Promise.all([
    sb
      .from('services')
      .select('*')
      .eq('business_id', business.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true, nullsFirst: false }),
    sb
      .from('business_hours')
      .select('*')
      .eq('business_id', business.id)
      .order('day_of_week', { ascending: true }),
  ]);

  const initialTab =
    (sp.tab as 'home' | 'book' | 'gallery' | 'about') ?? 'home';

  return (
    <BusinessAppShell
      business={business}
      services={services ?? []}
      hours={hours ?? []}
      initialTab={initialTab}
    />
  );
}
