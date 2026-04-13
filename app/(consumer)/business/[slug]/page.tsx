'use client'

import { useRef, useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import BusinessHero from '@/components/consumer/BusinessHero'
import ServiceRow from '@/components/consumer/ServiceRow'
import { MOCK_BUSINESS_MAP } from '@/lib/mock-businesses'

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function BusinessPage() {
  const router = useRouter()
  const params = useParams()
  const slug   = params?.slug as string

  const business = MOCK_BUSINESS_MAP[slug]

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
      <div
        style={{
          background: `linear-gradient(to bottom, ${business.primaryColour}14 0px, ${business.primaryColour}08 200px, #080808 400px)`,
          padding:    '20px 16px 140px',
        }}
      >

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
            background:   'linear-gradient(to top, #080808 55%, rgba(8,8,8,0.85) 80%, transparent 100%)',
            padding:      '28px 20px 40px',
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
