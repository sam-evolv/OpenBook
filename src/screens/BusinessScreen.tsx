import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { format, addDays, parseISO } from 'date-fns'
import { colors, radius, transitions } from '../constants/theme'
import { supabase } from '../lib/supabase'
import { getAvailability } from '../lib/availability'
import { formatPrice, getDurationLabel } from '../lib/utils'
import { useAuth } from '../lib/AuthContext'
import type { Business, Service, Staff, Review, TimeSlot } from '../lib/types'

type BookingStep = 'browse' | 'slots' | 'details' | 'done'

export default function BusinessScreen() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { user, customer } = useAuth()

  const [business, setBusiness] = useState<Business | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [reviews, setReviews] = useState<(Review & { customer_name?: string })[]>([])
  const [avgRating, setAvgRating] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null)
  const [step, setStep] = useState<BookingStep>('browse')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dateDays = Array.from({ length: 14 }, (_, i) =>
    format(addDays(new Date(), i), 'yyyy-MM-dd')
  )

  // Pre-fill user info
  useEffect(() => {
    if (user?.email) setEmail(user.email)
    if (customer?.name) setName(customer.name)
  }, [user, customer])

  // Load business data
  useEffect(() => {
    if (!slug) return
    let cancelled = false

    async function load() {
      const { data: biz } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', slug!)
        .eq('is_live', true)
        .single()

      if (!biz || cancelled) {
        setLoading(false)
        return
      }
      setBusiness(biz)

      const [svcRes, staffRes, revRes] = await Promise.all([
        supabase.from('services').select('*').eq('business_id', biz.id).eq('is_active', true).order('sort_order'),
        supabase.from('staff').select('*').eq('business_id', biz.id).eq('is_active', true),
        supabase.from('reviews').select('id, rating, comment, created_at, customer_id').eq('business_id', biz.id).order('created_at', { ascending: false }).limit(10),
      ])

      if (!cancelled) {
        setServices(svcRes.data ?? [])
        setStaff(staffRes.data ?? [])

        const revs = revRes.data ?? []
        setReviews(revs as (Review & { customer_name?: string })[])

        if (revs.length > 0) {
          const avg = revs.reduce((s, r) => s + ((r as Review).rating ?? 0), 0) / revs.length
          setAvgRating(avg)
        }
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [slug])

  // Load slots when date or service changes
  useEffect(() => {
    if (!selectedService || !business) return
    let cancelled = false

    async function loadSlots() {
      setLoadingSlots(true)
      setSelectedSlot(null)
      const result = await getAvailability(business!.id, selectedService!.id, selectedDate)
      if (!cancelled) {
        setSlots(result.isClosed ? [] : result.slots)
        setLoadingSlots(false)
      }
    }
    loadSlots()
    return () => { cancelled = true }
  }, [selectedDate, selectedService, business])

  const accent = business?.primary_colour ?? '#D4AF37'

  async function handleBook() {
    if (!selectedSlot || !business || !selectedService) return
    setBooking(true)
    setError(null)

    try {
      // Get or create customer
      let customerId = customer?.id

      if (!customerId) {
        // Upsert a guest customer
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('email', email)
          .maybeSingle()

        if (existingCustomer) {
          customerId = existingCustomer.id
        } else {
          const { data: newCust, error: custErr } = await supabase
            .from('customers')
            .insert({ name, email, user_id: user?.id ?? null })
            .select('id')
            .single()

          if (custErr || !newCust) {
            setError('Could not create customer record.')
            setBooking(false)
            return
          }
          customerId = newCust.id
        }
      }

      const startsAt = `${selectedDate}T${selectedSlot}:00`
      const startDate = parseISO(startsAt)
      const endDate = new Date(startDate.getTime() + selectedService.duration_minutes * 60000)

      const { error: bookErr } = await supabase.from('bookings').insert({
        business_id: business.id,
        service_id: selectedService.id,
        customer_id: customerId,
        staff_id: selectedStaff,
        starts_at: startsAt,
        ends_at: endDate.toISOString(),
        price_cents: selectedService.price_cents,
        status: 'confirmed',
        source: 'app',
      })

      if (bookErr) {
        setError(bookErr.message)
      } else {
        setStep('done')
      }
    } catch (e) {
      setError('Booking failed. Please try again.')
    }
    setBooking(false)
  }

  if (loading) {
    return (
      <div style={{ height: '100%', background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: colors.textSecondary, fontSize: 14 }}>Loading...</div>
      </div>
    )
  }

  if (!business) {
    return (
      <div style={{ height: '100%', background: colors.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ fontSize: 48 }}>&#128533;</div>
        <div style={{ color: colors.text, fontSize: 18, fontWeight: 700 }}>Business not found</div>
        <button onClick={() => navigate('/')} style={{ color: colors.goldPrimary, fontSize: 15, fontWeight: 600 }}>Go home</button>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ height: '100%', background: colors.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: 100, height: 100, borderRadius: '50%', background: `${colors.green}15`, border: `3px solid ${colors.green}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, boxShadow: `0 0 40px ${colors.green}33` }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke={colors.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: colors.text, marginBottom: 8 }}>Booking Confirmed!</div>
        <div style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 8 }}>
          {selectedService?.name} at {business.name}
        </div>
        <div style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 32 }}>
          {format(parseISO(selectedDate), 'EEEE d MMMM')} at {selectedSlot}
        </div>
        <button onClick={() => navigate('/')} style={{ padding: '16px 32px', background: colors.goldGradient, borderRadius: radius.pill, color: '#000', fontSize: 16, fontWeight: 700 }}>
          Back to Home
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={transitions.spring}
      style={{ height: '100%', display: 'flex', flexDirection: 'column', background: colors.bg, overflow: 'hidden' }}
    >
      {/* Hero */}
      <div style={{ position: 'relative', height: 200, flexShrink: 0, background: business.hero_image_url ? `url(${business.hero_image_url}) center/cover` : `linear-gradient(135deg, ${accent}22, ${accent}05)` }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, #080808 100%)' }} />
        <button
          onClick={() => navigate(-1)}
          style={{ position: 'absolute', top: 48, left: 16, width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 19l-7-7 7-7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', marginTop: -40, position: 'relative', zIndex: 5, paddingBottom: 32 }}>
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 16px' }}>
          {/* Business header */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginBottom: 16 }}>
            {business.logo_url ? (
              <img src={business.logo_url} alt={business.name} style={{ width: 64, height: 64, borderRadius: 18, objectFit: 'cover', border: '3px solid #080808' }} />
            ) : (
              <div style={{ width: 64, height: 64, borderRadius: 18, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: '#000', border: '3px solid #080808' }}>
                {business.name[0]}
              </div>
            )}
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0 }}>{business.name}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{business.category}</span>
                {business.city && (
                  <>
                    <span style={{ color: 'rgba(255,255,255,0.25)' }}>·</span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{business.city}</span>
                  </>
                )}
                {avgRating !== null && (
                  <>
                    <span style={{ color: 'rgba(255,255,255,0.25)' }}>·</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: accent }}>&#9733; {avgRating.toFixed(1)}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {business.description && (
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,0.55)', marginBottom: 24 }}>{business.description}</p>
          )}

          {/* Services */}
          <section style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.28)', marginBottom: 12 }}>Services</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {services.map((s) => {
                const isSelected = selectedService?.id === s.id
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedService(isSelected ? null : s)
                      setStep(isSelected ? 'browse' : 'slots')
                      setSelectedSlot(null)
                    }}
                    style={{
                      width: '100%',
                      borderRadius: 16,
                      padding: '16px 18px',
                      textAlign: 'left',
                      background: isSelected ? `${s.colour ?? accent}15` : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${isSelected ? (s.colour ?? accent) : 'rgba(255,255,255,0.10)'}`,
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#fff', fontSize: 15 }}>{s.name}</div>
                        {s.description && <div style={{ fontSize: 12, marginTop: 4, color: 'rgba(255,255,255,0.45)' }}>{s.description}</div>}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{getDurationLabel(s.duration_minutes)}</span>
                          {(s.capacity ?? 1) > 1 && (
                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: `${accent}20`, color: accent, fontWeight: 600 }}>
                              Group · {s.capacity} spots
                            </span>
                          )}
                        </div>
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginLeft: 12 }}>{formatPrice(s.price_cents)}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Slot Picker - shows when service selected */}
          {selectedService && (
            <section style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.28)', marginBottom: 12 }}>Pick a time</h2>

              {/* Date strip */}
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12 }}>
                {dateDays.map((d) => {
                  const dayDate = parseISO(d)
                  const isSelected = d === selectedDate
                  return (
                    <button
                      key={d}
                      onClick={() => setSelectedDate(d)}
                      style={{
                        flexShrink: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        borderRadius: 12,
                        padding: '8px 14px',
                        minWidth: 52,
                        background: isSelected ? accent : 'rgba(255,255,255,0.07)',
                        color: isSelected ? '#000' : 'rgba(255,255,255,0.55)',
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 500 }}>{format(dayDate, 'EEE')}</span>
                      <span style={{ fontSize: 16, fontWeight: 700 }}>{format(dayDate, 'd')}</span>
                    </button>
                  )
                })}
              </div>

              {/* Staff picker */}
              {staff.length > 1 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>Staff (optional)</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setSelectedStaff(null)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                        background: selectedStaff === null ? accent : 'rgba(255,255,255,0.07)',
                        color: selectedStaff === null ? '#000' : 'rgba(255,255,255,0.55)',
                      }}
                    >
                      Any
                    </button>
                    {staff.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSelectedStaff(s.id)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: 600,
                          background: selectedStaff === s.id ? accent : 'rgba(255,255,255,0.07)',
                          color: selectedStaff === s.id ? '#000' : 'rgba(255,255,255,0.55)',
                        }}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Slots grid */}
              {loadingSlots ? (
                <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>Loading availability...</div>
              ) : slots.filter((s) => s.available).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>No availability on this date</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {slots.map((slot) => (
                    <button
                      key={slot.time}
                      disabled={!slot.available}
                      onClick={() => {
                        setSelectedSlot(slot.time)
                        setStep('details')
                      }}
                      style={{
                        borderRadius: 12,
                        padding: '10px 0',
                        fontSize: 14,
                        fontWeight: 600,
                        background: selectedSlot === slot.time ? accent : 'rgba(255,255,255,0.07)',
                        color: selectedSlot === slot.time ? '#000' : slot.available ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)',
                        opacity: slot.available ? 1 : 0.3,
                      }}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}

              {/* Booking details form */}
              {step === 'details' && selectedSlot && (
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ borderRadius: 12, padding: 14, fontSize: 14, background: `${accent}10`, border: `1px solid ${accent}30` }}>
                    <span style={{ fontWeight: 600, color: '#fff' }}>{selectedService.name}</span>
                    <span style={{ margin: '0 8px', color: 'rgba(255,255,255,0.4)' }}>·</span>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>{format(parseISO(selectedDate), 'EEE d MMM')} at {selectedSlot}</span>
                  </div>

                  {!customer && (
                    <>
                      <input
                        type="text"
                        placeholder="Your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={{ width: '100%', borderRadius: 12, padding: '12px 16px', fontSize: 14, color: '#fff', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', outline: 'none' }}
                      />
                      <input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{ width: '100%', borderRadius: 12, padding: '12px 16px', fontSize: 14, color: '#fff', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', outline: 'none' }}
                      />
                    </>
                  )}

                  {error && <p style={{ fontSize: 13, color: '#ff453a' }}>{error}</p>}

                  <button
                    onClick={handleBook}
                    disabled={booking || (!customer && (!name || !email))}
                    style={{
                      width: '100%',
                      borderRadius: 12,
                      padding: '14px',
                      fontSize: 15,
                      fontWeight: 700,
                      background: accent,
                      color: '#000',
                      opacity: booking || (!customer && (!name || !email)) ? 0.4 : 1,
                    }}
                  >
                    {booking ? 'Booking...' : `Confirm booking — ${formatPrice(selectedService.price_cents)}`}
                  </button>
                </div>
              )}
            </section>
          )}

          {/* Reviews */}
          {reviews.length > 0 && (
            <section>
              <h2 style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.28)', marginBottom: 12 }}>Reviews</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {reviews.slice(0, 5).map((r) => (
                  <div key={r.id} style={{ borderRadius: 16, padding: '16px 18px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Customer</span>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                              fill={i < (r.rating ?? 0) ? accent : 'none'}
                              stroke={accent}
                              strokeWidth="1.5"
                            />
                          </svg>
                        ))}
                      </div>
                    </div>
                    {r.comment && <p style={{ fontSize: 13, lineHeight: 1.5, color: 'rgba(255,255,255,0.55)' }}>{r.comment}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </motion.div>
  )
}
