'use client'

interface LiquidGlassIconProps {
  initials:       string
  primaryColour:  string
  label:          string
  isFavourite?:   boolean
  badge?:         number
  flashSale?:     boolean
  /** Processed logo URL. When provided, renders the logo with glass overlay. */
  logoUrl?:       string | null
  onClick?:       () => void
}

export default function LiquidGlassIcon({
  initials,
  primaryColour,
  label,
  isFavourite = false,
  badge,
  flashSale   = false,
  logoUrl,
  onClick,
}: LiquidGlassIconProps) {
  const hasLogo = !!logoUrl

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center active:scale-90 transition-transform duration-150"
      style={{ gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
    >
      {/* ── Icon shell ── */}
      <div
        style={{
          width:                'clamp(68px, 18vw, 76px)',
          height:               'clamp(68px, 18vw, 76px)',
          borderRadius:         'clamp(18px, 4.5vw, 20px)',
          position:             'relative',
          overflow:             'hidden',
          flexShrink:           0,
          backdropFilter:       'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
          background:           'rgba(255,255,255,0.04)',
          border:               '1px solid rgba(255,255,255,0.22)',
          boxShadow:            '0 8px 28px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.28)',
        }}
      >
        {/* ── Layer 0: colour tint ──
            When logo present, drop to 0.25 opacity so brand colour bleeds
            through subtly at edges rather than dominating */}
        <div
          style={{
            position: 'absolute',
            inset:    0,
            background: primaryColour,
            opacity:  hasLogo ? 0.25 : 0.60,
            zIndex:   0,
          }}
        />

        {/* ── Layer 1: logo image (when present) ──
            Sits above the colour tint, below all glass effects.
            opacity 0.92 keeps the glass layers faintly visible */}
        {hasLogo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl!}
            alt={label}
            style={{
              position:   'absolute',
              inset:      0,
              width:      '100%',
              height:     '100%',
              objectFit:  'cover',
              display:    'block',
              opacity:    0.92,
              zIndex:     1,
            }}
          />
        )}

        {/* ── Layer 2: specular highlight ──
            Bright streak across the top — this is what makes a logo look like
            a real iOS liquid glass icon rather than just an image in a circle */}
        <div
          style={{
            position:     'absolute',
            top:          0,
            left:         0,
            right:        0,
            height:       '48%',
            background:   'linear-gradient(to bottom, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.0) 100%)',
            borderRadius: '18px 18px 60% 60% / 18px 18px 40px 40px',
            zIndex:       3,
            pointerEvents: 'none',
          }}
        />

        {/* ── Layer 3: bottom refraction band ── */}
        <div
          style={{
            position:     'absolute',
            bottom:       0,
            left:         0,
            right:        0,
            height:       '28%',
            background:   'linear-gradient(to top, rgba(0,0,0,0.18) 0%, transparent 100%)',
            zIndex:       3,
            pointerEvents: 'none',
          }}
        />

        {/* ── Layer 4: left-edge inner glow ──
            Subtle even with logo — gives the lens-like edge refraction */}
        <div
          style={{
            position:     'absolute',
            top:          '10%',
            left:         0,
            width:        '30%',
            height:       '60%',
            background:   `radial-gradient(ellipse at left center, ${primaryColour}30 0%, transparent 80%)`,
            zIndex:       3,
            pointerEvents: 'none',
          }}
        />

        {/* ── Layer 5: initials (fallback when no logo) ── */}
        {!hasLogo && (
          <div
            style={{
              position:       'absolute',
              inset:          0,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              zIndex:         2,
            }}
          >
            <span
              style={{
                fontSize:      22,
                fontWeight:    800,
                color:         primaryColour,
                letterSpacing: '-0.02em',
                textShadow:    `0 0 18px ${primaryColour}, 0 2px 4px rgba(0,0,0,0.5)`,
              }}
            >
              {initials}
            </span>
          </div>
        )}

        {/* ── Layer 6: flash sale badge ── */}
        {flashSale && (
          <div
            style={{
              position:       'absolute',
              top:            4,
              right:          4,
              width:          20,
              height:         20,
              borderRadius:   10,
              background:     '#ef4444',
              border:         '1.5px solid rgba(5,5,26,0.6)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontSize:       11,
              lineHeight:     1,
              zIndex:         5,
            }}
          >
            ⚡
          </div>
        )}

        {/* ── Layer 6: numeric badge ── */}
        {!flashSale && badge !== undefined && badge > 0 && (
          <div
            style={{
              position:       'absolute',
              top:            4,
              right:          4,
              minWidth:       18,
              height:         18,
              borderRadius:   9,
              background:     '#ef4444',
              border:         '1.5px solid rgba(5,5,26,0.6)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontSize:       10,
              fontWeight:     800,
              color:          '#fff',
              paddingLeft:    badge > 9 ? 3 : 0,
              paddingRight:   badge > 9 ? 3 : 0,
              zIndex:         5,
            }}
          >
            {badge}
          </div>
        )}
      </div>

      {/* ── Label + favourite dot ── */}
      <div className="flex flex-col items-center" style={{ gap: 3 }}>
        <span
          style={{
            fontSize:      11,
            fontWeight:    500,
            color:         'rgba(255,255,255,0.88)',
            letterSpacing: '-0.01em',
            textShadow:    '0 1px 3px rgba(0,0,0,0.6)',
            whiteSpace:    'nowrap',
          }}
        >
          {label}
        </span>

        {isFavourite && (
          <div
            style={{
              width:        4,
              height:       4,
              borderRadius: 2,
              background:   'rgba(255,255,255,0.75)',
            }}
          />
        )}
      </div>
    </button>
  )
}
