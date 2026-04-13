'use client'

import { useRouter } from 'next/navigation'
import { Search, MapPin } from 'lucide-react'
import WallpaperBackground from '@/components/consumer/WallpaperBackground'
import GlassDock from '@/components/consumer/GlassDock'
import LiquidGlassIcon from '@/components/consumer/LiquidGlassIcon'
import { MOCK_BUSINESSES } from '@/lib/mock-businesses'

export default function HomePage() {
  const router = useRouter()

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
      </div>

      <GlassDock />
    </WallpaperBackground>
  )
}
