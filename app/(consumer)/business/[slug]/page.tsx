'use client'

import { useRef, useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import BusinessHero from '@/components/consumer/BusinessHero'
import ServiceRow from '@/components/consumer/ServiceRow'
import { MOCK_BUSINESS_MAP, MockBusiness } from '@/lib/mock-businesses'
import { createClient } from '@/lib/supabase/client'

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

/* ── DB-shape ── */
interface DbBusiness {
  id: string
  name: string
  slug: string
  category: string
  description: string | null
  address: string | null
  city: string | null
  primary_colour: string | null
  secondary_colour: string | null
  hero_image_url: string | null
}

interface DbService {
  id: string
  name: string
  duration_minutes: number
  price_cents: number
  colour: string | null
  is_active: boolean | null
  sort_order: number | null
}

interface DbPackage {
  id: string
  name: string
  tagline: string | null
  price_cents: number
  session_count: number | null
}

/* ── Map DB → display format the components expect ── */
function mapDbBusiness(b: DbBusiness, services: DbService[], packages: DbPackage[]): MockBusiness {
  const colour = b.primary_colour ?? '#D4AF37'

  // Use the business category for all services (services table has no category column)
  const cats = [b.category]

  const mappedServices = services.map((s) => ({
    name:     s.name,
    duration: `${s.duration_minutes} min`,
    price:    `€${(s.price_cents / 100).toFixed(0)}`,
    colour:   s.colour ?? colour,
    category: b.category,
    // carry DB id for booking URL
    _dbId:    s.id,
  }))

  const mappedPackages = packages.map((p) => ({
    tag:      p.session_count ? `${p.session_count} sessions` : 'Package',
    tagColour: colour,
    name:     p.name,
    sub:      p.tagline ?? '',
    price:    `€${(p.price_cents / 100).toFixed(0)}`,
    save:     '',
  }))

  // derive hero gradient from colour
  const heroGradient = `linear-gradient(160deg, ${colour}44 0%, #080808 60%)`

  // Split name into two lines for hero
  const words    = b.name.split(' ')
  const mid      = Math.ceil(words.length / 2)
  const nameLine1 = words.slice(0, mid).join(' ')
  const nameLine2 = words.slice(mid).join(' ')

  const initials = words.map((w) => w[0]?.toUpperCase() ?? '').slice(0, 2).join('')

  return {
    slug:            b.slug,
    name:            b.name,
    nameLine1,
    nameLine2,
    primaryColour:   colour,
    secondaryColour: b.secondary_colour ?? colour,
    eyebrow:         b.category,
    meta:            [b.address, b.city].filter(Boolean).join(', ') || b.city || 'Cork, Ireland',
    pills:           cats.length > 0 ? cats : [b.category],
    categories:      cats.length > 0 ? cats : [b.category],
    services:        mappedServices as unknown as MockBusiness['services'],
    packages:        mappedPackages,
    ctaText:         'Book now',
    heroImage:       b.hero_image_url ?? '',
    heroFilter:      'brightness(0.6)',
    heroGradient,
    initials,
    type:            b.category,
    rating:          '5.0',
    priceRange:      '€€',
    img:             b.hero_image_url ?? '',
    // carry DB id so booking URLs can include it
    _dbId:           b.id,
  } as unknown as MockBusiness & { _dbId: string }
}

export default function BusinessPage() {
  const router = useRouter()
  const params = useParams()
  const slug   = params?.slug as string

  const [business,       setBusinessData]   = useState<(MockBusiness & { _dbId?: string }) | null>(null)
  const [businessDbId,   setBusinessDbId]   = useState<string | null>(null)
  const [serviceDbIds,   setServiceDbIds]   = useState<Record<string, string>>({}) // name → db id
  const [loading,        setLoading]        = useState(true)
  const [isFav,          setIsFav]          = useState(false)
  const [activeCategory, setActiveCategory] = useState('All')
  const [scrollY,        setScrollY]        = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const handleScroll = () => setScrollY(container.scrollTop)
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  /* ── Load business data ── */
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const supabase = createClient()
        const { data: biz } = await supabase
          .from('businesses')
          .select('id, name, slug, category, description, address, city, primary_colour, secondary_colour, hero_image_url')
          .eq('slug', slug)
          .eq('is_live', true)
          .single()

        if (!cancelled && biz) {
          const [{ data: svcs }, { data: pkgs }] = await Promise.all([
            supabase
              .from('services')
              .select('id, name, duration_minutes, price_cents, colour, is_active, sort_order')
              .eq('business_id', biz.id)
              .eq('is_active', true)
              .order('sort_order'),
            supabase
              .from('packages')
              .select('id, name, tagline, price_cents, session_count')
              .eq('business_id', biz.id)
              .eq('is_active', true),
          ])

          if (!cancelled) {
            const mapped = mapDbBusiness(biz, svcs ?? [], pkgs ?? [])
            setBusinessData(mapped)
            setBusinessDbId(biz.id)

            // Build service name → db id map
            const idMap: Record<string, string> = {}
            for (const s of (svcs ?? [])) {
              idMap[s.name] = s.id
            }
            setServiceDbIds(idMap)
          }
        } else if (!cancelled) {
          // Fall back to mock
          const mock = MOCK_BUSINESS_MAP[slug]
          setBusinessData(mock ?? null)
        }
      } catch {
        if (!cancelled) {
          const mock = MOCK_BUSINESS_MAP[slug]
          setBusinessData(mock ?? null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [slug])

  const filteredServices = useMemo(() => {
    if (!business) return []
    if (activeCategory === 'All') return business.services
    return business.services.filter((s) => s.category === activeCategory)
  }, [business, activeCategory])

  if (loading) {
    return (
      <div
        style={{
          background:     '#080808',
          minHeight:      '100vh',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width:        48,
            height:       48,
            borderRadius: 24,
            border:       '3px solid rgba(212,175,55,0.3)',
            borderTopColor: '#D4AF37',
            animation:    'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

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
            cursor:       'pointer',
          }}
        >
          Go back
        </button>
      </div>
    )
  }

  const serviceCategories = ['All', ...business.categories]
  const firstService      = business.services[0]
  const firstServiceSlug  = firstService ? slugify(firstService.name) : 'service'

  function buildBookingQs(service: MockBusiness['services'][number]): string {
    const qs: Record<string, string> = {
      business: business!.name,
      price:    String(service.price).replace(/[^0-9.]/g, ''),
      colour:   business!.primaryColour,
    }
    // Include DB ids when available (from Supabase fetch)
    const svcDbId = serviceDbIds[service.name]
    if (businessDbId) qs.businessId = businessDbId
    if (svcDbId)      qs.serviceDbId = svcDbId
    return new URLSearchParams(qs).toString()
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
                  router.push(`/booking/${slugify(service.name)}?${buildBookingQs(service)}`)
                }}
              />
            ))
          )}
        </div>

        {/* Packages label */}
        {business.packages.length > 0 && (
          <>
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
                    display:             'flex',
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
                    {pkg.save && (
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#10b981', margin: '2px 0 0' }}>
                        {pkg.save}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Sticky CTA ── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40, pointerEvents: 'none' }}>
        <div
          style={{
            background:   'linear-gradient(to top, #080808 55%, rgba(8,8,8,0.85) 80%, transparent 100%)',
            padding:      '28px 20px 40px',
            pointerEvents: 'all',
          }}
        >
          <button
            onClick={() => {
              if (!firstService) return
              router.push(`/booking/${firstServiceSlug}?${buildBookingQs(firstService)}`)
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
