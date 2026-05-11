'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { Search, Star, TrendingUp } from 'lucide-react';
import type { Business } from '@/lib/supabase';
import { getTileColour } from '@/lib/tile-palette';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'gym', label: 'Gym', match: ['fitness', 'gym', 'personal training'] },
  { id: 'sauna', label: 'Sauna', match: ['sauna', 'spa'] },
  { id: 'salon', label: 'Salon', match: ['salon', 'nails', 'beauty'] },
  { id: 'barber', label: 'Barber', match: ['barber'] },
  { id: 'massage', label: 'Massage', match: ['massage', 'therapy'] },
  { id: 'yoga', label: 'Yoga', match: ['yoga'] },
  { id: 'physio', label: 'Physio', match: ['physio', 'health'] },
];

function priceLabel(tier: number | null) {
  const t = Math.max(1, Math.min(4, tier ?? 2));
  return '€'.repeat(t);
}

function matchesCategory(biz: Business, catId: string): boolean {
  if (catId === 'all') return true;
  const cat = CATEGORIES.find((c) => c.id === catId);
  if (!cat?.match) return false;
  const hay = `${biz.category ?? ''}`.toLowerCase();
  return cat.match.some((m) => hay.includes(m));
}

export function ExploreClient({ businesses }: { businesses: Business[] }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return businesses.filter((b) => {
      if (!matchesCategory(b, category)) return false;
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        (b.category ?? '').toLowerCase().includes(q) ||
        (b.city ?? '').toLowerCase().includes(q)
      );
    });
  }, [businesses, query, category]);

  // Pick a "trending" feature based on highest rating + price
  const trending = useMemo(
    () =>
      [...businesses]
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
        .slice(0, 3),
    [businesses]
  );

  const featured = filtered.slice(0, 4);
  const rest = filtered.slice(4);
  const showTrending = query.trim() === '' && category === 'all';

  return (
    <div className="pb-40 pt-4">
      {/* Search */}
      <div className="px-5">
        <div
          className="
            flex items-center gap-3 h-12 px-4 rounded-2xl
            bg-white/[0.04] border border-white/[0.06]
            focus-within:border-white/[0.14] transition
          "
        >
          <Search className="w-4 h-4 text-white/40" strokeWidth={2.2} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Gyms, salons, sauna..."
            className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-white/35 text-white"
          />
        </div>
      </div>

      {/* Category pills */}
      <div className="mt-4 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 px-5 pb-1">
          {CATEGORIES.map((c) => {
            const active = c.id === category;
            return (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`
                  shrink-0 h-9 px-4 rounded-full text-[13.5px] font-medium
                  transition-all active:scale-95
                  ${
                    active
                      ? 'bg-[#D4AF37] text-black border border-[#D4AF37]'
                      : 'bg-white/[0.03] text-white/70 border border-white/[0.08] hover:border-white/20'
                  }
                `}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Trending strip (default view only) */}
      {showTrending && trending.length > 0 && (
        <section className="mt-7">
          <div className="flex items-center gap-2 px-5 mb-3">
            <TrendingUp className="w-4 h-4 text-[#D4AF37]" strokeWidth={2.2} />
            <h2 className="text-[11px] font-semibold tracking-[0.16em] text-white/60 uppercase">
              Trending now
            </h2>
          </div>
          <div className="overflow-x-auto no-scrollbar">
            <div className="flex gap-3 px-5 pb-1">
              {trending.map((biz) => (
                <TrendingCard key={biz.id} biz={biz} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured grid */}
      <section className="mt-8 px-5">
        <h2 className="text-[11px] font-semibold tracking-[0.16em] text-white/40 uppercase mb-3">
          {showTrending ? 'Browse all' : `${filtered.length} results`}
        </h2>
        {featured.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {featured.map((biz) => (
              <FeaturedCard key={biz.id} biz={biz} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-12 text-center">
            <p className="text-[15px] font-semibold text-white/75">
              No businesses match your search.
            </p>
            <p className="mx-auto mt-1 max-w-[260px] text-[12.5px] leading-snug text-white/45">
              Try a broader category or clear the search to browse everything live on OpenBook.
            </p>
            {(query || category !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setCategory('all');
                }}
                className="mt-4 h-10 rounded-full bg-[#D4AF37] px-5 text-[13px] font-semibold text-black active:scale-95"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </section>

      {/* All other results */}
      {rest.length > 0 && (
        <section className="mt-6 px-5">
          <h2 className="text-[11px] font-semibold tracking-[0.16em] text-white/40 uppercase mb-3">
            All nearby
          </h2>
          <div className="flex flex-col gap-2.5">
            {rest.map((biz) => (
              <NearbyRow key={biz.id} biz={biz} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TrendingCard({ biz }: { biz: Business }) {
  const colour = getTileColour(biz.primary_colour).mid;
  return (
    <Link
      href={`/business/${biz.slug}`}
      className="
        shrink-0 w-[280px] relative block rounded-2xl overflow-hidden
        bg-white/[0.03] border border-white/[0.06]
        active:scale-[0.98] transition
      "
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        {biz.cover_image_url ? (
          <Image
            src={biz.cover_image_url}
            alt={biz.name}
            fill
            sizes="280px"
            className="object-cover"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background: `linear-gradient(145deg, ${colour} 0%, #0a0a0a 100%)`,
            }}
          />
        )}
        <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black via-black/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-3.5">
          <h3 className="text-[15px] font-semibold tracking-tight text-white leading-tight truncate">
            {biz.name}
          </h3>
          <p className="mt-0.5 text-[12px] text-white/65 leading-tight truncate">
            {biz.category} · {biz.city}
          </p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <Star
              className="w-[12px] h-[12px]"
              strokeWidth={0}
              style={{ fill: colour, color: colour }}
            />
            <span className="text-[12px] font-medium text-white/85">
              {(biz.rating ?? 5).toFixed(1)}
            </span>
            <span className="text-white/30 text-[12px]">·</span>
            <span className="text-[12px] font-medium text-white/85">
              {priceLabel(biz.price_tier)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function FeaturedCard({ biz }: { biz: Business }) {
  const colour = getTileColour(biz.primary_colour).mid;
  const initials = biz.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <Link
      href={`/business/${biz.slug}`}
      className="
        relative block rounded-2xl overflow-hidden
        bg-white/[0.03] border border-white/[0.06]
        active:scale-[0.98] transition
      "
    >
      <div className="relative aspect-[4/3.4] w-full overflow-hidden">
        {biz.cover_image_url ? (
          <Image
            src={biz.cover_image_url}
            alt={biz.name}
            fill
            sizes="(max-width: 768px) 50vw, 300px"
            className="object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background: `radial-gradient(circle at 50% 40%, ${colour}44 0%, #0a0a0a 70%)`,
            }}
          >
            <span
              className="text-[54px] font-bold tracking-tight opacity-60"
              style={{ color: colour }}
            >
              {initials}
            </span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black via-black/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-3.5">
          <h3 className="text-[16px] font-semibold tracking-tight text-white leading-tight">
            {biz.name}
          </h3>
          <p className="mt-0.5 text-[13px] text-white/60 leading-tight">
            {biz.category}
          </p>
          <div className="mt-2 flex items-center gap-1.5">
            <Star
              className="w-[13px] h-[13px]"
              strokeWidth={0}
              style={{ fill: colour, color: colour }}
            />
            <span className="text-[13px] font-medium text-white/80">
              {(biz.rating ?? 5).toFixed(1)}
            </span>
            <span className="text-white/30 text-[13px]">·</span>
            <span className="text-[13px] font-medium text-white/80">
              {priceLabel(biz.price_tier)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function NearbyRow({ biz }: { biz: Business }) {
  const colour = getTileColour(biz.primary_colour).mid;
  return (
    <Link
      href={`/business/${biz.slug}`}
      className="
        flex items-center gap-3 p-2.5 rounded-2xl
        bg-white/[0.03] border border-white/[0.06]
        active:scale-[0.99] transition
      "
    >
      <div className="relative w-[72px] h-[72px] rounded-xl overflow-hidden shrink-0 bg-white/5">
        {biz.cover_image_url ? (
          <Image
            src={biz.cover_image_url}
            alt={biz.name}
            fill
            sizes="72px"
            className="object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-xl font-bold"
            style={{ backgroundColor: `${colour}33`, color: colour }}
          >
            {biz.name[0]}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-[15px] font-semibold tracking-tight text-white truncate">
          {biz.name}
        </h3>
        <div className="mt-1.5">
          <span className="inline-flex items-center h-[22px] px-2 rounded-md text-[11px] font-medium text-white/80 bg-white/[0.06] border border-white/[0.08]">
            {biz.category}
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          <Star
            className="w-[12px] h-[12px]"
            strokeWidth={0}
            style={{ fill: colour, color: colour }}
          />
          <span className="text-[12px] font-medium text-white/75">
            {(biz.rating ?? 5).toFixed(1)}
          </span>
          <span className="text-white/25 text-[12px]">·</span>
          <span className="text-[12px] font-medium text-white/75">
            {priceLabel(biz.price_tier)}
          </span>
        </div>
      </div>
      <div className="text-[12px] text-white/40 pr-2">{biz.city ?? ''}</div>
    </Link>
  );
}
