'use client'

import { useState } from 'react'
import { MapPin, Star } from 'lucide-react'
import { ServiceCard } from '@/components/consumer/ServiceCard'
import { SlotPicker } from '@/components/consumer/SlotPicker'
import { BookingConfirmation } from '@/components/consumer/BookingConfirmation'
import { PackageStrip } from '@/components/consumer/PackageStrip'
import {
  mockBusiness,
  mockServices,
  mockPackages,
  mockTimeSlots,
  getBusinessBySlug,
} from '@/lib/mock-data'
import type { Service } from '@/lib/types'

type Stage = 'browse' | 'pick-slot' | 'confirmed'

export default function ConsumerPage({ params }: { params: { slug: string } }) {
  const business = getBusinessBySlug(params.slug) ?? mockBusiness

  const [stage, setStage] = useState<Stage>('browse')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

  function handleSelectService(service: Service) {
    setSelectedService(service)
    setStage('pick-slot')
    setSelectedSlot(null)
  }

  function handleConfirm() {
    setStage('confirmed')
  }

  function handleReset() {
    setStage('browse')
    setSelectedService(null)
    setSelectedSlot(null)
  }

  return (
    <div className="min-h-screen bg-sidebar">
      {/* Hero */}
      <div className="relative px-5 pt-12 pb-8 border-b border-white/8">
        {/* Subtle gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-500/5 to-transparent pointer-events-none" />

        <div className="relative max-w-lg mx-auto">
          {/* Open badge */}
          {business.isOpen && (
            <span className="inline-flex items-center gap-1.5 h-5 px-2.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold uppercase tracking-wide mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Open now
            </span>
          )}

          {/* Business name */}
          <h1 className="text-[28px] font-bold text-white leading-tight tracking-tight">
            {business.name}
          </h1>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <span className="flex items-center gap-1.5 text-[13px] text-white/50">
              <MapPin size={13} />
              {business.location}
            </span>
            <span className="flex items-center gap-1 text-[13px] text-white/50">
              <Star size={12} className="text-brand-500 fill-brand-500" />
              <span className="text-white/80 font-semibold">{business.rating}</span>
              <span className="text-white/40">({business.reviewCount} reviews)</span>
            </span>
            <span className="text-[13px] text-white/50">{business.type}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-5 py-8 space-y-8">
        {stage === 'browse' && (
          <>
            {/* Services */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
                Services
              </p>
              <div className="space-y-2.5">
                {mockServices.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    onSelect={handleSelectService}
                  />
                ))}
              </div>
            </div>

            {/* Packages */}
            <PackageStrip packages={mockPackages} />
          </>
        )}

        {stage === 'pick-slot' && selectedService && (
          <SlotPicker
            service={selectedService}
            slots={mockTimeSlots}
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
            onBack={handleReset}
            onConfirm={handleConfirm}
          />
        )}

        {stage === 'confirmed' && selectedService && selectedSlot && (
          <BookingConfirmation
            service={selectedService}
            time={selectedSlot}
            business={business}
            onBookAnother={handleReset}
          />
        )}
      </div>
    </div>
  )
}
