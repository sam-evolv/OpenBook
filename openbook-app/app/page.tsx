'use client'

import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import WallpaperBackground from '@/components/WallpaperBackground'
import LiquidGlassIcon from '@/components/LiquidGlassIcon'
import GlassDock from '@/components/GlassDock'

/* ─── Mock data ─────────────────────────────────────────────────────── */

interface MockBusiness {
  id: string
  name: string
  initials: string
  primaryColour: string
  secondaryColour?: string
  isFavourite: boolean
  badgeCount?: number
  slug: string
}

const MOCK_BUSINESSES: MockBusiness[] = [
  {
    id: '1',
    name: 'Evolv Performance',
    initials: 'EP',
    primaryColour: '#D4AF37',
    isFavourite: true,
    slug: 'evolv-performance',
  },
  {
    id: '2',
    name: 'Saltwater Sauna',
    initials: 'SW',
    primaryColour: '#a78bfa',
    isFavourite: true,
    badgeCount: 2,
    slug: 'saltwater-sauna',
  },
  {
    id: '3',
    name: 'Nail Studio',
    initials: 'NS',
    primaryColour: '#f472b6',
    isFavourite: true,
    slug: 'nail-studio',
  },
  {
    id: '4',
    name: 'Refresh Barber',
    initials: 'RB',
    primaryColour: '#34d399',
    isFavourite: true,
    slug: 'refresh-barber',
  },
  {
    id: '5',
    name: 'Cork Physio',
    initials: 'CP',
    primaryColour: '#60a5fa',
    isFavourite: false,
    slug: 'cork-physio',
  },
  {
    id: '6',
    name: 'Yoga Flow',
    initials: 'YF',
    primaryColour: '#fb923c',
    isFavourite: false,
    slug: 'yoga-flow',
  },
  {
    id: '7',
    name: 'Iron Gym',
    initials: 'IG',
    primaryColour: 'rgba(255,255,255,0.7)',
    isFavourite: false,
    badgeCount: 1,
    slug: 'iron-gym',
  },
]

const favourites = MOCK_BUSINESSES.filter((b) => b.isFavourite)
const myPlaces = MOCK_BUSINESSES.filter((b) => !b.isFavourite)

/* ─── Explore icon (last slot in "My places") ───────────────────────── */
function ExploreIcon() {
  return (
    <a
      href="/explore"
      className="flex flex-col items-center gap-1.5 select-none"
    >
      <div
        style={{
          width: 68,
          height: 68,
          borderRadius: 18,
          background: 'rgba(255,255,255,0.07)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1.5px dashed rgba(255,255,255,0.22)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        className="active:scale-[0.84] transition-transform duration-150"
      >
        <Search size={24} color="rgba(255,255,255,0.5)" strokeWidth={2} />
      </div>
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: 'rgba(255,255,255,0.5)',
          textShadow: '0 1px 4px rgba(0,0,0,0.7)',
        }}
      >
        Explore
      </span>
    </a>
  )
}

/* ─── Home screen ───────────────────────────────────────────────────── */
export default function HomePage() {
  const router = useRouter()

  return (
    <WallpaperBackground className="relative flex flex-col" fixed>
      {/* Safe-area status bar gap */}
      <div style={{ height: 56 }} className="pt-safe flex-shrink-0" />

      {/* ── Top bar ── */}
      <div
        className="flex items-center justify-between flex-shrink-0"
        style={{ paddingInline: 24, marginBottom: 24 }}
      >
        {/* Wordmark */}
        <h1
          style={{
            fontSize: 28,
            fontWeight: 900,
            color: 'white',
            letterSpacing: '-0.02em',
            lineHeight: 1,
            margin: 0,
          }}
        >
          Open
          <span style={{ color: '#D4AF37' }}>Book</span>{' '}
          <span style={{ color: '#D4AF37' }}>AI</span>
        </h1>

        {/* Search button */}
        <a
          href="/explore"
          aria-label="Search businesses"
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            background: 'rgba(255,255,255,0.11)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.26)',
            boxShadow: `
              inset 0 1.5px 0 rgba(255,255,255,0.38),
              inset 0 -1px 0 rgba(0,0,0,0.18),
              0 4px 24px rgba(0,0,0,0.45)
            `,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
          className="active:scale-[0.84] transition-transform duration-150"
        >
          <Search size={16} color="rgba(255,255,255,0.8)" strokeWidth={2.5} />
        </a>
      </div>

      {/* ── Scrollable icon grid ── */}
      <div
        className="flex-1 overflow-y-auto scrollbar-none"
        style={{ paddingInline: 20, paddingBottom: 120 }}
      >
        {/* Favourites section */}
        {favourites.length > 0 && (
          <>
            <p className="section-label" style={{ marginBottom: 16 }}>
              Favourites
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '20px 8px',
                marginBottom: 32,
              }}
            >
              {favourites.map((biz) => (
                <LiquidGlassIcon
                  key={biz.id}
                  initials={biz.initials}
                  primaryColour={biz.primaryColour}
                  secondaryColour={biz.secondaryColour}
                  label={biz.name.split(' ')[0]}
                  isFavourite={biz.isFavourite}
                  badgeCount={biz.badgeCount}
                  onClick={() => router.push(`/business/${biz.slug}`)}
                />
              ))}
            </div>
          </>
        )}

        {/* My places section */}
        {myPlaces.length > 0 && (
          <>
            <p className="section-label" style={{ marginBottom: 16 }}>
              My places
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '20px 8px',
                marginBottom: 32,
              }}
            >
              {myPlaces.map((biz) => (
                <LiquidGlassIcon
                  key={biz.id}
                  initials={biz.initials}
                  primaryColour={biz.primaryColour}
                  secondaryColour={biz.secondaryColour}
                  label={biz.name.split(' ')[0]}
                  isFavourite={biz.isFavourite}
                  badgeCount={biz.badgeCount}
                  onClick={() => router.push(`/business/${biz.slug}`)}
                />
              ))}
              {/* Explore slot */}
              <ExploreIcon />
            </div>
          </>
        )}

        {/* Add a place row */}
        <a
          href="/explore"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 16px',
            borderRadius: 14,
            border: '1.5px dashed rgba(255,255,255,0.18)',
            background: 'rgba(255,255,255,0.04)',
            textDecoration: 'none',
            marginBottom: 8,
          }}
          className="active:opacity-70 transition-opacity duration-150"
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              border: '1.5px dashed rgba(255,255,255,0.28)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: 20,
                fontWeight: 300,
                color: 'rgba(255,255,255,0.4)',
                lineHeight: 1,
              }}
            >
              +
            </span>
          </div>
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            Add a place
          </span>
        </a>
      </div>

      {/* ── Glass Dock ── */}
      <GlassDock />
    </WallpaperBackground>
  )
}
