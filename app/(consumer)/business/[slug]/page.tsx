'use client'

import { useRef, useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import BusinessHero from '@/components/consumer/BusinessHero'
import ServiceRow from '@/components/consumer/ServiceRow'
import { MOCK_BUSINESS_MAP } from '@/lib/mock-businesses'
import { createClient } from '@/lib/supabase/client'

// ─── Local types for extended DB fields ─────────────────────────────────────

interface StaffMember {
  id: string
  name: string
  title: string | null
  bio: string | null
  avatar_url: string | null
  sort_order: number | null
}

interface ReviewItem {
  id: string
  rating: number | null
  comment: string | null
  business_response: string | null
  created_at: string | null
}

interface BusinessData {
  id: string
  address: string | null
  city: string | null
  instagram_handle: string | null
  website: string | null
}

interface HoursRow {
  day_of_week: number
  is_open: boolean | null
  open_time: string | null
  close_time: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TABS = ['Services', 'Team', 'Reviews', 'Info'] as const
type Tab = (typeof TABS)[number]

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })
}

function formatTime12(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 || 12
  return m === 0 ? `${hour}${period}` : `${hour}:${String(m).padStart(2, '0')}${period}`
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ─── StarRow ─────────────────────────────────────────────────────────────────

function StarRow({ rating, size = 14, color }: { rating: number; size?: number; color: string }) {
  return (
    <div style={{ display: 'flex', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = rating >= i ? 1 : rating >= i - 0.5 ? 0.5 : 0
        return (
          <div key={i} style={{ position: 'relative', width: size, height: size, lineHeight: 1 }}>
            <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: size, lineHeight: 1 }}>★</span>
            {filled > 0 && (
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  color,
                  fontSize: size,
                  lineHeight: 1,
                  overflow: 'hidden',
                  width: filled === 1 ? '100%' : '50%',
                  display: 'block',
                }}
              >
                ★
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({
  member,
  size,
  primaryColour,
}: {
  member: StaffMember
  size: number
  primaryColour: string
}) {
  if (member.avatar_url) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={member.avatar_url}
          alt={member.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    )
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        flexShrink: 0,
        background: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: '1px solid rgba(255,255,255,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span style={{ fontSize: size * 0.3, fontWeight: 800, color: primaryColour }}>
        {getInitials(member.name)}
      </span>
    </div>
  )
}

// ─── InfoRow ─────────────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  valueColor,
  href,
}: {
  icon: string
  label: string
  value: string
  valueColor?: string
  href?: string
}) {
  const inner = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '13px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <span style={{ fontSize: 18, width: 24, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{label}</p>
        <p
          style={{
            fontSize: 13,
            color: valueColor ?? 'rgba(255,255,255,0.8)',
            margin: '1px 0 0',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {value}
        </p>
      </div>
    </div>
  )
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
        {inner}
      </a>
    )
  }
  return inner
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function BusinessPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params?.slug as string

  const business = MOCK_BUSINESS_MAP[slug]

  const [isFav, setIsFav] = useState(false)
  const [activeCategory, setActiveCategory] = useState('All')
  const [scrollY, setScrollY] = useState(0)
  const [activeTab, setActiveTab] = useState<Tab>('Services')
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [bizData, setBizData] = useState<BusinessData | null>(null)
  const [hours, setHours] = useState<HoursRow[]>([])
  const [showAllReviews, setShowAllReviews] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const servicesRef = useRef<HTMLDivElement>(null)
  const teamRef = useRef<HTMLDivElement>(null)
  const reviewsRef = useRef<HTMLDivElement>(null)
  const infoRef = useRef<HTMLDivElement>(null)

  // Scroll → parallax
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onScroll = () => setScrollY(el.scrollTop)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // Fetch real Supabase data
  useEffect(() => {
    if (!slug) return
    async function load() {
      const supabase = createClient()
      const { data: biz } = await supabase
        .from('businesses')
        .select('id, address, city, instagram_handle, website')
        .eq('slug', slug)
        .single()
      if (!biz) return
      setBizData(biz)

      const [staffRes, reviewsRes, hoursRes] = await Promise.all([
        supabase
          .from('staff')
          .select('id, name, title, bio, avatar_url, sort_order')
          .eq('business_id', biz.id)
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('reviews')
          .select('id, rating, comment, business_response, created_at')
          .eq('business_id', biz.id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('business_hours')
          .select('day_of_week, is_open, open_time, close_time')
          .eq('business_id', biz.id),
      ])

      if (staffRes.data) setStaff(staffRes.data as unknown as StaffMember[])
      if (reviewsRes.data) setReviews(reviewsRes.data as unknown as ReviewItem[])
      if (hoursRes.data) setHours(hoursRes.data as HoursRow[])
    }
    load()
  }, [slug])

  // IntersectionObserver → active tab
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const sectionMap: Array<{ tab: Tab; ref: React.RefObject<HTMLDivElement> }> = [
      { tab: 'Services', ref: servicesRef },
      { tab: 'Team', ref: teamRef },
      { tab: 'Reviews', ref: reviewsRef },
      { tab: 'Info', ref: infoRef },
    ]
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const found = sectionMap.find((s) => s.ref.current === entry.target)
            if (found) setActiveTab(found.tab)
          }
        }
      },
      { root: container, threshold: 0.3 },
    )
    sectionMap.forEach(({ ref }) => {
      if (ref.current) observer.observe(ref.current)
    })
    return () => observer.disconnect()
  }, [staff.length, reviews.length])

  // Derived review stats
  const avgRating = useMemo(() => {
    if (!reviews.length) return 0
    const sum = reviews.reduce((a, r) => a + (r.rating ?? 0), 0)
    return Math.round((sum / reviews.length) * 10) / 10
  }, [reviews])

  const ratingBreakdown = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    reviews.forEach((r) => {
      if (r.rating) counts[r.rating] = (counts[r.rating] ?? 0) + 1
    })
    return counts
  }, [reviews])

  // Hero pills — swap first pill for real rating when available
  const heroPills = useMemo(() => {
    if (!business) return []
    const pills = [...business.pills]
    if (reviews.length > 0) pills[0] = `★ ${avgRating.toFixed(1)} (${reviews.length})`
    return pills
  }, [business, reviews.length, avgRating])

  // Today's business hours
  const todayHours = useMemo(() => {
    const dow = new Date().getDay()
    return hours.find((h) => h.day_of_week === dow) ?? null
  }, [hours])

  const filteredServices = useMemo(() => {
    if (!business) return []
    if (activeCategory === 'All') return business.services
    return business.services.filter((s) => s.category === activeCategory)
  }, [business, activeCategory])

  if (!business) {
    return (
      <div
        style={{
          background: '#080808',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        }}
      >
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15 }}>Business not found</p>
        <button
          onClick={() => router.back()}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 10,
            padding: '8px 18px',
            color: '#fff',
            fontSize: 14,
          }}
        >
          Go back
        </button>
      </div>
    )
  }

  const serviceCategories = ['All', ...business.categories]
  const firstServiceSlug = business.services[0] ? slugify(business.services[0].name) : 'service'
  const pc = business.primaryColour
  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3)

  const glassCard: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 14,
  }

  function scrollToTab(tab: Tab) {
    setActiveTab(tab)
    const refMap: Record<Tab, React.RefObject<HTMLDivElement>> = {
      Services: servicesRef,
      Team: teamRef,
      Reviews: reviewsRef,
      Info: infoRef,
    }
    const target = refMap[tab].current
    const container = containerRef.current
    if (target && container) {
      container.scrollTo({ top: target.offsetTop - 48, behavior: 'smooth' })
    }
  }

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: business.name,
          text: `Book at ${business.name} on OpenBook`,
          url: window.location.href,
        })
      } else {
        await navigator.clipboard.writeText(window.location.href)
        setToast('Link copied!')
        setTimeout(() => setToast(null), 2000)
      }
    } catch {
      // user cancelled or clipboard failed silently
    }
  }

  return (
    <div
      ref={containerRef}
      style={{
        height: '100vh',
        overflowY: 'auto',
        background: '#080808',
        position: 'relative',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* ── Hero ── */}
      <BusinessHero
        business={{ ...business, pills: heroPills }}
        scrollY={scrollY}
        isFav={isFav}
        onBack={() => router.back()}
        onToggleFav={() => setIsFav((v) => !v)}
      />

      {/* ── Tab bar ── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => scrollToTab(tab)}
              style={{
                flex: 1,
                height: 44,
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2px solid #D4AF37' : '2px solid transparent',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.45)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'color 0.15s',
                padding: 0,
              }}
            >
              {tab}
            </button>
          )
        })}
      </div>

      {/* ── Body ── */}
      <div style={{ background: '#080808', padding: '20px 16px 140px' }}>

        {/* ════════════════ SERVICES ════════════════ */}
        <div ref={servicesRef} id="services">
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: pc,
              margin: '0 0 12px',
            }}
          >
            Services
          </p>

          {/* Category chips */}
          <div className="flex gap-2 overflow-x-auto scrollbar-none mb-3">
            {serviceCategories.map((cat) => {
              const isActive = activeCategory === cat
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="active:scale-95 transition-transform duration-100"
                  style={{
                    flexShrink: 0,
                    height: 28,
                    paddingLeft: 13,
                    paddingRight: 13,
                    borderRadius: 20,
                    background: isActive ? pc : 'rgba(255,255,255,0.08)',
                    border: isActive ? 'none' : '1px solid rgba(255,255,255,0.13)',
                    color: isActive ? '#000' : 'rgba(255,255,255,0.55)',
                    fontSize: 12,
                    fontWeight: isActive ? 700 : 500,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                  }}
                >
                  {cat}
                </button>
              )
            })}
          </div>

          {/* Service rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
            {filteredServices.length === 0 ? (
              <p
                style={{
                  color: 'rgba(255,255,255,0.35)',
                  fontSize: 13,
                  textAlign: 'center',
                  padding: '16px 0',
                }}
              >
                No services in this category
              </p>
            ) : (
              filteredServices.map((service) => (
                <ServiceRow
                  key={service.name}
                  service={service}
                  primaryColour={pc}
                  onClick={() => {
                    const qs = new URLSearchParams({
                      business: business.name,
                      price: String(service.price).replace(/[^0-9.]/g, ''),
                      colour: pc,
                    })
                    router.push(`/booking/${slugify(service.name)}?${qs.toString()}`)
                  }}
                />
              ))
            )}
          </div>

          {/* Packages label */}
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: pc,
              margin: '0 0 12px',
            }}
          >
            Packages
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {business.packages.map((pkg) => (
              <div
                key={pkg.name}
                style={{
                  ...glassCard,
                  borderRadius: 12,
                  padding: '13px 14px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      color: pkg.tagColour,
                      margin: '0 0 2px',
                    }}
                  >
                    {pkg.tag}
                  </p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>
                    {pkg.name}
                  </p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', margin: '1px 0 0' }}>
                    {pkg.sub}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 17, fontWeight: 900, color: '#fff', margin: 0 }}>{pkg.price}</p>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#10b981', margin: '2px 0 0' }}>
                    {pkg.save}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ════════════════ TEAM ════════════════ */}
        {staff.length > 0 && (
          <div ref={teamRef} id="team" style={{ marginTop: 36 }}>
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: pc,
                margin: '0 0 14px',
              }}
            >
              Team
            </p>

            {staff.length === 1 ? (
              /* Single staff — full-width horizontal card */
              <div style={{ ...glassCard, padding: 16, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <Avatar member={staff[0]} size={56} primaryColour={pc} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>
                    {staff[0].name}
                  </p>
                  {staff[0].title && (
                    <p
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: pc,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        margin: '2px 0 0',
                      }}
                    >
                      {staff[0].title}
                    </p>
                  )}
                  {staff[0].bio && (
                    <p
                      style={{
                        fontSize: 12,
                        color: 'rgba(255,255,255,0.5)',
                        margin: '8px 0 0',
                        lineHeight: 1.5,
                      }}
                    >
                      {staff[0].bio}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              /* Multiple staff — horizontal scroll */
              <div
                className="scrollbar-none"
                style={{
                  display: 'flex',
                  gap: 12,
                  overflowX: 'auto',
                  margin: '0 -16px',
                  paddingLeft: 16,
                  paddingRight: 16,
                  paddingBottom: 4,
                }}
              >
                {staff.map((member) => (
                  <div
                    key={member.id}
                    style={{ ...glassCard, width: 200, flexShrink: 0, padding: 16 }}
                  >
                    <Avatar member={member} size={56} primaryColour={pc} />
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '10px 0 0' }}>
                      {member.name}
                    </p>
                    {member.title && (
                      <p
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: pc,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          margin: '2px 0 0',
                        }}
                      >
                        {member.title}
                      </p>
                    )}
                    {member.bio && (
                      <p
                        style={
                          {
                            fontSize: 12,
                            color: 'rgba(255,255,255,0.5)',
                            margin: '8px 0 0',
                            lineHeight: 1.5,
                            display: '-webkit-box',
                            WebkitBoxOrient: 'vertical',
                            WebkitLineClamp: 3,
                            overflow: 'hidden',
                          } as React.CSSProperties
                        }
                      >
                        {member.bio}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Placeholder ref when team section not rendered */}
        {staff.length === 0 && <div ref={teamRef} id="team" />}

        {/* ════════════════ REVIEWS ════════════════ */}
        {reviews.length > 0 && (
          <div ref={reviewsRef} id="reviews" style={{ marginTop: 36 }}>
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: pc,
                margin: '0 0 14px',
              }}
            >
              Reviews
            </p>

            {/* Rating summary */}
            <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 42, fontWeight: 900, color: '#fff', margin: 0, lineHeight: 1 }}>
                  {avgRating.toFixed(1)}
                </p>
                <div style={{ marginTop: 5 }}>
                  <StarRow rating={avgRating} size={14} color={pc} />
                </div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '5px 0 0' }}>
                  {reviews.length} reviews
                </p>
              </div>
              <div style={{ flex: 1 }}>
                {[5, 4, 3, 2, 1].map((star) => (
                  <div
                    key={star}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}
                  >
                    <span
                      style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', width: 8, textAlign: 'right', flexShrink: 0 }}
                    >
                      {star}
                    </span>
                    <div
                      style={{
                        flex: 1,
                        height: 4,
                        borderRadius: 2,
                        background: 'rgba(255,255,255,0.1)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          borderRadius: 2,
                          background: pc,
                          width: `${((ratingBreakdown[star] ?? 0) / reviews.length) * 100}%`,
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                    <span
                      style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', width: 16, textAlign: 'right', flexShrink: 0 }}
                    >
                      {ratingBreakdown[star] ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Review cards */}
            {displayedReviews.map((review) => (
              <div key={review.id} style={{ ...glassCard, padding: 14, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* Anon avatar */}
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"
                        fill="rgba(255,255,255,0.4)"
                      />
                    </svg>
                  </div>
                  <p style={{ flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
                    Verified booking
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                    {review.rating != null && (
                      <StarRow rating={review.rating} size={11} color={pc} />
                    )}
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                      {formatDate(review.created_at)}
                    </span>
                  </div>
                </div>

                {review.comment && (
                  <p
                    style={{
                      fontSize: 14,
                      color: 'rgba(255,255,255,0.8)',
                      lineHeight: 1.6,
                      margin: '10px 0 0',
                    }}
                  >
                    {review.comment}
                  </p>
                )}

                {review.business_response && (
                  <div
                    style={{ marginTop: 10, paddingLeft: 12, borderLeft: `2px solid ${pc}` }}
                  >
                    <p
                      style={{ fontSize: 11, fontWeight: 600, color: pc, margin: '0 0 3px' }}
                    >
                      Response from {business.name}
                    </p>
                    <p
                      style={{
                        fontSize: 13,
                        color: 'rgba(255,255,255,0.55)',
                        margin: 0,
                        lineHeight: 1.5,
                      }}
                    >
                      {review.business_response}
                    </p>
                  </div>
                )}
              </div>
            ))}

            {reviews.length > 3 && !showAllReviews && (
              <button
                onClick={() => setShowAllReviews(true)}
                style={{
                  width: '100%',
                  height: 44,
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: 4,
                }}
              >
                See all {reviews.length} reviews
              </button>
            )}
          </div>
        )}

        {/* Placeholder ref when reviews section not rendered */}
        {reviews.length === 0 && <div ref={reviewsRef} id="reviews" />}

        {/* ════════════════ INFO ════════════════ */}
        <div ref={infoRef} id="info" style={{ marginTop: 36 }}>
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: pc,
              margin: '0 0 14px',
            }}
          >
            Info
          </p>

          <div style={{ ...glassCard, overflow: 'hidden' }}>
            {bizData?.address || bizData?.city ? (
              <InfoRow
                icon="📍"
                label="Location"
                value={[bizData.address, bizData.city].filter(Boolean).join(', ')}
              />
            ) : null}

            {todayHours ? (
              <InfoRow
                icon="🕐"
                label="Hours today"
                value={
                  todayHours.is_open && todayHours.close_time
                    ? `Open · closes at ${formatTime12(todayHours.close_time)}`
                    : 'Closed today'
                }
                valueColor={todayHours.is_open ? '#10b981' : '#f87171'}
              />
            ) : null}

            {bizData?.instagram_handle ? (
              <InfoRow
                icon="📸"
                label="Instagram"
                value={`@${bizData.instagram_handle}`}
                href={`https://instagram.com/${bizData.instagram_handle}`}
              />
            ) : null}

            {bizData?.website ? (
              <InfoRow
                icon="🌐"
                label="Website"
                value={bizData.website}
                href={bizData.website}
              />
            ) : null}

            <InfoRow icon="⚡" label="Booking" value="Book via OpenBook · openbook.ie" />
          </div>

          {/* Share button */}
          <button
            onClick={handleShare}
            style={{
              ...glassCard,
              width: '100%',
              height: 44,
              color: 'rgba(255,255,255,0.7)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"
                fill="rgba(255,255,255,0.7)"
              />
            </svg>
            Share this page
          </button>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 120,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(10,10,10,0.9)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 24,
            padding: '8px 20px',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            zIndex: 100,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {toast}
        </div>
      )}

      {/* ── Sticky CTA ── */}
      <div
        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40, pointerEvents: 'none' }}
      >
        <div
          style={{
            background:
              'linear-gradient(to top, #080808 55%, rgba(8,8,8,0.85) 80%, transparent 100%)',
            padding: '28px 20px 40px',
            pointerEvents: 'all',
          }}
        >
          <button
            onClick={() => {
              const firstService = business.services[0]
              const qs = new URLSearchParams({
                business: business.name,
                price: firstService ? String(firstService.price).replace(/[^0-9.]/g, '') : '',
                colour: pc,
              })
              router.push(`/booking/${firstServiceSlug}?${qs.toString()}`)
            }}
            className="active:scale-[0.97] transition-transform duration-150"
            style={{
              width: '100%',
              height: 52,
              borderRadius: 14,
              background: '#D4AF37',
              color: '#000',
              fontSize: 16,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              letterSpacing: '-0.01em',
              boxShadow: '0 4px 24px rgba(212,175,55,0.5)',
            }}
          >
            {business.ctaText}
          </button>
        </div>
      </div>
    </div>
  )
}
