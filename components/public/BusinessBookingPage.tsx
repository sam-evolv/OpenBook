'use client'

import { useState } from 'react'
import type { Business, Service } from '@/lib/types'
import { formatPrice, getDurationLabel } from '@/lib/utils'
import SlotPicker from './SlotPicker'

interface Review {
  id: string
  rating: number | null
  comment: string | null
  created_at: string | null
  customers: { name: string } | null
}

interface StaffMember {
  id: string
  name: string
  avatar_url: string | null
}

interface Props {
  business: Business
  services: Service[]
  reviews: Review[]
  staff: StaffMember[]
  avgRating: number | null
}

export default function BusinessBookingPage({ business, services, reviews, staff, avgRating }: Props) {
  const accent = business.primary_colour ?? '#D4AF37'
  const [selectedService, setSelectedService] = useState<Service | null>(null)

  return (
    <div className="min-h-screen" style={{ background: '#080808', color: 'white' }}>
      {/* Hero */}
      <div
        className="relative h-52 md:h-72"
        style={{
          background: business.hero_image_url
            ? `url(${business.hero_image_url}) center/cover`
            : `linear-gradient(135deg, ${accent}22, ${accent}05)`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#080808]" />
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-16 relative pb-24">
        {/* Business header */}
        <div className="flex items-end gap-4 mb-8">
          {business.logo_url ? (
            <img
              src={business.logo_url}
              alt={business.name}
              className="w-20 h-20 rounded-2xl object-cover ring-4 ring-[#080808] shrink-0"
            />
          ) : (
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black ring-4 ring-[#080808] shrink-0"
              style={{ background: accent, color: '#000' }}
            >
              {business.name[0]}
            </div>
          )}
          <div className="pb-1">
            <h1 className="text-2xl font-black text-white leading-tight">{business.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {business.category}
              </span>
              {business.city && (
                <>
                  <span style={{ color: 'rgba(255,255,255,0.25)' }}>·</span>
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {business.city}
                  </span>
                </>
              )}
              {avgRating !== null && (
                <>
                  <span style={{ color: 'rgba(255,255,255,0.25)' }}>·</span>
                  <span className="text-sm font-medium" style={{ color: accent }}>
                    ★ {avgRating.toFixed(1)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {business.description && (
          <p
            className="text-sm leading-relaxed mb-8"
            style={{ color: 'rgba(255,255,255,0.55)' }}
          >
            {business.description}
          </p>
        )}

        {/* Services */}
        <section className="mb-10">
          <h2 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.28)' }}>
            Services
          </h2>
          <div className="space-y-3">
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedService(selectedService?.id === s.id ? null : s)}
                className="w-full rounded-2xl p-5 text-left transition-all"
                style={{
                  background: selectedService?.id === s.id
                    ? `${s.colour ?? accent}15`
                    : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${selectedService?.id === s.id ? (s.colour ?? accent) : 'rgba(255,255,255,0.10)'}`,
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">{s.name}</div>
                    {s.description && (
                      <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
                        {s.description}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                        {getDurationLabel(s.duration_minutes)}
                      </span>
                      {(s.capacity ?? 1) > 1 && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: `${accent}20`, color: accent }}
                        >
                          Group · {s.capacity} spots
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-base font-bold text-white shrink-0 ml-4">
                    {formatPrice(s.price_cents)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Slot picker */}
        {selectedService && (
          <section className="mb-10">
            <SlotPicker
              business={business}
              service={selectedService}
              staff={staff}
              accent={accent}
            />
          </section>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <section>
            <h2
              className="text-sm font-semibold uppercase tracking-widest mb-4"
              style={{ color: 'rgba(255,255,255,0.28)' }}
            >
              Reviews
            </h2>
            <div className="space-y-3">
              {reviews.slice(0, 5).map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl p-5"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.10)',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">
                      {(r.customers as { name: string } | null)?.name ?? 'Anonymous'}
                    </span>
                    <div className="flex gap-0.5">
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
                  {r.comment && (
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      {r.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── Powered by footer ── */}
      <div
        style={{
          borderTop:  '1px solid rgba(255,255,255,0.07)',
          padding:    '20px 16px',
          textAlign:  'center',
        }}
      >
        <p
          style={{
            fontSize:      12,
            color:         'rgba(255,255,255,0.22)',
            margin:        0,
            letterSpacing: '0.01em',
          }}
        >
          Powered by{' '}
          <span style={{ color: 'rgba(255,255,255,0.38)', fontWeight: 600 }}>OpenBook</span>
          <span style={{ color: '#D4AF37', fontWeight: 600 }}> AI</span>
        </p>
      </div>
    </div>
  )
}
