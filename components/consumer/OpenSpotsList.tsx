/**
 * OpenSpotsList — the Open Spots tab body.
 *
 * - LocationChip + two FilterPillRows (category, when).
 * - Server hands us the initial spots (for SSR / no-flash).
 * - Filter changes trigger a client fetch against /api/open-spots.
 * - Empty state offers the standing-alert CTA (route lands in PR 4).
 *
 * Loading skeletons use the same outer dimensions as a real card to
 * prevent layout shift.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { LocationChip, type CityValue } from './LocationChip';
import { FilterPillRow } from './FilterPillRow';
import { OpenSpotCard, OpenSpotCardSkeleton } from './OpenSpotCard';
import {
  CATEGORY_OPTIONS,
  WHEN_OPTIONS,
  type CategoryFilter,
  type OpenSpot,
  type WhenFilter,
  isValidCategory,
  isValidWhen,
} from '@/lib/open-spots';

type Props = {
  initialSpots: OpenSpot[];
  initialCity: CityValue;
  initialCategory: CategoryFilter;
  initialWhen: WhenFilter;
};

const CITY_STORAGE_KEY = 'ob_explore_city';

export function OpenSpotsList({
  initialSpots,
  initialCity,
  initialCategory,
  initialWhen,
}: Props) {
  const [city, setCity] = useState<CityValue>(initialCity);
  const [category, setCategory] = useState<CategoryFilter>(initialCategory);
  const [when, setWhen] = useState<WhenFilter>(initialWhen);

  const [spots, setSpots] = useState<OpenSpot[]>(initialSpots);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstRenderRef = useRef(true);

  // Hydrate city from localStorage on first mount (overrides initial if set).
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CITY_STORAGE_KEY);
      if (stored && stored !== city) setCity(stored);
    } catch {
      // localStorage not available — ignore.
    }
    // We only want this on first mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist city.
  useEffect(() => {
    try {
      window.localStorage.setItem(CITY_STORAGE_KEY, city);
    } catch {
      // ignore
    }
  }, [city]);

  // Mirror category + when into URL.
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('category', category);
    url.searchParams.set('when', when);
    window.history.replaceState({}, '', url.toString());
  }, [category, when]);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ category, when, city });
      const res = await fetch(`/api/open-spots?${params.toString()}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('bad response');
      const json = (await res.json()) as { spots: OpenSpot[] };
      setSpots(json.spots);
    } catch {
      setError("Couldn't load Open Spots. Tap to retry.");
    } finally {
      setLoading(false);
    }
  }, [category, when, city]);

  // Refetch when any filter changes (skip the initial render — SSR data is fresh).
  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }
    refetch();
  }, [refetch]);

  return (
    <div className="pb-40 pt-4">
      <div className="px-5 mb-3">
        <LocationChip value={city} onChange={setCity} />
      </div>

      <div className="px-5 mb-3">
        <FilterPillRow
          ariaLabel="Filter by category"
          options={CATEGORY_OPTIONS}
          value={category}
          onChange={(next) => isValidCategory(next) && setCategory(next)}
        />
      </div>

      <div className="px-5 mb-5">
        <FilterPillRow
          ariaLabel="Filter by time"
          options={WHEN_OPTIONS}
          value={when}
          onChange={(next) => isValidWhen(next) && setWhen(next)}
        />
      </div>

      <div className="px-5">
        {error ? (
          <button
            type="button"
            onClick={refetch}
            className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-8 text-center text-[14px] text-white/70 active:scale-[0.99] transition"
          >
            {error}
          </button>
        ) : loading ? (
          <div className="flex flex-col gap-4">
            <OpenSpotCardSkeleton />
            <OpenSpotCardSkeleton />
            <OpenSpotCardSkeleton />
          </div>
        ) : spots.length === 0 ? (
          <EmptyState city={city} />
        ) : (
          <div className="flex flex-col gap-4">
            {spots.map((s) => (
              <OpenSpotCard key={s.id} spot={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ city }: { city: CityValue }) {
  const cityLabel =
    city === 'anywhere'
      ? 'right now'
      : `right now in ${capitalise(city)}`;
  return (
    <div className="pt-[28vh] flex flex-col items-center text-center px-2">
      <h3 className="font-serif text-[22px] font-medium text-white">
        Nothing open {cityLabel}
      </h3>
      <p className="mt-2 max-w-[300px] text-[14px] leading-[1.5] text-zinc-400">
        Standing alerts are coming soon &mdash; we&apos;ll ping you the
        moment a spot opens up that matches what you&apos;re after.
      </p>
      {/* TODO(PR4): Re-enable as a Link to /standing-alerts/new
           once the standing alerts page ships. */}
      <button
        type="button"
        disabled
        aria-label="Standing alerts launching soon"
        className="mt-6 inline-flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-transparent px-5 py-3 text-sm font-medium text-zinc-400 dark:text-zinc-500 opacity-70 cursor-not-allowed"
      >
        Set a standing alert
        <span className="text-[10px] uppercase tracking-[0.08em] font-semibold text-[#D4AF37]/80">
          Coming soon
        </span>
      </button>
    </div>
  );
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
