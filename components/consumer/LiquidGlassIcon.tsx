interface LiquidGlassIconProps {
  img: string
  name: string
  initials: string
  primaryColour: string
  size?: number
}

export default function LiquidGlassIcon({
  img,
  name,
  initials,
  primaryColour,
  size = 72,
}: LiquidGlassIconProps) {
  const radius = Math.round(size * 0.25)

  return (
    <div
      style={{
        width:    '100%',
        paddingTop: '100%',
        position: 'relative',
        borderRadius: radius,
        overflow: 'hidden',
        border:   `1.5px solid ${primaryColour}3a`,
        background: '#111',
        flexShrink: 0,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={img}
        alt={name}
        style={{
          position:   'absolute',
          inset:      0,
          width:      '100%',
          height:     '100%',
          objectFit:  'cover',
        }}
      />
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
          position:        'absolute',
          inset:           0,
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
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
  )
}
