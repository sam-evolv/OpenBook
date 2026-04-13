'use client'

import { useRef, useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import BusinessHero from '@/components/consumer/BusinessHero'
import ServiceRow from '@/components/consumer/ServiceRow'
import { MOCK_BUSINESS_MAP } from '@/lib/mock-businesses'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

/* ── Flash sale data shape ─────────────────────────────────────────────────── */
interface ActiveFlashSale {
  id:                   string
  sale_price_cents:     number
  original_price_cents: number
  discount_percent:     number
  slot_time:            string
  expires_at:           string
  message:              string | null
  services: {
    id:               string
    name:             string
    duration_minutes: number
    colour:           string | null
  } | null
}

/* ── Countdown hook ─────────────────────────────────────────────────────────── */
function useCountdown(expiresAt: string | undefined): string {
  const [label, setLabel] = useState('')

  useEffect(() => {
    if (!expiresAt) return
    function update() {
      const diff = new Date(expiresAt!).getTime() - Date.now()
      if (diff <= 0) { setLabel('Expired'); return }
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1000)
      setLabel(
        h > 0
          ? `${h}h ${String(m).padStart(2, '0')}m`
          : `${m}m ${String(s).padStart(2, '0')}s`
      )
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  return label
}

/* ── Flash Sale Banner ─────────────────────────────────────────────────────── */
function FlashSaleBanner({
  sale,
  primaryColour,
  onBook,
}: {
  sale:          ActiveFlashSale
  primaryColour: string
  onBook:        () => void
}) {
  const countdown = useCountdown(sale.expires_at)
  const service   = sale.services

  return (
    <div
      onClick={onBook}
      style={{
        background:    'linear-gradient(135deg, rgba(212,175,55,0.2) 0%, rgba(212,175,55,0.05) 100%)',
        border:        '1px solid rgba(212,175,55,0.4)',
        borderRadius:  14,
        padding:       '14px 16px',
        display:       'flex',
        alignItems:    'center',
        gap:           12,
        marginBottom:  12,
        cursor:        'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* ⚡ icon */}
      <span style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>⚡</span>

      {/* Middle content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin:        0,
            fontSize:      13,
            fontWeight:    800,
            color:         '#D4AF37',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            lineHeight:    1.2,
          }}
        >
          Flash Sale
        </p>
        <p
          style={{
            margin:     '2px 0',
            fontSize:   15,
            fontWeight: 700,
            color:      '#fff',
            lineHeight: 1.2,
            overflow:   'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {service?.name ?? 'Service'}
        </p>
        <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.3 }}>
          {formatPrice(sale.sale_price_cents)} instead of {formatPrice(sale.original_price_cents)}
          {countdown ? ` · Expires in ${countdown}` : ''}
        </p>
      </div>

      {/* "Book now →" */}
      <span
        style={{
          fontSize:    13,
          fontWeight:  700,
          color:       '#D4AF37',
          flexShrink:  0,
          whiteSpace:  'nowrap',
        }}
      >
        Book now →
      </span>
    </div>
  )
}

/* ── Page ──────────────────────────────────────────────────────────────────── */
export default function BusinessPage() {
  const router = useRouter()
  const params = useParams()
  const slug   = params?.slug as string

  const business = MOCK_BUSINESS_MAP[slug]

  const [isFav,          setIsFav]          = useState(false)
  const [activeCategory, setActiveCategory] = useState('All')
  const [scrollY,        setScrollY]        = useState(0)
  const [flashSale,      setFlashSale]      = useState<ActiveFlashSale | null>(null)
  const [logoUrl,        setLogoUrl]        = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  /* ── Scroll tracking ── */
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const handleScroll = () => setScrollY(container.scrollTop)
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  /* ── Fetch business data (logo + flash sale) ── */
  useEffect(() => {
    let cancelled = false
    async function fetchBusinessData() {
      try {
        const supabase = createClient()
        // Look up real business by slug — get both id and logo_url in one query
        const { data: biz } = await supabase
          .from('businesses')
          .select('id, logo_url')
          .eq('slug', slug)
          .single()

        if (cancelled || !biz) return

        // Set logo immediately
        if (biz.logo_url) setLogoUrl(biz.logo_url)

        // Fetch active flash sale
        const res  = await fetch(`/api/flash-sales/active?businessId=${biz.id}`)
        if (cancelled || !res.ok) return
        const json = await res.json()
        if (!cancelled && json.data && json.data.length > 0) {
          setFlashSale(json.data[0])
        }
      } catch {
        // Silently ignore — these are progressive enhancements
      }
    }
    fetchBusinessData()
    return () => { cancelled = true }
  }, [slug])

  const filteredServices = useMemo(() => {
    if (!business) return []
    if (activeCategory === 'All') return business.services
    return business.services.filter((s) => s.category === activeCategory)
  }, [business, activeCategory])

  if (!business) {
    return (
      <div
        style={{
          background:     '#080808',
          minHeight:      '100vh',
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          gap:            12,
        }}
      >
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15 }}>Business not found</p>
        <button
          onClick={() => router.back()}
          style={{
            background:   'rgba(255,255,255,0.1)',
            border:       '1px solid rgba(255,255,255,0.18)',
            borderRadius: 10,
            padding:      '8px 18px',
            color:        '#fff',
            fontSize:     14,
          }}
        >
          Go back
        </button>
      </div>
    )
  }

  const serviceCategories = ['All', ...business.categories]
  const firstServiceSlug  = business.services[0] ? slugify(business.services[0].name) : 'service'

  function handleFlashSaleBook() {
    if (!flashSale?.services) return
    const qs = new URLSearchParams({
      business:       business.name,
      price:          String((flashSale.sale_price_cents / 100).toFixed(2)),
      colour:         business.primaryColour,
      flashSaleId:    flashSale.id,
      flashSalePrice: String(flashSale.sale_price_cents),
    })
    router.push(`/booking/${slugify(flashSale.services.name)}?${qs.toString()}`)
  }

  return (
    <div
      ref={containerRef}
      style={{
        height:                   '100vh',
        overflowY:                'auto',
        background:               '#080808',
        position:                 'relative',
        WebkitOverflowScrolling:  'touch',
      }}
    >
      <BusinessHero
        business={business}
        scrollY={scrollY}
        isFav={isFav}
        onBack={() => router.back()}
        onToggleFav={() => setIsFav((v) => !v)}
        logoUrl={logoUrl}
      />

      {/* ── Body ── */}
      <div style={{ background: '#080808', padding: '20px 16px 140px' }}>

        {/* Services label */}
        <p
          style={{
            fontSize:        10,
            fontWeight:      700,
            textTransform:   'uppercase',
            letterSpacing:   '0.1em',
            color:           business.primaryColour,
            margin:          '0 0 12px',
          }}
        >
          Services
        </p>

        {/* ⚡ Flash Sale banner — shown above category chips when active */}
        {flashSale && (
          <FlashSaleBanner
            sale={flashSale}
            primaryColour={business.primaryColour}
            onBook={handleFlashSaleBook}
          />
        )}

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
                  flexShrink:   0,
                  height:       28,
                  paddingLeft:  13,
                  paddingRight: 13,
                  borderRadius: 20,
                  background:   isActive ? business.primaryColour : 'rgba(255,255,255,0.08)',
                  border:       isActive ? 'none' : '1px solid rgba(255,255,255,0.13)',
                  color:        isActive ? '#000' : 'rgba(255,255,255,0.55)',
                  fontSize:     12,
                  fontWeight:   isActive ? 700 : 500,
                  whiteSpace:   'nowrap',
                  cursor:       'pointer',
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
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
              No services in this category
            </p>
          ) : (
            filteredServices.map((service) => (
              <ServiceRow
                key={service.name}
                service={service}
                onClick={() => {
                  const qs = new URLSearchParams({
                    business: business.name,
                    price:    String(service.price).replace(/[^0-9.]/g, ''),
                    colour:   business.primaryColour,
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
            fontSize:      10,
            fontWeight:    700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color:         business.primaryColour,
            margin:        '0 0 12px',
          }}
        >
          Packages
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {business.packages.map((pkg) => (
            <div
              key={pkg.name}
              style={{
                background:           'rgba(255,255,255,0.06)',
                backdropFilter:       'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                border:               '1px solid rgba(255,255,255,0.1)',
                borderRadius:         12,
                padding:              '13px 14px',
                display:              'flex',
                alignItems:           'center',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize:      10,
                    fontWeight:    800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    color:         pkg.tagColour,
                    margin:        '0 0 2px',
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
                <p style={{ fontSize: 17, fontWeight: 900, color: '#fff', margin: 0 }}>
                  {pkg.price}
                </p>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#10b981', margin: '2px 0 0' }}>
                  {pkg.save}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sticky CTA ── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40, pointerEvents: 'none' }}>
        <div
          style={{
            background:    'linear-gradient(to top, #080808 55%, rgba(8,8,8,0.85) 80%, transparent 100%)',
            padding:       '28px 20px 40px',
            pointerEvents: 'all',
          }}
        >
          <button
            onClick={() => {
              const firstService = business.services[0]
              const qs = new URLSearchParams({
                business: business.name,
                price:    firstService ? String(firstService.price).replace(/[^0-9.]/g, '') : '',
                colour:   business.primaryColour,
              })
              router.push(`/booking/${firstServiceSlug}?${qs.toString()}`)
            }}
            className="active:scale-[0.97] transition-transform duration-150"
            style={{
              width:        '100%',
              height:       52,
              borderRadius: 16,
              background:   business.primaryColour,
              color:        '#000',
              fontSize:     16,
              fontWeight:   800,
              border:       'none',
              cursor:       'pointer',
              letterSpacing: '-0.01em',
            }}
          >
            {business.ctaText}
          </button>
        </div>
      </div>
    </div>
  )
}
