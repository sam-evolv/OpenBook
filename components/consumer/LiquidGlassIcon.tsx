'use client'

import { useState } from 'react'

interface LiquidGlassIconProps {
  initials:     string
  primaryColour: string
  label:        string
  isFavourite?: boolean
  badge?:       number
  onClick?:     () => void
}

export default function LiquidGlassIcon({
  initials,
  primaryColour,
  label,
  isFavourite = false,
  badge,
  onClick,
}: LiquidGlassIconProps) {
  const [isPressed, setIsPressed] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      className="flex flex-col items-center"
      style={{
        gap:        6,
        background: 'none',
        border:     'none',
        cursor:     'pointer',
        padding:    0,
        transform:  isPressed ? 'scale(0.92) rotate(1deg)' : 'scale(1) rotate(0deg)',
        filter:     isPressed ? 'brightness(1.1)' : 'brightness(1)',
        transition: 'all 0.15s cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      {/* ── Icon shell with ambient glow ── */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>

        {/* Ambient glow — emits behind the icon */}
        <div
          style={{
            position:     'absolute',
            width:        80,
            height:       80,
            borderRadius: '50%',
            background:   `radial-gradient(circle, ${primaryColour}40 0%, transparent 70%)`,
            filter:       'blur(20px)',
            zIndex:       0,
            pointerEvents: 'none',
          }}
        />

        {/* Icon shell */}
        <div
          style={{
            width:                'clamp(68px, 18vw, 76px)',
            height:               'clamp(68px, 18vw, 76px)',
            borderRadius:         'clamp(18px, 4.5vw, 20px)',
            position:             'relative',
            overflow:             'hidden',
            flexShrink:           0,
            zIndex:               1,
            /* Blurs the wallpaper behind */
            backdropFilter:       'blur(22px)',
            WebkitBackdropFilter: 'blur(22px)',
            /* Base glass tint — kept minimal so colour tint reads true */
            background:           'rgba(255,255,255,0.04)',
            /* Outer ring + depth shadow */
            border:               '1px solid rgba(255,255,255,0.22)',
            boxShadow:            '0 8px 28px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.28)',
          }}
        >
          {/* Base tint — uses primaryColour at low opacity so wallpaper shows through */}
          <div
            style={{
              position:   'absolute',
              inset:      0,
              background: primaryColour,
              opacity:    0.60,
            }}
          />

          {/* Specular highlight — bright streak across the top */}
          <div
            style={{
              position:     'absolute',
              top:          0,
              left:         0,
              right:        0,
              height:       '48%',
              background:   'linear-gradient(to bottom, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.0) 100%)',
              borderRadius: '18px 18px 60% 60% / 18px 18px 40px 40px',
            }}
          />

          {/* Bottom refraction band */}
          <div
            style={{
              position:   'absolute',
              bottom:     0,
              left:       0,
              right:      0,
              height:     '28%',
              background: 'linear-gradient(to top, rgba(0,0,0,0.18) 0%, transparent 100%)',
            }}
          />

          {/* Left-edge inner glow */}
          <div
            style={{
              position:   'absolute',
              top:        '10%',
              left:       0,
              width:      '30%',
              height:     '60%',
              background: `radial-gradient(ellipse at left center, ${primaryColour}30 0%, transparent 80%)`,
            }}
          />

          {/* Initials */}
          <div
            style={{
              position:        'absolute',
              inset:           0,
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
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

          {/* Badge */}
          {badge !== undefined && badge > 0 && (
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
              }}
            >
              {badge}
            </div>
          )}
        </div>
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
