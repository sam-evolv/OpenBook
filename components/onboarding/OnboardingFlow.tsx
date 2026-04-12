'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils'
import { tokens } from '@/lib/types'
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
  website: string
  instagram_handle: string
  primaryColour: string
  buffer_minutes: number
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
  closures: Array<{
    date: string
    name: string
    is_bank_holiday: boolean
    closed: boolean
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

const BANK_HOLIDAYS_2026 = [
  { date: '2026-01-01', name: "New Year's Day" },
  { date: '2026-02-02', name: "St. Brigid's Day" },
  { date: '2026-03-17', name: "St. Patrick's Day" },
  { date: '2026-04-06', name: 'Easter Monday' },
  { date: '2026-05-04', name: 'May Bank Holiday' },
  { date: '2026-06-01', name: 'June Bank Holiday' },
  { date: '2026-08-03', name: 'August Bank Holiday' },
  { date: '2026-10-26', name: 'October Bank Holiday' },
  { date: '2026-12-25', name: 'Christmas Day' },
  { date: '2026-12-26', name: "St. Stephen's Day" },
]

const DEFAULT_DATA: OnboardingData = {
  name: '',
  category: '',
  description: '',
  address: '',
  city: '',
  website: '',
  instagram_handle: '',
  primaryColour: '#D4AF37',
  buffer_minutes: 0,
  services: [],
  hours: DEFAULT_HOURS,
  closures: BANK_HOLIDAYS_2026.map((h) => ({ ...h, is_bank_holiday: true, closed: true })),
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
        website: data.website || null,
        instagram_handle: data.instagram_handle || null,
        primary_colour: data.primaryColour,
        buffer_minutes: data.buffer_minutes,
        is_live: true,
      })
      .select()
      .single()

    if (error || !business) {
      setSaving(false)
      return
    }

    // Insert services
    if (data.services.length > 0) {
      await supabase.from('services').insert(
        data.services.map((s, i) => ({ ...s, business_id: business.id, sort_order: i }))
      )
    }

    // Insert hours
    await supabase.from('business_hours').insert(
      data.hours.map((h) => ({ ...h, business_id: business.id }))
    )

    // Insert packages
    if (data.packages.length > 0) {
      await supabase.from('packages').insert(
        data.packages.map((p) => ({ ...p, business_id: business.id }))
      )
    }

    // Insert closures (only those marked closed)
    const closuresToSave = data.closures.filter((c) => c.closed)
    if (closuresToSave.length > 0) {
      await supabase.from('business_closures').insert(
        closuresToSave.map((c) => ({
          business_id: business.id,
          date: c.date,
          name: c.name,
          is_bank_holiday: c.is_bank_holiday,
        }))
      )
    }

    router.push('/overview')
  }

  const stepProps = { data, update }

  return (
    <div className="min-h-screen flex" style={{ background: tokens.bg }}>
      {/* Sidebar */}
      <div
        className="hidden lg:flex flex-col w-64 p-8 gap-2 shrink-0"
        style={{ borderRight: `1px solid ${tokens.border}` }}
      >
        <span className="text-lg font-black mb-8" style={{ color: tokens.gold }}>
          OpenBook
        </span>
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-3 py-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors"
              style={{
                background: i < step ? tokens.gold : i === step ? `${tokens.gold}20` : tokens.surface2,
                color: i < step ? '#000' : i === step ? tokens.gold : tokens.text3,
                border: i === step ? `1px solid ${tokens.gold}` : 'none',
              }}
            >
              {i < step ? '✓' : i + 1}
            </div>
            <span
              className="text-sm font-medium"
              style={{ color: i === step ? tokens.text1 : tokens.text3 }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-xl">
          {/* Mobile step indicator */}
          <div className="flex gap-1 mb-8 lg:hidden">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="h-1 flex-1 rounded-full transition-colors"
                style={{ background: i <= step ? tokens.gold : tokens.surface2 }}
              />
            ))}
          </div>

          {step === 0 && <StepBasics {...stepProps} />}
          {step === 1 && <StepBrand {...stepProps} />}
          {step === 2 && <StepServices {...stepProps} />}
          {step === 3 && <StepHours {...stepProps} />}
          {step === 4 && <StepPackages {...stepProps} />}
          {step === 5 && <StepPublish {...stepProps} onPublish={handlePublish} saving={saving} />}

          {/* Nav buttons */}
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex-1 rounded-xl py-3 text-sm font-medium transition-colors"
                style={{
                  background: tokens.surface2,
                  color: tokens.text2,
                  border: `1px solid ${tokens.border}`,
                }}
              >
                Back
              </button>
            )}
            {step < STEPS.length - 1 && (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={step === 0 && (!data.name || !data.category)}
                className="flex-1 rounded-xl py-3 text-sm font-semibold transition-opacity disabled:opacity-40"
                style={{ background: tokens.gold, color: '#000' }}
              >
                Continue
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
