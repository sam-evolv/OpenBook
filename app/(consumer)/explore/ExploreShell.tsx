'use client';

/**
 * ExploreShell — wraps the three Explore tabs (Discover / Open Spots /
 * Favourites) and renders the right pane. The Discover pane preserves
 * the existing ExploreClient behaviour exactly.
 *
 * Favourites is a placeholder for PR 2 — the surface ships separately.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Business } from '@/lib/supabase';
import type {
  CategoryFilter,
  OpenSpot,
  WhenFilter,
} from '@/lib/open-spots';
import { ExploreClient } from './ExploreClient';
import { SegmentedTabs, type TabId } from '@/components/consumer/SegmentedTabs';
import { OpenSpotsList } from '@/components/consumer/OpenSpotsList';
import type { CityValue } from '@/components/consumer/LocationChip';

type Props = {
  businesses: Business[];
  initialOpenSpots: OpenSpot[];
  initialCity: CityValue;
  initialCategory: CategoryFilter;
  initialWhen: WhenFilter;
};

const VALID_TABS: ReadonlyArray<TabId> = ['discover', 'open-spots', 'favourites'];

function isTab(value: string | null | undefined): value is TabId {
  return !!value && (VALID_TABS as readonly string[]).includes(value);
}

export function ExploreShell({
  businesses,
  initialOpenSpots,
  initialCity,
  initialCategory,
  initialWhen,
}: Props) {
  const [tab, setTab] = useState<TabId>('discover');

  // Read ?tab= on mount + persist on change.
  useEffect(() => {
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get('tab');
    if (isTab(fromUrl)) setTab(fromUrl);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (tab === 'discover') url.searchParams.delete('tab');
    else url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url.toString());
  }, [tab]);

  return (
    <div>
      <div className="px-5 pt-4 pb-3">
        <h1 className="font-serif text-[28px] font-medium leading-none tracking-tight text-white">
          Explore
        </h1>
      </div>

      <SegmentedTabs value={tab} onChange={setTab} />

      {tab === 'discover' && <ExploreClient businesses={businesses} />}
      {tab === 'open-spots' && (
        <OpenSpotsList
          initialSpots={initialOpenSpots}
          initialCity={initialCity}
          initialCategory={initialCategory}
          initialWhen={initialWhen}
        />
      )}
      {tab === 'favourites' && <FavouritesPlaceholder />}
    </div>
  );
}

/**
 * The full Favourites surface lands in a follow-up — for now we render a
 * polite stub so the segmented control has a valid third pane.
 */
function FavouritesPlaceholder() {
  return (
    <div className="pb-40 pt-[24vh] flex flex-col items-center text-center px-5">
      <h3 className="font-serif text-[22px] font-medium text-white">
        Your favourites
      </h3>
      <p className="mt-2 max-w-[280px] text-[14px] leading-[1.5] text-zinc-400">
        Save the places you love and they&apos;ll live here for one-tap booking.
      </p>
      <Link
        href="/explore"
        className="
          mt-6 inline-flex h-12 items-center justify-center rounded-full
          bg-white/[0.04] border border-white/[0.08] px-6
          text-[14px] font-medium text-white/85 active:scale-95 transition
        "
      >
        Browse Discover
      </Link>
    </div>
  );
}
