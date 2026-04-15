'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils'
import { Check } from 'lucide-react'
import StepBasics from './StepBasics'
import StepBrand from './StepBrand'
import StepServices from './StepServices'
import StepHours from './StepHours'
import StepPackages from './StepPackages'
import StepPublish from './StepPublish'

const STEPS = ['Basics', 'Brand', 'Services', 'Hours', 'Packages', 'Go live']

export interface OnboardingData {
  name: string
  category: string
  description: string
  address: string
  city: string
  primaryColour: string
  services: Array<{
    name: string
    description: string
    duration_minutes: number
    price_cents: number
    capacity: number
    colour: string
  }>
  hours: Array<{
    day_of_week: number
    is_open: boolean
    open_time: string
    close_time: string
  }>
  packages: Array<{
    name: string
    tagline: string
    price_cents: number
    session_count: number | null
    sessions_per_month: number | null
    expires_days: number | null
  }>
}

const DEFAULT_HOURS = Array.from({ length: 7 }, (_, i) => ({
  day_of_week: i,
  is_open: i >= 1 && i <= 5,
  open_time: '09:00',
  close_time: '18:00',
}))

const DEFAULT_DATA: OnboardingData = {
  name: '',
  category: '',
  description: '',
  address: '',
  city: '',
  primaryColour: '#D4AF37',
  services: [],
  hours: DEFAULT_HOURS,
  packages: [],
}

export default function OnboardingFlow({ userId }: { userId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(0)
  const [data, setData] = useState<OnboardingData>(DEFAULT_DATA)
  const [saving, setSaving] = useState(false)

  function update(partial: Partial<OnboardingData>) {
    setData((prev) => ({ ...prev, ...partial }))
  }

  async function handlePublish() {
    setSaving(true)
    const slug = slugify(data.name)

    const { data: business, error } = await supabase
      .from('businesses')
      .insert({
        owner_id: userId,
        name: data.name,
        slug,
        category: data.category,
        description: data.description,
        address: data.address,
        city: data.city,
        primary_colour: data.primaryColour,
        is_live: true,
      })
      .select()
      .single()

    if (error || !business) {
      setSaving(false)
      return
    }

    if (data.services.length > 0) {
      await supabase.from('services').insert(
        data.services.map((s, i) => ({ ...s, business_id: business.id, sort_order: i }))
      )
    }

    await supabase.from('business_hours').insert(
      data.hours.map((h) => ({ ...h, business_id: business.id }))
    )

    if (data.packages.length > 0) {
      await supabase.from('packages').insert(
        data.packages.map((p) => ({ ...p, business_id: business.id }))
      )
    }

    router.push('/overview')
  }

  const stepProps = { data, update }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative"
      style={{ background: '#080808' }}
    >
      {/* Subtle gold radial glow */}
      <div
        className="absolute top-0 left-0 w-[600px] h-[600px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 0 0, rgba(212,175,55,0.06) 0%, transparent 60%)',
        }}
      />

      {/* Progress stepper */}
      <div className="relative z-10 flex items-center gap-0 mb-10 px-4">
        {STEPS.map((label, i) => {
          const isCompleted = i < step
          const isCurrent = i === step

          return (
            <div key={label} className="flex items-center">
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold transition-all duration-200"
                  style={{
                    background: isCompleted
                      ? '#D4AF37'
                      : isCurrent
                      ? 'transparent'
                      : 'rgba(255,255,255,0.06)',
                    border: isCurrent
                      ? '2px solid #D4AF37'
                      : isCompleted
                      ? '2px solid #D4AF37'
                      : '2px solid rgba(255,255,255,0.1)',
                    color: isCompleted
                      ? '#000'
                      : isCurrent
                      ? '#D4AF37'
                      : 'rgba(255,255,255,0.35)',
                  }}
                >
                  {isCompleted ? <Check size={14} strokeWidth={3} /> : i + 1}
                </div>
                <span
                  className="text-[10px] font-medium mt-1.5 whitespace-nowrap"
                  style={{
                    color: isCurrent ? '#D4AF37' : isCompleted ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)',
                  }}
                >
                  {label}
                </span>
              </div>

              {/* Connecting line */}
              {i < STEPS.length - 1 && (
                <div
                  className="w-12 h-[2px] mx-2 mt-[-16px]"
                  style={{
                    background: i < step ? '#D4AF37' : 'rgba(255,255,255,0.08)',
                  }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Content card */}
      <div
        className="relative z-10 w-full max-w-[560px] mx-auto px-4"
      >
        <div
          className="rounded-[20px] p-9"
          style={{
            background: '#111111',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {step === 0 && <StepBasics {...stepProps} />}
          {step === 1 && <StepBrand {...stepProps} />}
          {step === 2 && <StepServices {...stepProps} />}
          {step === 3 && <StepHours {...stepProps} />}
          {step === 4 && <StepPackages {...stepProps} />}
          {step === 5 && <StepPublish {...stepProps} onPublish={handlePublish} saving={saving} />}
        </div>

        {/* Nav buttons */}
        <div className="flex gap-3 mt-6">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="text-[14px] font-medium text-white/40 hover:text-white/60 transition-colors"
            >
              Back
            </button>
          )}
          <div className="flex-1" />
          {step < STEPS.length - 1 && (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 0 && (!data.name || !data.category)}
              className="w-full h-[52px] rounded-xl text-[14px] font-semibold transition-all disabled:opacity-40 btn-press"
              style={{ background: '#D4AF37', color: '#000' }}
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
