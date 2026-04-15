'use client'

import { ChevronRight } from 'lucide-react'
import type { MockService } from '@/lib/mock-businesses'

interface ServiceRowProps {
  service:  MockService
  primaryColour?: string
  onClick:  () => void
}

export default function ServiceRow({ service, primaryColour, onClick }: ServiceRowProps) {
  return (
    <button
      onClick={onClick}
      className="text-left active:scale-[0.98] transition-transform duration-150 w-full"
      style={{
        background:           'rgba(255,255,255,0.04)',
        backdropFilter:       'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border:               '1px solid rgba(255,255,255,0.1)',
        borderLeft:           primaryColour ? `3px solid ${primaryColour}` : '1px solid rgba(255,255,255,0.1)',
        borderRadius:         12,
        padding:              '13px 14px',
        display:              'flex',
        alignItems:           'center',
        gap:                  12,
      }}
    >
      {/* Colour dot */}
      <div
        style={{
          width:        10,
          height:       10,
          borderRadius: 5,
          background:   service.colour,
          flexShrink:   0,
        }}
      />

      {/* Name + duration */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize:     13.5,
            fontWeight:   700,
            color:        '#fff',
            margin:       0,
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
          }}
        >
          {service.name}
        </p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', margin: '1px 0 0' }}>
          {service.duration}
        </p>
      </div>

      {/* Price */}
      <span style={{ fontSize: 16, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
        {service.price}
      </span>

      <ChevronRight size={14} color="rgba(255,255,255,0.32)" strokeWidth={2} />
    </button>
  )
}
