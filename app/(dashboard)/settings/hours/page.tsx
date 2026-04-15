'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
    await supabase.from('business_hours').upsert(
      hours.map((h) => ({ ...h, business_id: businessId })),
      { onConflict: 'id' }
    )
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-white">Opening Hours</h2>
          <p className="text-[13px] text-white/40 mt-0.5">Set when customers can book appointments</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="h-9 px-4 rounded-xl text-[13px] font-semibold disabled:opacity-50 transition-all btn-press"
          style={{ background: '#D4AF37', color: '#000' }}
        >
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save hours'}
        </button>
      </div>

      <div className="dashboard-card !p-0 overflow-hidden">
        <div className="divide-y divide-white/[0.06]">
          {hours.map((h) => (
            <div key={h.day_of_week} className="flex items-center gap-4 px-5 py-4">
              {/* Toggle */}
              <button
                onClick={() => update(h.day_of_week, { is_open: !h.is_open })}
                className="w-10 h-5 rounded-full transition-colors relative shrink-0"
                style={{ background: h.is_open ? '#D4AF37' : 'rgba(255,255,255,0.08)' }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                  style={{ left: h.is_open ? '22px' : '2px' }}
                />
              </button>

              {/* Day name */}
              <span
                className="w-28 text-[14px] font-medium"
                style={{ color: h.is_open ? '#fff' : 'rgba(255,255,255,0.35)' }}
              >
                {DAYS[h.day_of_week]}
              </span>

              {h.is_open ? (
                <div className="flex items-center gap-2 ml-auto">
                  <input
                    type="time"
                    value={h.open_time}
                    onChange={(e) => update(h.day_of_week, { open_time: e.target.value })}
                    className="rounded-lg px-3 py-1.5 text-[13px] text-white outline-none gold-focus-ring"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  />
                  <span className="text-[12px] text-white/30">to</span>
                  <input
                    type="time"
                    value={h.close_time}
                    onChange={(e) => update(h.day_of_week, { close_time: e.target.value })}
                    className="rounded-lg px-3 py-1.5 text-[13px] text-white outline-none gold-focus-ring"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  />
                </div>
              ) : (
                <span className="ml-auto text-[12px] text-white/30">Closed</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
