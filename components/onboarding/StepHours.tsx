'use client'

import { useState } from 'react'
import { tokens } from '@/lib/types'
import type { OnboardingData } from './OnboardingFlow'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const BUFFER_OPTIONS = [
  { label: 'None', value: 0 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1 hour', value: 60 },
]

interface Props { data: OnboardingData; update: (p: Partial<OnboardingData>) => void }

export default function StepHours({ data, update }: Props) {
  const [customDate, setCustomDate] = useState('')
  const [customName, setCustomName] = useState('')

  // ── Hours helpers ──────────────────────────────────────────────────────────
  function updateDay(dayIndex: number, partial: Partial<OnboardingData['hours'][number]>) {
    update({ hours: data.hours.map((h) => h.day_of_week === dayIndex ? { ...h, ...partial } : h) })
  }

  // ── Closure helpers ────────────────────────────────────────────────────────
  function toggleClosure(date: string) {
    update({
      closures: data.closures.map((c) => c.date === date ? { ...c, closed: !c.closed } : c),
    })
  }

  function setBankHolidaysAll(closed: boolean) {
    update({
      closures: data.closures.map((c) => c.is_bank_holiday ? { ...c, closed } : c),
    })
  }

  function addCustomClosure() {
    if (!customDate || data.closures.some((c) => c.date === customDate)) return
    update({
      closures: [...data.closures, {
        date: customDate,
        name: customName.trim() || 'Custom closure',
        is_bank_holiday: false,
        closed: true,
      }],
    })
    setCustomDate('')
    setCustomName('')
  }

  function removeCustomClosure(date: string) {
    update({ closures: data.closures.filter((c) => c.date !== date) })
  }

  const bankHolidays = data.closures.filter((c) => c.is_bank_holiday)
  const customClosures = data.closures.filter((c) => !c.is_bank_holiday)

  const inputStyle = {
    background: tokens.surface2,
    border: `1px solid ${tokens.border2}`,
    borderRadius: '12px',
    padding: '8px 12px',
    color: 'white',
    fontSize: '14px',
    outline: 'none',
  } as React.CSSProperties

  return (
    <div className="space-y-8">
      {/* ── Opening hours ───────────────────────────────────────────────── */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Set your opening hours</h2>
        <p className="text-sm mb-6" style={{ color: tokens.text2 }}>
          Availability is calculated from these hours.
        </p>

        <div className="space-y-2">
          {DAYS.map((day, i) => {
            const h = data.hours.find((x) => x.day_of_week === i)!
            return (
              <div
                key={day}
                className="flex items-center gap-4 rounded-xl px-4 py-3"
                style={{
                  background: tokens.surface1,
                  border: `1px solid ${h.is_open ? tokens.border2 : tokens.border}`,
                }}
              >
                <button
                  onClick={() => updateDay(i, { is_open: !h.is_open })}
                  className="w-10 h-5 rounded-full transition-colors relative shrink-0"
                  style={{ background: h.is_open ? tokens.gold : tokens.surface2 }}
                >
                  <span
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                    style={{ left: h.is_open ? '22px' : '2px' }}
                  />
                </button>

                <span className="w-8 text-sm font-medium shrink-0" style={{ color: h.is_open ? tokens.text1 : tokens.text3 }}>
                  {day}
                </span>

                {h.is_open ? (
                  <div className="flex items-center gap-2 ml-auto">
                    <input type="time" value={h.open_time}
                      onChange={(e) => updateDay(i, { open_time: e.target.value })}
                      className="rounded-lg px-3 py-1.5 text-sm text-white outline-none"
                      style={{ background: tokens.surface2, border: `1px solid ${tokens.border2}` }}
                    />
                    <span className="text-xs" style={{ color: tokens.text3 }}>to</span>
                    <input type="time" value={h.close_time}
                      onChange={(e) => updateDay(i, { close_time: e.target.value })}
                      className="rounded-lg px-3 py-1.5 text-sm text-white outline-none"
                      style={{ background: tokens.surface2, border: `1px solid ${tokens.border2}` }}
                    />
                  </div>
                ) : (
                  <span className="ml-auto text-xs" style={{ color: tokens.text3 }}>Closed</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Buffer between bookings ─────────────────────────────────────── */}
      <div
        className="rounded-xl px-4 py-4"
        style={{ background: tokens.surface1, border: `1px solid ${tokens.border}` }}
      >
        <label className="block text-sm font-medium text-white mb-3">
          Buffer between bookings
        </label>
        <div className="flex gap-2 flex-wrap">
          {BUFFER_OPTIONS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => update({ buffer_minutes: value })}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{
                background: data.buffer_minutes === value ? tokens.gold : tokens.surface2,
                color: data.buffer_minutes === value ? '#000' : tokens.text2,
                border: `1px solid ${data.buffer_minutes === value ? tokens.gold : tokens.border2}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs mt-2" style={{ color: tokens.text3 }}>
          Gap added after each booking before the next slot opens.
        </p>
      </div>

      {/* ── Bank holidays 2026 ──────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-white">Bank Holidays 2026</h3>
            <p className="text-xs mt-0.5" style={{ color: tokens.text3 }}>
              Toggle off to stay open on a holiday.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setBankHolidaysAll(false)}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: tokens.surface2, color: tokens.text2, border: `1px solid ${tokens.border2}` }}
            >
              Open all
            </button>
            <button
              onClick={() => setBankHolidaysAll(true)}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: tokens.surface2, color: tokens.text2, border: `1px solid ${tokens.border2}` }}
            >
              Close all
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {bankHolidays.map((c) => (
            <div
              key={c.date}
              className="flex items-center gap-3 rounded-xl px-4 py-2.5"
              style={{
                background: tokens.surface1,
                border: `1px solid ${c.closed ? tokens.border2 : tokens.border}`,
              }}
            >
              <button
                onClick={() => toggleClosure(c.date)}
                className="w-9 h-[18px] rounded-full relative shrink-0 transition-colors"
                style={{ background: c.closed ? '#ef4444' : tokens.surface2 }}
              >
                <span
                  className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform"
                  style={{ left: c.closed ? '19px' : '2px' }}
                />
              </button>
              <span className="text-sm font-medium" style={{ color: c.closed ? tokens.text1 : tokens.text3 }}>
                {c.name}
              </span>
              <span className="ml-auto text-xs tabular-nums" style={{ color: tokens.text3 }}>
                {c.date.slice(5).replace('-', '/')}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: c.closed ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.05)',
                  color: c.closed ? '#f87171' : tokens.text3,
                }}
              >
                {c.closed ? 'Closed' : 'Open'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Custom closures ─────────────────────────────────────────────── */}
      <div>
        <h3 className="text-base font-semibold text-white mb-3">Custom Closure Dates</h3>

        {customClosures.length > 0 && (
          <div className="space-y-2 mb-3">
            {customClosures.map((c) => (
              <div
                key={c.date}
                className="flex items-center gap-3 rounded-xl px-4 py-2.5"
                style={{ background: tokens.surface1, border: `1px solid ${tokens.border}` }}
              >
                <span className="text-sm font-medium text-white">{c.name}</span>
                <span className="ml-auto text-xs tabular-nums" style={{ color: tokens.text3 }}>{c.date}</span>
                <button
                  onClick={() => removeCustomClosure(c.date)}
                  className="text-xs px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
                  style={{ color: tokens.text3 }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: tokens.surface1, border: `1px dashed ${tokens.border2}` }}
        >
          <p className="text-xs font-medium" style={{ color: tokens.text2 }}>+ Add custom closure date</p>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              style={{ ...inputStyle, colorScheme: 'dark' }}
            />
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g. Staff training day"
              style={inputStyle}
            />
          </div>
          <button
            onClick={addCustomClosure}
            disabled={!customDate}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40"
            style={{ background: tokens.gold, color: '#000' }}
          >
            Add closure
          </button>
        </div>
      </div>
    </div>
  )
}
