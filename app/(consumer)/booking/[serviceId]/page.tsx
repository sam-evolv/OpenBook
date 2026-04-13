'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ChevronLeft, CheckCircle } from 'lucide-react'
import WallpaperBackground from '@/components/consumer/WallpaperBackground'
import SlotGrid from '@/components/consumer/SlotGrid'

const MOCK_SLOTS = [
  '9:00 am', '9:30 am', '10:00 am', '10:30 am',
  '11:00 am', '11:30 am', '12:00 pm', '12:30 pm',
  '2:00 pm',  '2:30 pm',  '3:00 pm',  '3:30 pm',
  '4:00 pm',  '4:30 pm',  '5:00 pm',  '5:30 pm',
]

function titleCase(slug: string) {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export default function SlotPickerPage() {
  const router    = useRouter()
  const params    = useParams()
  const serviceId = params?.serviceId as string

  const [selected, setSelected] = useState<string | null>(null)

  const serviceName = titleCase(serviceId ?? 'service')

  return (
    <WallpaperBackground>
      <div className="min-h-screen pb-32">

        {/* Header */}
        <div
          className="sticky top-0 z-20 px-5 pt-12 pb-5"
          style={{
            background:           'rgba(8,8,8,0.84)',
            backdropFilter:       'blur(22px)',
            WebkitBackdropFilter: 'blur(22px)',
            borderBottom:         '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="active:scale-90 transition-transform duration-150"
              style={{
                width:                34,
                height:               34,
                borderRadius:         10,
                background:           'rgba(255,255,255,0.09)',
                backdropFilter:       'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border:               '1px solid rgba(255,255,255,0.14)',
                display:              'flex',
                alignItems:           'center',
                justifyContent:       'center',
                flexShrink:           0,
              }}
            >
              <ChevronLeft size={16} color="white" />
            </button>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
                {serviceName}
              </h1>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', margin: 0 }}>
                Pick a time · Today
              </p>
            </div>
          </div>
        </div>

        {/* Slots */}
        <div className="px-5 pt-6">
          <p className="section-label mb-3">Available today</p>
          <SlotGrid slots={MOCK_SLOTS} selected={selected} onSelect={setSelected} />
        </div>

        {/* Confirm button */}
        {selected && (
          <div className="px-5 mt-8">
            <button
              onClick={() => router.push('/booking/confirm')}
              className="active:scale-[0.97] transition-transform duration-150 w-full"
              style={{
                height:       52,
                borderRadius: 16,
                background:   '#D4AF37',
                color:        '#000',
                fontSize:     16,
                fontWeight:   800,
                border:       'none',
                cursor:       'pointer',
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'center',
                gap:          8,
              }}
            >
              <CheckCircle size={18} strokeWidth={2.5} />
              Confirm · {selected}
            </button>
          </div>
        )}
      </div>
    </WallpaperBackground>
  )
}
