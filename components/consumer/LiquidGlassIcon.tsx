interface LiquidGlassIconProps {
  img?: string
  name?: string
  initials: string
  primaryColour: string
  size?: number
  label?: string
  isFavourite?: boolean
  badge?: number
  onClick?: () => void
}

export default function LiquidGlassIcon({
  img,
  name,
  initials,
  primaryColour,
  size = 64,
  label,
  badge,
  onClick,
}: LiquidGlassIconProps) {
  const radius = Math.round(size * 0.25)

  return (
    <button
      onClick={onClick}
      style={{
        display:    'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap:        6,
        background: 'none',
        border:     'none',
        cursor:     onClick ? 'pointer' : 'default',
        padding:    0,
      }}
    >
      {/* Icon */}
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <div
          style={{
            width:        size,
            height:       size,
            borderRadius: radius,
            overflow:     'hidden',
            border:       `1.5px solid ${primaryColour}3a`,
            background:   '#111',
          }}
        >
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img}
              alt={name ?? initials}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : null}
          {/* Dark overlay */}
          <div
            style={{
              position:   'absolute',
              inset:      0,
              background: 'linear-gradient(135deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.52) 100%)',
            }}
          />
          {/* Initials */}
          <div
            style={{
              position:       'absolute',
              inset:          0,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontSize:   size * 0.22,
                fontWeight: 800,
                color:      primaryColour,
                textShadow: '0 1px 4px rgba(0,0,0,0.5)',
              }}
            >
              {initials}
            </span>
          </div>
        </div>

        {/* Badge */}
        {badge !== undefined && badge > 0 && (
          <div
            style={{
              position:       'absolute',
              top:            -4,
              right:          -4,
              minWidth:       18,
              height:         18,
              borderRadius:   9,
              background:     '#ef4444',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              border:         '2px solid #080808',
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{badge}</span>
          </div>
        )}
      </div>

      {/* Label */}
      {label && (
        <span
          style={{
            fontSize:     10,
            fontWeight:   600,
            color:        'rgba(255,255,255,0.7)',
            textAlign:    'center',
            maxWidth:     size + 8,
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
            lineHeight:   1.2,
          }}
        >
          {label}
        </span>
      )}
    </button>
  )
}
