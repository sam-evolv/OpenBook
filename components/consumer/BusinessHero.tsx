'use client'

import { ChevronLeft, Star } from 'lucide-react'
import type { MockBusiness } from '@/lib/mock-businesses'

interface BusinessHeroProps {
  business:    MockBusiness
  scrollY:     number
  isFav:       boolean
  onBack:      () => void
  onToggleFav: () => void
  /** Processed logo URL — shows a small glass icon next to the business name */
  logoUrl?:    string | null
}

export default function BusinessHero({
  business,
  scrollY,
  isFav,
  onBack,
  onToggleFav,
  logoUrl,
}: BusinessHeroProps) {
  return (
    <div style={{ height: 280, position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
      {/* Parallax background */}
      <div
        style={{
          position:           'absolute',
          top:                -24,
          left:               0,
          right:              0,
          bottom:             -24,
          backgroundImage:    `url(${business.heroImage})`,
          backgroundSize:     'cover',
          backgroundPosition: 'center',
          filter:             business.heroFilter,
          transform:          `translateY(${scrollY * 0.22}px)`,
          zIndex:             0,
        }}
      />

      {/* Gradient overlay */}
      <div
        style={{
          position:   'absolute',
          inset:      0,
          background: business.heroGradient,
          zIndex:     1,
        }}
      />

      {/* Back button */}
      <button
        onClick={onBack}
        className="active:scale-90 transition-transform duration-150"
        style={{
          position:             'absolute',
          top:                  54,
          left:                 20,
          zIndex:               3,
          width:                34,
          height:               34,
          borderRadius:         17,
          background:           'rgba(0,0,0,0.38)',
          backdropFilter:       'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border:               '1px solid rgba(255,255,255,0.18)',
          display:              'flex',
          alignItems:           'center',
          justifyContent:       'center',
        }}
      >
        <ChevronLeft size={18} color="white" strokeWidth={2.2} />
      </button>

      {/* Favourite button */}
      <button
        onClick={onToggleFav}
        className="active:scale-90 transition-transform duration-150"
        style={{
          position:             'absolute',
          top:                  54,
          right:                20,
          zIndex:               3,
          width:                34,
          height:               34,
          borderRadius:         17,
          background:           'rgba(0,0,0,0.38)',
          backdropFilter:       'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border:               '1px solid rgba(255,255,255,0.18)',
          display:              'flex',
          alignItems:           'center',
          justifyContent:       'center',
        }}
      >
        <Star
          size={16}
          fill={isFav ? '#D4AF37' : 'none'}
          color={isFav ? '#D4AF37' : 'rgba(255,255,255,0.9)'}
          strokeWidth={isFav ? 0 : 1.8}
        />
      </button>

      {/* Hero text */}
      <div
        style={{
          position: 'absolute',
          bottom:   0,
          left:     0,
          right:    0,
          padding:  '0 20px 18px',
          zIndex:   2,
        }}
      >
        <p
          style={{
            fontSize:      10,
            fontWeight:    800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color:         business.primaryColour,
            margin:        '0 0 3px',
          }}
        >
          {business.eyebrow}
        </p>

        {/* Name row — logo icon (44px) + name text side by side */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 9 }}>
          {logoUrl && (
            <div
              style={{
                width:                44,
                height:               44,
                borderRadius:         11,
                overflow:             'hidden',
                flexShrink:           0,
                position:             'relative',
                backdropFilter:       'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border:               '1px solid rgba(255,255,255,0.22)',
                boxShadow:            '0 4px 14px rgba(0,0,0,0.35)',
                // Align icon to bottom of the text block
                marginBottom:         2,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt={business.name}
                style={{
                  position:  'absolute',
                  inset:     0,
                  width:     '100%',
                  height:    '100%',
                  objectFit: 'cover',
                  display:   'block',
                  opacity:   0.92,
                }}
              />
              {/* Specular highlight — the glass finish on top of the logo */}
              <div
                style={{
                  position:     'absolute',
                  top:          0,
                  left:         0,
                  right:        0,
                  height:       '45%',
                  background:   'linear-gradient(to bottom, rgba(255,255,255,0.28) 0%, transparent 100%)',
                  borderRadius: '10px 10px 60% 60% / 10px 10px 28px 28px',
                  pointerEvents: 'none',
                }}
              />
            </div>
          )}

          <div>
            <h1
              style={{
                fontSize:      29,
                fontWeight:    900,
                color:         '#fff',
                letterSpacing: '-0.03em',
                lineHeight:    0.95,
                margin:        0,
              }}
            >
              {business.nameLine1}
            </h1>
            <h1
              style={{
                fontSize:      29,
                fontWeight:    900,
                color:         business.primaryColour,
                letterSpacing: '-0.03em',
                lineHeight:    0.95,
                margin:        0,
              }}
            >
              {business.nameLine2}
            </h1>
          </div>
        </div>

        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.52)', margin: '0 0 10px' }}>
          {business.meta}
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {business.pills.map((pill) => (
            <span
              key={pill}
              style={{
                background:           'rgba(255,255,255,0.1)',
                backdropFilter:       'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border:               '1px solid rgba(255,255,255,0.2)',
                borderRadius:         20,
                padding:              '4px 10px',
                fontSize:             11,
                color:                'rgba(255,255,255,0.78)',
                fontWeight:           500,
              }}
            >
              {pill}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
