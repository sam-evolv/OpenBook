'use client'

interface LiquidGlassIconProps {
  initials: string
  primaryColour: string
  secondaryColour?: string
  size?: number
  label: string
  isFavourite?: boolean
  badgeCount?: number
  onClick?: () => void
}

/** Returns a darkened version of a hex colour for the gradient end stop. */
function darkenColour(colour: string): string {
  if (colour.startsWith('#') && colour.length === 7) {
    const r = Math.floor(parseInt(colour.slice(1, 3), 16) * 0.6)
    const g = Math.floor(parseInt(colour.slice(3, 5), 16) * 0.6)
    const b = Math.floor(parseInt(colour.slice(5, 7), 16) * 0.6)
    return `rgb(${r}, ${g}, ${b})`
  }
  // Fallback for rgba or other formats
  return 'rgba(0,0,0,0.65)'
}

export default function LiquidGlassIcon({
  initials,
  primaryColour,
  secondaryColour,
  size = 68,
  label,
  isFavourite = false,
  badgeCount,
  onClick,
}: LiquidGlassIconProps) {
  const displayInitials = initials.slice(0, 2).toUpperCase()
  const endColour = secondaryColour ?? darkenColour(primaryColour)
  const fontSize = Math.round(size * 0.29)

  return (
    <div
      className="flex flex-col items-center select-none"
      style={{ cursor: onClick ? 'pointer' : 'default', position: 'relative' }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {/* ── Icon container ── */}
      <div
        className="active:scale-[0.84]"
        style={{
          position: 'relative',
          width: size,
          height: size,
          borderRadius: 18,
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.11)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.26)',
          boxShadow: `
            inset 0 1.5px 0 rgba(255,255,255,0.38),
            inset 0 -1px 0 rgba(0,0,0,0.18),
            0 4px 24px rgba(0,0,0,0.45)
          `,
          transition: 'transform 0.18s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Layer 1 — Coloured tint gradient */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            background: `linear-gradient(145deg, ${primaryColour}, ${endColour})`,
            opacity: 0.55,
          }}
        />

        {/* Layer 2 — Initials text */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3,
          }}
        >
          <span
            style={{
              fontSize,
              fontWeight: 900,
              color: 'white',
              textShadow: '0 1px 8px rgba(0,0,0,0.5)',
              lineHeight: 1,
              letterSpacing: '-0.01em',
            }}
          >
            {displayInitials}
          </span>
        </div>

        {/* Layer 3 — Top-left specular highlight */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: -12,
            left: -12,
            width: 52,
            height: 52,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(255,255,255,0.58) 0%, transparent 68%)',
            zIndex: 4,
            pointerEvents: 'none',
          }}
        />

        {/* Layer 4 — Bottom refraction shadow */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '38%',
            background:
              'linear-gradient(to bottom, transparent, rgba(0,0,0,0.22))',
            borderRadius: '0 0 17px 17px',
            zIndex: 4,
            pointerEvents: 'none',
          }}
        />

        {/* Badge */}
        {badgeCount != null && badgeCount > 0 && (
          <div
            style={{
              position: 'absolute',
              top: -3,
              right: -3,
              zIndex: 5,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              background: '#ff3b30',
              border: '1.5px solid rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingInline: 2,
            }}
          >
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                color: 'white',
                lineHeight: 1,
              }}
            >
              {badgeCount > 9 ? '9+' : badgeCount}
            </span>
          </div>
        )}
      </div>

      {/* ── Label area ── */}
      <div style={{ position: 'relative', marginTop: 6 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'white',
            textAlign: 'center',
            display: 'block',
            maxWidth: size + 8,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textShadow: '0 1px 4px rgba(0,0,0,0.7)',
          }}
        >
          {label}
        </span>

        {/* Favourite dot — sits below the label text */}
        {isFavourite && (
          <div
            aria-label="Favourited"
            style={{
              position: 'absolute',
              bottom: -7,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.85)',
              boxShadow: '0 0 5px rgba(255,255,255,0.5)',
            }}
          />
        )}
      </div>
    </div>
  )
}
