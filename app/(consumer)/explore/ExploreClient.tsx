'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { ChevronLeft, Search, Star } from 'lucide-react';
import type { Business } from '@/lib/supabase';

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

  // First 4 featured in grid; rest in "All Nearby"
  const featured = filtered.slice(0, 4);
  const nearby = filtered.slice(4);

  return (
    <div className="pb-32">
      {/* Title row */}
      <div className="px-5 pt-4 pb-4">
        <div className="flex items-center gap-3">
          <button
            className="
              w-9 h-9 rounded-xl flex items-center justify-center
              bg-white/[0.04] border border-white/[0.06]
              active:scale-95 transition
            "
            aria-label="Back"
          >
            <ChevronLeft className="w-[18px] h-[18px] text-white" strokeWidth={2.2} />
          </button>
          <h1 className="text-[28px] font-bold tracking-tight leading-none">
            Explore <span className="text-[#D4AF37]">Cork</span>
          </h1>
        </div>
      </div>

      {/* Search */}
      <div className="px-5">
        <div
          className="
            flex items-center gap-3 h-12 px-4 rounded-2xl
            bg-white/[0.04] border border-white/[0.06]
            focus-within:border-white/[0.12] transition
          "
        >
          <Search className="w-4 h-4 text-white/40" strokeWidth={2.2} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Gyms, salons, sauna..."
            className="
              flex-1 bg-transparent outline-none text-[15px]
              placeholder:text-white/35 text-white
            "
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
                  shrink-0 h-9 px-4 rounded-full text-[14px] font-medium
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

      {/* Featured grid */}
      <div className="mt-5 px-5">
        <div className="grid grid-cols-2 gap-3">
          {featured.map((biz) => (
            <FeaturedCard key={biz.id} biz={biz} />
          ))}
        </div>
      </div>

      {/* All nearby */}
      {nearby.length > 0 && (
        <div className="mt-8 px-5">
          <h2 className="text-[11px] font-semibold tracking-[0.14em] text-white/35 mb-3">
            ALL NEARBY
          </h2>
          <div className="flex flex-col gap-3">
            {nearby.map((biz) => (
              <NearbyRow key={biz.id} biz={biz} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="px-5 mt-16 text-center">
          <p className="text-white/50 text-[15px]">
            No businesses match your search.
          </p>
        </div>
      )}
    </div>
  );
}

/* ---------- Featured card (2-column) ---------- */
function FeaturedCard({ biz }: { biz: Business }) {
  const colour = biz.primary_colour || '#D4AF37';
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
        group relative block rounded-2xl overflow-hidden
        bg-white/[0.03] border border-white/[0.06]
        active:scale-[0.98] transition-transform duration-150
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
        {/* gradient overlay for text legibility */}
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
              {(biz.rating ?? 5.0).toFixed(1)}
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

/* ---------- Nearby row (full-width horizontal) ---------- */
function NearbyRow({ biz }: { biz: Business }) {
  const colour = biz.primary_colour || '#D4AF37';

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
          <span
            className="
              inline-flex items-center h-[22px] px-2 rounded-md
              text-[11px] font-medium text-white/80
              bg-white/[0.06] border border-white/[0.08]
            "
          >
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
            {(biz.rating ?? 5.0).toFixed(1)}
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
