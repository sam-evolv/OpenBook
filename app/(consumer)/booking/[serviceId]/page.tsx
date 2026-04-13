'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { ChevronLeft, CheckCircle } from 'lucide-react'
import WallpaperBackground from '@/components/consumer/WallpaperBackground'
import SlotGrid from '@/components/consumer/SlotGrid'

/* ── Day strip ── */
function buildDays(): { label: string; idx: number; date: Date }[] {
  const today = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    if (i === 0) return { label: 'Today',    idx: i, date: d }
    if (i === 1) return { label: 'Tomorrow', idx: i, date: d }
    const dn = d.toLocaleDateString('en-GB', { weekday: 'short' })
    return { label: `${dn} ${d.getDate()}`, idx: i, date: d }
  })
}

const DAYS = buildDays()

/* ── Mock slots fallback ── */
const SLOT_SETS: string[][] = [
  ['9:00 am', '9:30 am', '10:00 am', '10:30 am', '11:00 am', '11:30 am', '12:00 pm', '12:30 pm', '2:00 pm', '2:30 pm', '3:00 pm', '3:30 pm', '4:00 pm', '4:30 pm', '5:00 pm', '5:30 pm'],
  ['10:30 am', '11:00 am', '11:30 am', '12:00 pm', '12:30 pm', '2:30 pm', '3:00 pm', '3:30 pm', '4:00 pm', '5:00 pm'],
  ['9:00 am', '9:30 am', '10:00 am', '11:00 am', '12:00 pm', '1:00 pm', '2:00 pm', '3:00 pm', '4:30 pm', '5:00 pm'],
  ['10:00 am', '11:30 am', '2:00 pm', '3:30 pm', '5:00 pm'],
  ['9:00 am', '9:30 am', '10:00 am', '10:30 am', '11:00 am', '2:00 pm', '3:00 pm', '4:00 pm'],
  ['10:00 am', '11:00 am', '12:00 pm', '1:00 pm', '2:00 pm', '3:00 pm'],
]

/* ── Helpers ── */
function isMorning(slot: string) { return slot.includes('am') }

function titleCase(slug: string) {
  return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function dateToParam(d: Date): string {
  return d.toISOString().slice(0, 10) // YYYY-MM-DD
}

/** Convert "HH:MM" (24h) → "h:mm am/pm" */
function fmt24(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':')
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10)
  const period = h < 12 ? 'am' : 'pm'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

/* ── Inner component ── */
function SlotPickerContent() {
  const router      = useRouter()
  const params      = useParams()
  const searchParams = useSearchParams()

  const serviceId     = params?.serviceId as string
  const businessParam = searchParams?.get('business')   ?? ''
  const priceParam    = searchParams?.get('price')      ?? ''
  const colourParam   = searchParams?.get('colour')     ?? '#D4AF37'
  const businessDbId  = searchParams?.get('businessId') ?? ''
  const serviceDbId   = searchParams?.get('serviceDbId') ?? ''

  const [selectedDay, setSelectedDay] = useState(0)
  const [selected,    setSelected]    = useState<string | null>(null)
  const [slots,       setSlots]       = useState<string[]>(SLOT_SETS[0])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [closed,      setClosed]      = useState(false)

  const serviceName = titleCase(serviceId ?? 'service')

  /* ── Fetch availability from API or use mocks ── */
  useEffect(() => {
    setSelected(null)

    if (!businessDbId || !serviceDbId) {
      setSlots(SLOT_SETS[selectedDay] ?? SLOT_SETS[0])
      setClosed(false)
      return
    }

    let cancelled = false
    setLoadingSlots(true)

    async function fetchSlots() {
      try {
        const date = dateToParam(DAYS[selectedDay].date)
        const res  = await fetch(
          `/api/bookings/availability?business_id=${businessDbId}&service_id=${serviceDbId}&date=${date}`
        )
        if (!res.ok) throw new Error('API error')
        const data = await res.json()

        if (cancelled) return
        if (data.isClosed) {
          setClosed(true)
          setSlots([])
        } else {
          setClosed(false)
          const raw: Array<string | { time: string }> = data.slots ?? []
          setSlots(raw.map((s) => typeof s === 'string' ? fmt24(s) : fmt24(s.time)))
        }
      } catch {
        if (cancelled) return
        setSlots(SLOT_SETS[selectedDay] ?? SLOT_SETS[0])
        setClosed(false)
      } finally {
        if (!cancelled) setLoadingSlots(false)
      }
    }

    fetchSlots()
    return () => { cancelled = true }
  }, [selectedDay, businessDbId, serviceDbId])

  const morningSlots   = slots.filter(isMorning)
  const afternoonSlots = slots.filter((s) => !isMorning(s))

  function handleDayChange(idx: number) {
    setSelectedDay(idx)
    setSelected(null)
  }

  function handleConfirm() {
    const qs: Record<string, string> = {
      service:  serviceName,
      time:     selected!,
      business: businessParam,
      price:    priceParam,
      colour:   colourParam,
    }
    if (businessDbId) qs.businessId  = businessDbId
    if (serviceDbId)  qs.serviceDbId = serviceDbId
    qs.date = dateToParam(DAYS[selectedDay].date)
    router.push(`/booking/confirm?${new URLSearchParams(qs).toString()}`)
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
                className="active:scale-95 transition-transform duration-100"
                style={{
                  flexShrink:   0,
                  height:       34,
                  paddingLeft:  14,
                  paddingRight: 14,
                  borderRadius: 20,
                  background:   isActive ? '#D4AF37' : 'rgba(255,255,255,0.08)',
                  border:       isActive ? 'none' : '1px solid rgba(255,255,255,0.13)',
                  color:        isActive ? '#1a1200' : 'rgba(255,255,255,0.65)',
                  fontSize:     13,
                  fontWeight:   isActive ? 700 : 500,
                  whiteSpace:   'nowrap',
                  cursor:       'pointer',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* ── Slots ── */}
        <div className="px-5 pt-5">

          {loadingSlots && (
            <div style={{ textAlign: 'center', paddingTop: 40 }}>
              <div
                style={{
                  width:        36,
                  height:       36,
                  borderRadius: 18,
                  border:       '3px solid rgba(212,175,55,0.3)',
                  borderTopColor: '#D4AF37',
                  animation:    'spin 0.8s linear infinite',
                  margin:       '0 auto',
                }}
              />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {!loadingSlots && closed && (
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, textAlign: 'center', paddingTop: 40 }}>
              Closed this day — try another date
            </p>
          )}

          {!loadingSlots && !closed && morningSlots.length > 0 && (
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
              <SlotGrid slots={morningSlots} selected={selected} onSelect={setSelected} />
            </div>
          )}

          {!loadingSlots && !closed && afternoonSlots.length > 0 && (
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
              <SlotGrid slots={afternoonSlots} selected={selected} onSelect={setSelected} />
            </div>
          )}

          {!loadingSlots && !closed && slots.length === 0 && (
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, textAlign: 'center', paddingTop: 40 }}>
              No availability — try another day
            </p>
          )}
        </div>

        {/* ── Confirm button ── */}
        {selected && !loadingSlots && (
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
