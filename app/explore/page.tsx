'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Search, Star } from 'lucide-react'
import WallpaperBackground from '@/components/consumer/WallpaperBackground'
import GlassDock from '@/components/consumer/GlassDock'
import { MOCK_BUSINESSES, MockBusiness } from '@/lib/mock-businesses'

const CATEGORIES = ['All', 'Gym', 'Sauna', 'Salon', 'Barber', 'Massage', 'Physio', 'Yoga', 'Tattoo']

// Businesses 0-3 shown in trending grid; 4-6 in all-nearby list (by default)
const TRENDING_POOL = MOCK_BUSINESSES.slice(0, 4)
const NEARBY_POOL = MOCK_BUSINESSES.slice(4)

function matchesCategory(b: MockBusiness, category: string): boolean {
  if (category === 'All') return true
  const lc = category.toLowerCase()
  return (
    b.categories.some((c) => c.toLowerCase() === lc) ||
    b.type.toLowerCase().includes(lc)
  )
}

export default function ExplorePage() {
  const router = useRouter()
  const [activeCategory, setActiveCategory] = useState('All')

  const filteredTrending = useMemo(
    () => TRENDING_POOL.filter((b) => matchesCategory(b, activeCategory)),
    [activeCategory]
  )

  const filteredNearby = useMemo(
    () => NEARBY_POOL.filter((b) => matchesCategory(b, activeCategory)),
    [activeCategory]
  )

  const noResults = filteredTrending.length === 0 && filteredNearby.length === 0

  return (
    <WallpaperBackground>
      {/* ── Sticky header ── */}
      <div
        className="sticky top-0 z-20"
        style={{
          background: 'rgba(8,8,8,0.84)',
          backdropFilter: 'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div className="px-5 pt-12 pb-0">
          {/* Back + title row */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.back()}
              className="active:scale-90 transition-transform duration-150"
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: 'rgba(255,255,255,0.09)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.14)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ChevronLeft size={16} color="white" />
            </button>

            <h1
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: '#fff',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Explore{' '}
              <span style={{ color: '#D4AF37' }}>Cork</span>
            </h1>
          </div>

          {/* Search bar */}
          <div
            style={{
              height: 42,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.07)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.11)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              paddingLeft: 14,
              marginBottom: 14,
            }}
          >
            <Search size={15} color="rgba(255,255,255,0.38)" />
            <span
              style={{
                fontSize: 14,
                color: 'rgba(255,255,255,0.32)',
                fontWeight: 500,
              }}
            >
              Gyms, salons, sauna...
            </span>
          </div>

          {/* Category chips */}
          <div
            className="flex gap-2 overflow-x-auto scrollbar-none pb-4"
          >
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="active:scale-95 transition-transform duration-100"
                  style={{
                    flexShrink: 0,
                    height: 30,
                    paddingLeft: 13,
                    paddingRight: 13,
                    borderRadius: 20,
                    background: isActive ? '#D4AF37' : 'rgba(255,255,255,0.08)',
                    backdropFilter: isActive ? undefined : 'blur(10px)',
                    WebkitBackdropFilter: isActive ? undefined : 'blur(10px)',
                    border: isActive ? 'none' : '1px solid rgba(255,255,255,0.13)',
                    color: isActive ? '#000' : 'rgba(255,255,255,0.55)',
                    fontSize: 12,
                    fontWeight: isActive ? 700 : 500,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                  }}
                >
                  {cat}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-4 pt-5 pb-32">

        {/* Trending near you */}
        {filteredTrending.length > 0 && (
          <section className="mb-6">
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.42)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: 12,
              }}
            >
              Trending near you
            </p>
            <div className="grid grid-cols-2 gap-3">
              {filteredTrending.map((b) => (
                <button
                  key={b.slug}
                  onClick={() => router.push(`/business/${b.slug}`)}
                  className="text-left active:scale-95 transition-transform duration-150"
                  style={{
                    borderRadius: 16,
                    overflow: 'hidden',
                    background: 'rgba(255,255,255,0.06)',
                    backdropFilter: 'blur(14px)',
                    WebkitBackdropFilter: 'blur(14px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  {/* Hero image */}
                  <div style={{ height: 90, position: 'relative', overflow: 'hidden' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={b.img}
                      alt={b.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, transparent 60%)',
                      }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 7,
                        left: 9,
                        fontSize: 13,
                        fontWeight: 800,
                        color: '#fff',
                        lineHeight: 1.2,
                      }}
                    >
                      {b.name}
                    </span>
                  </div>

                  {/* Body */}
                  <div style={{ padding: '9px 10px 11px' }}>
                    <p
                      style={{
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.38)',
                        margin: '0 0 5px',
                      }}
                    >
                      {b.type}
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#fff',
                      }}
                    >
                      <Star size={10} fill={b.primaryColour} color={b.primaryColour} />
                      <span>{b.rating} · {b.priceRange}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* All nearby */}
        {filteredNearby.length > 0 && (
          <section>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.42)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: 12,
              }}
            >
              All nearby
            </p>
            <div className="flex flex-col gap-3">
              {filteredNearby.map((b) => (
                <button
                  key={b.slug}
                  onClick={() => router.push(`/business/${b.slug}`)}
                  className="text-left active:scale-[0.98] transition-transform duration-150"
                  style={{
                    borderRadius: 14,
                    overflow: 'hidden',
                    background: 'rgba(255,255,255,0.06)',
                    backdropFilter: 'blur(14px)',
                    WebkitBackdropFilter: 'blur(14px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    flexDirection: 'row',
                  }}
                >
                  {/* Left image */}
                  <div style={{ width: 70, height: 70, flexShrink: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={b.img}
                      alt={b.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  </div>

                  {/* Body */}
                  <div
                    style={{
                      flex: 1,
                      padding: '9px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      gap: 4,
                      minWidth: 0,
                    }}
                  >
                    <p
                      style={{
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: '#fff',
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {b.name}
                    </p>

                    <div className="flex gap-1.5 flex-wrap">
                      {b.categories.slice(0, 3).map((cat) => (
                        <span
                          key={cat}
                          style={{
                            fontSize: 10,
                            color: 'rgba(255,255,255,0.58)',
                            background: 'rgba(255,255,255,0.09)',
                            border: '1px solid rgba(255,255,255,0.13)',
                            borderRadius: 6,
                            padding: '1px 6px',
                          }}
                        >
                          {cat}
                        </span>
                      ))}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#fff',
                      }}
                    >
                      <Star size={9} fill={b.primaryColour} color={b.primaryColour} />
                      <span>{b.rating} · {b.priceRange}</span>
                    </div>
                  </div>

                  {/* Distance */}
                  <div
                    style={{
                      padding: '0 12px 0 0',
                      display: 'flex',
                      alignItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {b.distance && (
                      <span
                        style={{
                          fontSize: 11,
                          color: 'rgba(255,255,255,0.32)',
                          fontWeight: 500,
                        }}
                      >
                        {b.distance}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {noResults && (
          <div
            style={{
              textAlign: 'center',
              paddingTop: 60,
              color: 'rgba(255,255,255,0.35)',
              fontSize: 14,
            }}
          >
            <p style={{ fontSize: 28, marginBottom: 10 }}>🔍</p>
            <p>No businesses found for <strong style={{ color: 'rgba(255,255,255,0.6)' }}>{activeCategory}</strong></p>
          </div>
        )}
      </div>

      <GlassDock activeTab="home" />
    </WallpaperBackground>
  )
}
