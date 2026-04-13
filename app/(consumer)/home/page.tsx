'use client'

import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import WallpaperBackground from '@/components/consumer/WallpaperBackground'
import GlassDock from '@/components/consumer/GlassDock'
import LiquidGlassIcon from '@/components/consumer/LiquidGlassIcon'
import { createClient } from '@/lib/supabase/client'

/* ── Static home-screen data ── */
const FAVOURITES = [
  { initials: 'EP', primaryColour: '#D4AF37', label: 'Evolv',       isFavourite: true,  badge: undefined, href: '/business/evolv-performance' },
  { initials: 'SW', primaryColour: '#a78bfa', label: 'Saltwater',   isFavourite: true,  badge: 2,         href: '/business/saltwater-sauna'    },
  { initials: 'NS', primaryColour: '#f472b6', label: 'Nail Studio', isFavourite: true,  badge: undefined, href: '/business/the-nail-studio'    },
  { initials: 'RB', primaryColour: '#34d399', label: 'Refresh',     isFavourite: true,  badge: undefined, href: '/business/refresh-barber'     },
]

const MY_PLACES = [
  { initials: 'CP', primaryColour: '#60a5fa', label: 'Cork Physio', isFavourite: false, badge: undefined, href: '/business/cork-physio'    },
  { initials: 'YF', primaryColour: '#fb923c', label: 'Yoga Flow',   isFavourite: false, badge: undefined, href: '/business/yoga-flow-cork' },
  { initials: 'IG', primaryColour: 'rgba(255,255,255,0.7)', label: 'Iron Gym', isFavourite: false, badge: 1, href: '/business/iron-gym-cork' },
]

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
        // silently skip
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <WallpaperBackground>
      <div className="min-h-screen pb-32" style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Header ── */}
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
            <span style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>
              OpenBook<span style={{ color: '#D4AF37', marginLeft: 4 }}>AI</span>
            </span>
            <button
              onClick={() => router.push('/explore')}
              className="active:scale-90 transition-transform duration-150"
              style={{
                width: 36, height: 36, borderRadius: 12,
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.13)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
            >
              <Search size={16} color="rgba(255,255,255,0.60)" />
            </button>
          </div>
        </div>

        <div className="max-w-[390px] mx-auto">

          {/* ── Favourites ── */}
          <div className="px-5 pt-8">
            <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
              Favourites
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px 8px' }}>
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

          {/* ── My places ── */}
          <div className="px-5 pt-8">
            <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
              My places
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px 8px' }}>
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
              {/* Explore slot */}
              <div className="flex justify-center">
                <button
                  onClick={() => router.push('/explore')}
                  className="flex flex-col items-center active:scale-90 transition-transform duration-150"
                  style={{ gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <div
                    style={{
                      width: 68, height: 68, borderRadius: 18,
                      backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
                      border: '1.5px dashed rgba(255,255,255,0.28)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      position: 'relative', overflow: 'hidden',
                    }}
                  >
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.04)' }} />
                    <Search size={22} style={{ color: 'rgba(255,255,255,0.50)', position: 'relative', zIndex: 1 }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.50)', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                    Explore
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* ── Add a place ── */}
          <div className="px-5 mt-8">
            <button
              className="active:scale-[0.98] transition-transform duration-150"
              style={{
                width: '100%', height: 48, borderRadius: 14,
                background: 'transparent', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                border: '1.5px dashed rgba(255,255,255,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 20, lineHeight: 1, color: 'rgba(255,255,255,0.35)', fontWeight: 300 }}>+</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '-0.01em' }}>Add a place</span>
            </button>
          </div>

          {/* ── Explore businesses — live from Supabase ── */}
          {liveBusinesses.length > 0 && (
            <div className="px-5 pt-8">
              <div className="flex items-center justify-between mb-4">
                <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
                  Explore businesses
                </p>
                <button
                  onClick={() => router.push('/explore')}
                  style={{ fontSize: 12, fontWeight: 600, color: '#D4AF37', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
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
                        background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
                        padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 42, height: 42, borderRadius: 12,
                          background: colour + '22', border: `1px solid ${colour}44`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, overflow: 'hidden',
                        }}
                      >
                        {b.hero_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={b.hero_image_url} alt={b.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: 14, fontWeight: 800, color: colour }}>{initials}</span>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</p>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', margin: '1px 0 0' }}>{b.category}</p>
                      </div>
                      <div
                        style={{
                          flexShrink: 0, height: 28, paddingLeft: 12, paddingRight: 12,
                          borderRadius: 8, background: colour + '22', border: `1px solid ${colour}44`,
                          display: 'flex', alignItems: 'center', fontSize: 12, fontWeight: 700, color: colour,
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

        </div>
      </div>

      <GlassDock />
    </WallpaperBackground>
  )
}
