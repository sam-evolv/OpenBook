import { Suspense } from 'react';
import { supabaseAdmin, type Business } from '@/lib/supabase';
import { ConsumerHeader } from '@/components/consumer/ConsumerHeader';
import { BottomTabBar } from '@/components/consumer/BottomTabBar';
import { ExploreClient } from './ExploreClient';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

async function getBusinesses(): Promise<Business[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('businesses')
    .select(
      'id, slug, name, category, city, primary_colour, cover_image_url, logo_url, description, price_tier, rating, is_live'
    )
    .eq('is_live', true)
    .order('name', { ascending: true });
  if (error) return [];
  return (data ?? []) as Business[];
}

export default async function ExplorePage() {
  const businesses = await getBusinesses();
  return (
    <main className="min-h-[100dvh] bg-[#050505] text-white antialiased">
      <ConsumerHeader />
      <Suspense fallback={null}>
        <ExploreClient businesses={businesses} />
      </Suspense>
      <BottomTabBar />
    </main>
  );
}
