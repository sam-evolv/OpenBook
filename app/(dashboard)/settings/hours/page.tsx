'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { tokens } from '@/lib/types'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface HourRow {
  id?: string
  day_of_week: number
  is_open: boolean
  open_time: string
  close_time: string
}

export default function HoursPage() {
  const supabase = createClient()
  const [hours, setHours] = useState<HourRow[]>([])
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user!.id)
        .single()
      if (!business) return
      setBusinessId(business.id)

      const { data } = await supabase
        .from('business_hours')
        .select('*')
        .eq('business_id', business.id)
        .order('day_of_week')

      if (data && data.length > 0) {
        setHours(data as HourRow[])
      } else {
        // Defaults
        setHours(
          Array.from({ length: 7 }, (_, i) => ({
            day_of_week: i,
            is_open: i >= 1 && i <= 5,
            open_time: '09:00',
            close_time: '18:00',
          }))
        )
      }
    }
    load()
  }, [])

  function update(dayIndex: number, partial: Partial<HourRow>) {
    setHours((prev) => prev.map((h) => (h.day_of_week === dayIndex ? { ...h, ...partial } : h)))
  }

  async function save() {
    if (!businessId) return
    setSaving(true)
    // Upsert all rows
    await supabase.from('business_hours').upsert(
      hours.map((h) => ({ ...h, business_id: businessId })),
      { onConflict: 'id' }
    )
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Opening hours</h1>
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
          style={{ background: tokens.gold, color: '#000' }}
        >
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save hours'}
        </button>
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: tokens.surface1, border: `1px solid ${tokens.border}` }}
      >
        <div className="divide-y" style={{ borderColor: tokens.border }}>
          {hours.map((h) => (
            <div key={h.day_of_week} className="flex items-center gap-4 px-5 py-4">
              <button
                onClick={() => update(h.day_of_week, { is_open: !h.is_open })}
                className="w-10 h-5 rounded-full transition-colors relative shrink-0"
                style={{ background: h.is_open ? tokens.gold : tokens.surface2 }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                  style={{ left: h.is_open ? '22px' : '2px' }}
                />
              </button>

              <span
                className="w-24 text-sm font-medium"
                style={{ color: h.is_open ? tokens.text1 : tokens.text3 }}
              >
                {DAYS[h.day_of_week]}
              </span>

              {h.is_open ? (
                <div className="flex items-center gap-2 ml-auto">
                  <input
                    type="time"
                    value={h.open_time}
                    onChange={(e) => update(h.day_of_week, { open_time: e.target.value })}
                    className="rounded-lg px-3 py-1.5 text-sm text-white outline-none"
                    style={{ background: tokens.surface2, border: `1px solid ${tokens.border2}` }}
                  />
                  <span className="text-xs" style={{ color: tokens.text3 }}>to</span>
                  <input
                    type="time"
                    value={h.close_time}
                    onChange={(e) => update(h.day_of_week, { close_time: e.target.value })}
                    className="rounded-lg px-3 py-1.5 text-sm text-white outline-none"
                    style={{ background: tokens.surface2, border: `1px solid ${tokens.border2}` }}
                  />
                </div>
              ) : (
                <span className="ml-auto text-xs" style={{ color: tokens.text3 }}>Closed</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
