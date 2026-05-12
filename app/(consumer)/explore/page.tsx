import { Suspense } from 'react';
import { cookies } from 'next/headers';
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
      'id, slug, name, category, city, primary_colour, cover_image_url, logo_url, processed_icon_url, description, price_tier, rating, is_live'
    )
    .eq('is_live', true)
    .order('name', { ascending: true });
  if (error) return [];
  return (data ?? []) as Business[];
}

async function getPinnedIds(): Promise<Set<string>> {
  const customerId = (await cookies()).get('ob_customer_id')?.value;
  if (!customerId) return new Set();
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('home_pins')
    .select('business_id')
    .eq('customer_id', customerId);
  if (error || !data) return new Set();
  return new Set(data.map((r) => r.business_id as string));
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
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const cityParam = readParam(sp, 'city');
  const categoryParam = readParam(sp, 'category');
  const whenParam = readParam(sp, 'when');

  const initialCity = cityParam ?? 'anywhere';
  const initialCategory: CategoryFilter = isValidCategory(categoryParam)
    ? categoryParam
    : 'all';
  const initialWhen: WhenFilter = isValidWhen(whenParam) ? whenParam : 'week';

  const [businesses, initialOpenSpots, initialPinnedIds] = await Promise.all([
    getBusinesses(),
    fetchOpenSpots({
      city: initialCity !== 'anywhere' ? initialCity : null,
      category: initialCategory,
      when: initialWhen,
    }),
    getPinnedIds(),
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
          initialPinnedIds={initialPinnedIds}
        />
      </Suspense>
      <BottomTabBar />
    </main>
  );
}
