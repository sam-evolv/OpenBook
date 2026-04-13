'use client'

import { useRouter } from 'next/navigation'
<<<<<<< Updated upstream
import { Search, MapPin } from 'lucide-react'
import WallpaperBackground from '@/components/consumer/WallpaperBackground'
import GlassDock from '@/components/consumer/GlassDock'
import LiquidGlassIcon from '@/components/consumer/LiquidGlassIcon'
import { MOCK_BUSINESSES } from '@/lib/mock-businesses'
=======
import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import WallpaperBackground from '@/components/consumer/WallpaperBackground'
import GlassDock from '@/components/consumer/GlassDock'
import LiquidGlassIcon from '@/components/consumer/LiquidGlassIcon'
import { createClient } from '@/lib/supabase/client'

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
>>>>>>> Stashed changes

interface LiveBusiness {
  slug: string
  name: string
  category: string
  primary_colour: string | null
  hero_image_url: string | null
}

export default function HomePage() {
  const router = useRouter()
  const [liveBusinesses, setLiveBusinesses] = useState<LiveBusiness[]>([])

  /* ── Fetch up to 4 live businesses ── */
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('businesses')
          .select('slug, name, category, primary_colour, hero_image_url')
          .eq('is_live', true)
          .order('name')
          .limit(4)
        if (!cancelled && data && data.length > 0) {
          setLiveBusinesses(data)
        }
      } catch {
        // silently skip — section won't show
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <WallpaperBackground>
      <div className="min-h-screen pb-32">

        {/* ── Sticky header ── */}
        <div
          className="sticky top-0 z-20 px-5 pt-12 pb-5"
          style={{
            background:           'rgba(8,8,8,0.78)',
            backdropFilter:       'blur(22px)',
            WebkitBackdropFilter: 'blur(22px)',
            borderBottom:         '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <h1
              style={{
                fontSize:      22,
                fontWeight:    900,
                color:         '#fff',
                letterSpacing: '-0.02em',
                margin:        0,
              }}
            >
              Good morning
            </h1>
            <button
              onClick={() => router.push('/explore')}
              className="active:scale-90 transition-transform duration-150"
              style={{
                width:          34,
                height:         34,
                borderRadius:   10,
                background:     'rgba(255,255,255,0.08)',
                border:         '1px solid rgba(255,255,255,0.12)',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
              }}
            >
              <Search size={15} color="rgba(255,255,255,0.55)" />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <MapPin size={12} color="#D4AF37" />
            <span
              style={{
                fontSize:      13,
                color:         '#D4AF37',
                fontWeight:    600,
                letterSpacing: '-0.01em',
              }}
            >
              Cork, Ireland
            </span>
          </div>
        </div>

        {/* ── Business icon grid ── */}
        <div className="px-5 pt-7">
          <p className="section-label mb-4">Nearby</p>

          <div className="grid grid-cols-4 gap-x-3 gap-y-5">
            {MOCK_BUSINESSES.map((b) => (
              <button
                key={b.slug}
                onClick={() => router.push(`/business/${b.slug}`)}
                className="flex flex-col items-center gap-2 active:scale-95 transition-transform duration-150"
              >
                <LiquidGlassIcon
                  img={b.img}
                  name={b.name}
                  initials={b.initials}
                  primaryColour={b.primaryColour}
                />
                <span className="icon-label w-full truncate">{b.name.split(' ').slice(0, 2).join(' ')}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Explore CTA ── */}
        <div className="px-5 mt-8">
          <button
            onClick={() => router.push('/explore')}
            className="active:scale-[0.98] transition-transform duration-150"
            style={{
              width:                '100%',
              height:               50,
              borderRadius:         14,
              background:           'rgba(255,255,255,0.07)',
              backdropFilter:       'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border:               '1px solid rgba(255,255,255,0.11)',
              display:              'flex',
              alignItems:           'center',
              justifyContent:       'center',
              gap:                  8,
              color:                'rgba(255,255,255,0.62)',
              fontSize:             14,
              fontWeight:           600,
              cursor:               'pointer',
            }}
          >
            <Search size={15} color="rgba(255,255,255,0.55)" />
            Explore all nearby
          </button>
        </div>
<<<<<<< Updated upstream
=======

        {/* ── Explore businesses — live from Supabase ── */}
        {liveBusinesses.length > 0 && (
          <div className="px-5 pt-8">
            <div className="flex items-center justify-between mb-4">
              <p
                style={{
                  fontSize:      12,
                  fontWeight:    700,
                  color:         'rgba(255,255,255,0.45)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  margin:        0,
                }}
              >
                Explore businesses
              </p>
              <button
                onClick={() => router.push('/explore')}
                style={{
                  fontSize:   12,
                  fontWeight: 600,
                  color:      '#D4AF37',
                  background: 'none',
                  border:     'none',
                  cursor:     'pointer',
                  padding:    0,
                }}
              >
                See all
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {liveBusinesses.map((b) => {
                const colour   = b.primary_colour ?? '#D4AF37'
                const initials = b.name.split(' ').map((w) => w[0]?.toUpperCase() ?? '').slice(0, 2).join('')
                return (
                  <button
                    key={b.slug}
                    onClick={() => router.push(`/business/${b.slug}`)}
                    className="text-left active:scale-[0.98] transition-transform duration-150 w-full"
                    style={{
                      background:           'rgba(255,255,255,0.06)',
                      backdropFilter:       'blur(14px)',
                      WebkitBackdropFilter: 'blur(14px)',
                      border:               '1px solid rgba(255,255,255,0.1)',
                      borderRadius:         12,
                      padding:              '12px 14px',
                      display:              'flex',
                      alignItems:           'center',
                      gap:                  12,
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width:          42,
                        height:         42,
                        borderRadius:   12,
                        background:     colour + '22',
                        border:         `1px solid ${colour}44`,
                        display:        'flex',
                        alignItems:     'center',
                        justifyContent: 'center',
                        flexShrink:     0,
                        overflow:       'hidden',
                      }}
                    >
                      {b.hero_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={b.hero_image_url}
                          alt={b.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <span style={{ fontSize: 14, fontWeight: 800, color: colour }}>
                          {initials}
                        </span>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {b.name}
                      </p>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', margin: '1px 0 0' }}>
                        {b.category}
                      </p>
                    </div>

                    <div
                      style={{
                        flexShrink:   0,
                        height:       28,
                        paddingLeft:  12,
                        paddingRight: 12,
                        borderRadius: 8,
                        background:   colour + '22',
                        border:       `1px solid ${colour}44`,
                        display:      'flex',
                        alignItems:   'center',
                        fontSize:     12,
                        fontWeight:   700,
                        color:        colour,
                      }}
                    >
                      Book
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        </div>{/* end max-w-[390px] */}
>>>>>>> Stashed changes
      </div>

      <GlassDock />
    </WallpaperBackground>
  )
}
