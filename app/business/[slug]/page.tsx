'use client'

import { useRef, useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { MOCK_BUSINESS_MAP } from '@/lib/mock-businesses'

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function BusinessPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params?.slug as string

  const business = MOCK_BUSINESS_MAP[slug]

  const [isFav, setIsFav] = useState(false)
  const [activeCategory, setActiveCategory] = useState('All')
  const [scrollY, setScrollY] = useState(0)
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

  const firstServiceSlug = business.services[0] ? slugify(business.services[0].name) : 'service'
  const serviceCategories = ['All', ...business.categories]

  return (
    <div
      ref={containerRef}
      style={{
        height: '100vh',
        overflowY: 'auto',
        background: '#080808',
        position: 'relative',
        // Smooth scroll performance
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* ── HERO ── */}
      <div style={{ height: 280, position: 'relative', overflow: 'hidden', flexShrink: 0 }}>

        {/* Background image (parallax layer) */}
        <div
          style={{
            position: 'absolute',
            top: -24,
            left: 0,
            right: 0,
            bottom: -24,
            backgroundImage: `url(${business.heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: business.heroFilter,
            transform: `translateY(${scrollY * 0.22}px)`,
            zIndex: 0,
          }}
        />

        {/* Gradient overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: business.heroGradient,
            zIndex: 1,
          }}
        />

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="active:scale-90 transition-transform duration-150"
          style={{
            position: 'absolute',
            top: 54,
            left: 20,
            zIndex: 3,
            width: 34,
            height: 34,
            borderRadius: 17,
            background: 'rgba(0,0,0,0.38)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid rgba(255,255,255,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronLeft size={18} color="white" strokeWidth={2.2} />
        </button>

        {/* Favourite button */}
        <button
          onClick={() => setIsFav((v) => !v)}
          className="active:scale-90 transition-transform duration-150"
          style={{
            position: 'absolute',
            top: 54,
            right: 20,
            zIndex: 3,
            width: 34,
            height: 34,
            borderRadius: 17,
            background: 'rgba(0,0,0,0.38)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid rgba(255,255,255,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Star
            size={16}
            fill={isFav ? '#D4AF37' : 'none'}
            color={isFav ? '#D4AF37' : 'rgba(255,255,255,0.9)'}
            strokeWidth={isFav ? 0 : 1.8}
          />
        </button>

        {/* Hero content */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '0 20px 18px',
            zIndex: 2,
          }}
        >
          {/* Eyebrow */}
          <p
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: business.primaryColour,
              margin: '0 0 3px',
            }}
          >
            {business.eyebrow}
          </p>

          {/* Name line 1 */}
          <h1
            style={{
              fontSize: 29,
              fontWeight: 900,
              color: '#fff',
              letterSpacing: '-0.03em',
              lineHeight: 0.95,
              margin: 0,
            }}
          >
            {business.nameLine1}
          </h1>

          {/* Name line 2 */}
          <h1
            style={{
              fontSize: 29,
              fontWeight: 900,
              color: business.primaryColour,
              letterSpacing: '-0.03em',
              lineHeight: 0.95,
              marginBottom: 9,
            }}
          >
            {business.nameLine2}
          </h1>

          {/* Meta */}
          <p
            style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.52)',
              margin: '0 0 10px',
            }}
          >
            {business.meta}
          </p>

          {/* Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {business.pills.map((pill) => (
              <span
                key={pill}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 20,
                  padding: '4px 10px',
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.78)',
                  fontWeight: 500,
                }}
              >
                {pill}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div
        style={{
          background: '#080808',
          padding: '20px 16px 140px',
        }}
      >
        {/* ── Services ── */}
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: business.primaryColour,
            margin: '0 0 12px',
          }}
        >
          Services
        </p>

        {/* Service category chips */}
        <div
          className="flex gap-2 overflow-x-auto scrollbar-none"
          style={{ marginBottom: 14 }}
        >
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
                  background: isActive ? business.primaryColour : 'rgba(255,255,255,0.08)',
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
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
              No services in this category
            </p>
          ) : (
            filteredServices.map((service) => (
              <button
                key={service.name}
                onClick={() => router.push(`/booking/${slugify(service.name)}`)}
                className="text-left active:scale-[0.98] transition-transform duration-150"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(14px)',
                  WebkitBackdropFilter: 'blur(14px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  padding: '13px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                {/* Colour dot */}
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    background: service.colour,
                    flexShrink: 0,
                  }}
                />

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 13.5,
                      fontWeight: 700,
                      color: '#fff',
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {service.name}
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: 'rgba(255,255,255,0.42)',
                      margin: '1px 0 0',
                    }}
                  >
                    {service.duration}
                  </p>
                </div>

                {/* Price */}
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 900,
                    color: '#fff',
                    flexShrink: 0,
                  }}
                >
                  {service.price}
                </span>

                {/* Chevron */}
                <ChevronRight size={14} color="rgba(255,255,255,0.32)" strokeWidth={2} />
              </button>
            ))
          )}
        </div>

        {/* ── Packages ── */}
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: business.primaryColour,
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
                background: 'rgba(255,255,255,0.06)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                padding: '13px 14px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {/* Left */}
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
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#fff',
                    margin: 0,
                  }}
                >
                  {pkg.name}
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.42)',
                    margin: '1px 0 0',
                  }}
                >
                  {pkg.sub}
                </p>
              </div>

              {/* Right */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p
                  style={{
                    fontSize: 17,
                    fontWeight: 900,
                    color: '#fff',
                    margin: 0,
                  }}
                >
                  {pkg.price}
                </p>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#10b981',
                    margin: '2px 0 0',
                  }}
                >
                  {pkg.save}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── STICKY CTA ── */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            background: 'linear-gradient(to top, #080808 55%, rgba(8,8,8,0.85) 80%, transparent 100%)',
            padding: '28px 20px 40px',
            pointerEvents: 'all',
          }}
        >
          <button
            onClick={() => router.push(`/booking/${firstServiceSlug}`)}
            className="active:scale-[0.97] transition-transform duration-150"
            style={{
              width: '100%',
              height: 52,
              borderRadius: 16,
              background: business.primaryColour,
              color: '#000',
              fontSize: 16,
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
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
