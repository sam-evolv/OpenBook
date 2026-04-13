'use client'

import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import WallpaperBackground from '@/components/consumer/WallpaperBackground'
import GlassDock from '@/components/consumer/GlassDock'
import LiquidGlassIcon from '@/components/consumer/LiquidGlassIcon'

/* ── Static home-screen data ── */
const FAVOURITES = [
  { initials: 'EP', primaryColour: '#D4AF37', label: 'Evolv',      isFavourite: true,  badge: undefined, href: '/business/evolv-performance'  },
  { initials: 'SW', primaryColour: '#a78bfa', label: 'Saltwater',  isFavourite: true,  badge: 2,         href: '/business/saltwater-sauna'      },
  { initials: 'NS', primaryColour: '#f472b6', label: 'Nail Studio', isFavourite: true, badge: undefined, href: '/business/the-nail-studio'       },
  { initials: 'RB', primaryColour: '#34d399', label: 'Refresh',    isFavourite: true,  badge: undefined, href: '/business/refresh-barber'        },
]

const MY_PLACES = [
  { initials: 'CP', primaryColour: '#60a5fa', label: 'Cork Physio',  isFavourite: false, badge: undefined, href: '/business/cork-physio'     },
  { initials: 'YF', primaryColour: '#fb923c', label: 'Yoga Flow',    isFavourite: false, badge: undefined, href: '/business/yoga-flow-cork'  },
  { initials: 'IG', primaryColour: 'rgba(255,255,255,0.7)', label: 'Iron Gym', isFavourite: false, badge: 1, href: '/business/iron-gym-cork' },
]

const RECENTLY_VIEWED = [
  {
    slug:     'evolv-performance',
    name:     'Evolv Performance',
    category: 'PT & Wellness',
    img:      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80',
  },
  {
    slug:     'saltwater-sauna',
    name:     'Saltwater Sauna',
    category: 'Sauna & Recovery',
    img:      'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=400&q=80',
  },
  {
    slug:     'refresh-barber',
    name:     'Refresh Barber',
    category: 'Barber',
    img:      'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&q=80',
  },
]

export default function HomePage() {
  const router = useRouter()

  return (
    <WallpaperBackground>
      <div className="min-h-screen pb-32" style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Header: wordmark + search ── */}
        <div
          className="sticky top-0 z-20 px-5 pt-12 pb-4"
          style={{
            background:           'rgba(5,5,26,0.55)',
            backdropFilter:       'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom:         '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex items-center justify-between">
            <span
              style={{
                fontSize:      22,
                fontWeight:    900,
                color:         '#fff',
                letterSpacing: '-0.03em',
                lineHeight:    1,
              }}
            >
              OpenBook
              <span style={{ color: '#D4AF37', marginLeft: 4 }}>AI</span>
            </span>

            <button
              onClick={() => router.push('/explore')}
              className="active:scale-90 transition-transform duration-150"
              style={{
                width:          36,
                height:         36,
                borderRadius:   12,
                background:     'rgba(255,255,255,0.08)',
                border:         '1px solid rgba(255,255,255,0.13)',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                cursor:         'pointer',
              }}
            >
              <Search size={16} color="rgba(255,255,255,0.60)" />
            </button>
          </div>
        </div>

        {/* ── Icon sections — capped at iPhone width ── */}
        <div className="max-w-[390px] mx-auto">

        {/* ── Favourites section ── */}
        <div className="px-5" style={{ paddingTop: 20 }}>
          <p
            style={{
              fontSize:      12,
              fontWeight:    700,
              color:         'rgba(255,255,255,0.45)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom:  16,
            }}
          >
            Favourites
          </p>

          <div
            style={{
              display:             'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap:                 '20px 8px',
            }}
          >
            {FAVOURITES.map((item) => (
              <div key={item.initials} className="flex justify-center">
                <LiquidGlassIcon
                  initials={item.initials}
                  primaryColour={item.primaryColour}
                  label={item.label}
                  isFavourite={item.isFavourite}
                  badge={item.badge}
                  onClick={() => router.push(item.href)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── My places section ── */}
        <div className="px-5 pt-8">
          <p
            style={{
              fontSize:      12,
              fontWeight:    700,
              color:         'rgba(255,255,255,0.45)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom:  16,
            }}
          >
            My places
          </p>

          <div
            style={{
              display:             'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap:                 '20px 8px',
            }}
          >
            {MY_PLACES.map((item) => (
              <div key={item.initials} className="flex justify-center">
                <LiquidGlassIcon
                  initials={item.initials}
                  primaryColour={item.primaryColour}
                  label={item.label}
                  isFavourite={item.isFavourite}
                  badge={item.badge}
                  onClick={() => router.push(item.href)}
                />
              </div>
            ))}

            {/* Explore slot — clear glass with search icon */}
            <div className="flex justify-center">
              <button
                onClick={() => router.push('/explore')}
                className="flex flex-col items-center active:scale-90 transition-transform duration-150"
                style={{ gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <div
                  style={{
                    width:                68,
                    height:               68,
                    borderRadius:         18,
                    position:             'relative',
                    overflow:             'hidden',
                    flexShrink:           0,
                    backdropFilter:       'blur(22px)',
                    WebkitBackdropFilter: 'blur(22px)',
                    border:               '1.5px dashed rgba(255,255,255,0.28)',
                    boxShadow:            '0 8px 28px rgba(0,0,0,0.25)',
                    display:              'flex',
                    alignItems:           'center',
                    justifyContent:       'center',
                  }}
                >
                  <div
                    style={{
                      position:   'absolute',
                      inset:      0,
                      background: 'rgba(255,255,255,0.04)',
                    }}
                  />
                  <Search
                    size={22}
                    style={{
                      color:    'rgba(255,255,255,0.50)',
                      position: 'relative',
                      zIndex:   1,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize:      11,
                    fontWeight:    500,
                    color:         'rgba(255,255,255,0.50)',
                    letterSpacing: '-0.01em',
                    whiteSpace:    'nowrap',
                  }}
                >
                  Explore
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Recently viewed section ── */}
        <div className="pt-8">
          <p
            style={{
              fontSize:      12,
              fontWeight:    700,
              color:         'rgba(255,255,255,0.45)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom:  12,
              paddingLeft:   20,
            }}
          >
            Recently viewed
          </p>

          <div
            className="flex gap-3 overflow-x-auto scrollbar-none"
            style={{ paddingLeft: 20, paddingRight: 20 }}
          >
            {RECENTLY_VIEWED.map((item) => (
              <button
                key={item.slug}
                onClick={() => router.push(`/business/${item.slug}`)}
                className="active:scale-95 transition-transform duration-150"
                style={{
                  flexShrink:   0,
                  width:        160,
                  height:       90,
                  borderRadius: 14,
                  overflow:     'hidden',
                  position:     'relative',
                  border:       'none',
                  cursor:       'pointer',
                  padding:      0,
                }}
              >
                {/* Hero image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.img}
                  alt={item.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />

                {/* Gradient overlay */}
                <div
                  style={{
                    position:   'absolute',
                    inset:      0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 55%)',
                  }}
                />

                {/* Business name */}
                <span
                  style={{
                    position:   'absolute',
                    bottom:     8,
                    left:       10,
                    right:      10,
                    fontSize:   12,
                    fontWeight: 700,
                    color:      '#fff',
                    lineHeight: 1.2,
                    textAlign:  'left',
                  }}
                >
                  {item.name}
                </span>

                {/* Category chip */}
                <div
                  style={{
                    position:             'absolute',
                    top:                  8,
                    left:                 8,
                    height:               18,
                    paddingLeft:          7,
                    paddingRight:         7,
                    borderRadius:         20,
                    background:           'rgba(255,255,255,0.18)',
                    backdropFilter:       'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border:               '1px solid rgba(255,255,255,0.25)',
                    display:              'flex',
                    alignItems:           'center',
                  }}
                >
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#fff' }}>
                    {item.category}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Add a place row ── */}
        <div className="px-5 mt-8">
          <button
            className="active:scale-[0.98] transition-transform duration-150"
            style={{
              width:                '100%',
              height:               48,
              borderRadius:         14,
              background:           'transparent',
              backdropFilter:       'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border:               '1.5px dashed rgba(255,255,255,0.18)',
              display:              'flex',
              alignItems:           'center',
              justifyContent:       'center',
              gap:                  8,
              cursor:               'pointer',
            }}
          >
            <span
              style={{
                fontSize:   20,
                lineHeight: 1,
                color:      'rgba(255,255,255,0.35)',
                fontWeight: 300,
              }}
            >
              +
            </span>
            <span
              style={{
                fontSize:      14,
                fontWeight:    600,
                color:         'rgba(255,255,255,0.35)',
                letterSpacing: '-0.01em',
              }}
            >
              Add a place
            </span>
          </button>
        </div>

        </div>{/* end max-w-[390px] */}
      </div>

      <GlassDock />
    </WallpaperBackground>
  )
}
