'use client'

import { useState, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { ChevronLeft, CheckCircle } from 'lucide-react'
import WallpaperBackground from '@/components/consumer/WallpaperBackground'
import SlotGrid from '@/components/consumer/SlotGrid'

/* ── Day strip ── */
function buildDays(): { label: string; idx: number }[] {
  const today = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    if (i === 0) return { label: 'Today',    idx: i }
    if (i === 1) return { label: 'Tomorrow', idx: i }
    const dn = d.toLocaleDateString('en-GB', { weekday: 'short' })
    return { label: `${dn} ${d.getDate()}`, idx: i }
  })
}

const DAYS = buildDays()

/* ── Slot availability varies by day ── */
const SLOT_SETS: string[][] = [
  ['9:00 am', '9:30 am', '10:00 am', '10:30 am', '11:00 am', '11:30 am', '12:00 pm', '12:30 pm', '2:00 pm', '2:30 pm', '3:00 pm', '3:30 pm', '4:00 pm', '4:30 pm', '5:00 pm', '5:30 pm'],
  ['10:30 am', '11:00 am', '11:30 am', '12:00 pm', '12:30 pm', '2:30 pm', '3:00 pm', '3:30 pm', '4:00 pm', '5:00 pm'],
  ['9:00 am', '9:30 am', '10:00 am', '11:00 am', '12:00 pm', '1:00 pm', '2:00 pm', '3:00 pm', '4:30 pm', '5:00 pm'],
  ['10:00 am', '11:30 am', '2:00 pm', '3:30 pm', '5:00 pm'],
  ['9:00 am', '9:30 am', '10:00 am', '10:30 am', '11:00 am', '2:00 pm', '3:00 pm', '4:00 pm'],
  ['10:00 am', '11:00 am', '12:00 pm', '1:00 pm', '2:00 pm', '3:00 pm'],
]

function isMorning(slot: string) { return slot.includes('am') }

function titleCase(slug: string) {
  return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

/* ── Inner component (needs useSearchParams inside Suspense) ── */
function SlotPickerContent() {
  const router      = useRouter()
  const params      = useParams()
  const searchParams = useSearchParams()

  const serviceId     = params?.serviceId as string
  const businessParam = searchParams?.get('business') ?? ''
  const priceParam    = searchParams?.get('price')    ?? ''
  const colourParam   = searchParams?.get('colour')   ?? '#D4AF37'

  const [selectedDay, setSelectedDay] = useState(0)
  const [selected,    setSelected]    = useState<string | null>(null)

  const serviceName    = titleCase(serviceId ?? 'service')
  const slots          = SLOT_SETS[selectedDay] ?? SLOT_SETS[0]
  const morningSlots   = slots.filter(isMorning)
  const afternoonSlots = slots.filter((s) => !isMorning(s))

  function handleDayChange(idx: number) {
    setSelectedDay(idx)
    setSelected(null)
  }

  function handleConfirm() {
    const qs = new URLSearchParams({
      service:  serviceName,
      time:     selected!,
      business: businessParam,
      price:    priceParam,
      colour:   colourParam,
    })
    router.push(`/booking/confirm?${qs.toString()}`)
  }

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
                {businessParam || 'Pick a time'}
                {priceParam ? ` · €${priceParam}` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* ── Day strip ── */}
        <div
          className="flex gap-2 overflow-x-auto scrollbar-none px-5 pt-5 pb-1"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {DAYS.map(({ label, idx }) => {
            const isActive = selectedDay === idx
            return (
              <button
                key={idx}
                onClick={() => handleDayChange(idx)}
                className="transition-all duration-150"
                style={{
                  flexShrink:   0,
                  height:       34,
                  paddingLeft:  14,
                  paddingRight: 14,
                  borderRadius: 20,
                  background:   isActive ? '#D4AF37' : 'rgba(255,255,255,0.07)',
                  border:       isActive ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  color:        isActive ? '#000000' : 'rgba(255,255,255,0.6)',
                  fontSize:     13,
                  fontWeight:   isActive ? 800 : 500,
                  whiteSpace:   'nowrap',
                  cursor:       'pointer',
                  boxShadow:    isActive ? '0 4px 16px rgba(212,175,55,0.4)' : 'none',
                  transform:    isActive ? 'scale(1.05)' : 'scale(1)',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* ── Slots ── */}
        <div className="px-5 pt-5">

          {morningSlots.length > 0 && (
            <div className="mb-6">
              <p
                style={{
                  fontSize:      11,
                  fontWeight:    700,
                  color:         'rgba(255,255,255,0.40)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom:  10,
                }}
              >
                Morning
              </p>
              <SlotGrid slots={morningSlots} selected={selected} onSelect={setSelected} colour={colourParam} />
            </div>
          )}

          {afternoonSlots.length > 0 && (
            <div>
              <p
                style={{
                  fontSize:      11,
                  fontWeight:    700,
                  color:         'rgba(255,255,255,0.40)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom:  10,
                }}
              >
                Afternoon
              </p>
              <SlotGrid slots={afternoonSlots} selected={selected} onSelect={setSelected} colour={colourParam} />
            </div>
          )}

          {slots.length === 0 && (
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, textAlign: 'center', paddingTop: 40 }}>
              No availability — try another day
            </p>
          )}
        </div>

        {/* ── Confirm button ── */}
        {selected && (
          <div className="px-5 mt-8">
            <button
              onClick={handleConfirm}
              className="active:scale-[0.97] transition-transform duration-150 w-full"
              style={{
                height:         52,
                borderRadius:   16,
                background:     colourParam || '#D4AF37',
                color:          '#000',
                fontSize:       16,
                fontWeight:     800,
                border:         'none',
                cursor:         'pointer',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                gap:            8,
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

export default function SlotPickerPage() {
  return (
    <Suspense>
      <SlotPickerContent />
    </Suspense>
  )
}
