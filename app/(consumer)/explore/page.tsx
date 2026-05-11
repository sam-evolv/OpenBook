import { Suspense } from 'react';
import { supabaseAdmin, type Business } from '@/lib/supabase';
import { ConsumerHeader } from '@/components/consumer/ConsumerHeader';
import { BottomTabBar } from '@/components/consumer/BottomTabBar';
import { ExploreShell } from './ExploreShell';
import { fetchOpenSpots } from '@/lib/open-spots-server';
import {
  isValidCategory,
  isValidWhen,
  type CategoryFilter,
  type WhenFilter,
} from '@/lib/open-spots';

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

type SearchParams = { [key: string]: string | string[] | undefined };

function readParam(
  sp: SearchParams,
  key: string
): string | null {
  const raw = sp[key];
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw ?? null;
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const cityParam = readParam(searchParams, 'city');
  const categoryParam = readParam(searchParams, 'category');
  const whenParam = readParam(searchParams, 'when');

  const initialCity = cityParam ?? 'anywhere';
  const initialCategory: CategoryFilter = isValidCategory(categoryParam)
    ? categoryParam
    : 'all';
  const initialWhen: WhenFilter = isValidWhen(whenParam) ? whenParam : 'week';

  const [businesses, initialOpenSpots] = await Promise.all([
    getBusinesses(),
    fetchOpenSpots({
      city: initialCity !== 'anywhere' ? initialCity : null,
      category: initialCategory,
      when: initialWhen,
    }),
  ]);

  return (
    <main className="min-h-[100dvh] text-white antialiased">
      <ConsumerHeader />
      <Suspense fallback={null}>
        <ExploreShell
          businesses={businesses}
          initialOpenSpots={initialOpenSpots}
          initialCity={initialCity}
          initialCategory={initialCategory}
          initialWhen={initialWhen}
        />
      </Suspense>
      <BottomTabBar />
    </main>
  );
}
