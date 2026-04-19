'use client';

import { useState } from 'react';
import { Loader2, Check, Zap, Copy } from 'lucide-react';

interface HourRow {
  id?: string;
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

interface Props {
  businessId: string;
  initialHours: HourRow[];
}

const DAYS = [
  { day: 1, label: 'Monday', short: 'Mon' },
  { day: 2, label: 'Tuesday', short: 'Tue' },
  { day: 3, label: 'Wednesday', short: 'Wed' },
  { day: 4, label: 'Thursday', short: 'Thu' },
  { day: 5, label: 'Friday', short: 'Fri' },
  { day: 6, label: 'Saturday', short: 'Sat' },
  { day: 0, label: 'Sunday', short: 'Sun' },
];

const PRESETS = [
  {
    label: '9-5 weekdays',
    apply: (): HourRow[] => DAYS.map(({ day }) => ({
      day_of_week: day,
      open_time: day >= 1 && day <= 5 ? '09:00' : null,
      close_time: day >= 1 && day <= 5 ? '17:00' : null,
      is_closed: day === 0 || day === 6,
    })),
  },
  {
    label: '7 days 9-6',
    apply: (): HourRow[] => DAYS.map(({ day }) => ({
      day_of_week: day,
      open_time: '09:00',
      close_time: '18:00',
      is_closed: false,
    })),
  },
  {
    label: 'Extended Mon-Sat',
    apply: (): HourRow[] => DAYS.map(({ day }) => ({
      day_of_week: day,
      open_time: day >= 1 && day <= 5 ? '08:00' : day === 6 ? '09:00' : null,
      close_time: day >= 1 && day <= 5 ? '20:00' : day === 6 ? '17:00' : null,
      is_closed: day === 0,
    })),
  },
];

export function HoursClient({ businessId, initialHours }: Props) {
  const [hours, setHours] = useState<HourRow[]>(() => {
    const map = new Map(initialHours.map((h) => [h.day_of_week, h]));
    return DAYS.map(({ day }) => {
      const existing = map.get(day);
      return existing ?? {
        day_of_week: day,
        open_time: '09:00',
        close_time: '17:00',
        is_closed: day === 0,
      };
    });
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  function updateDay(dayOfWeek: number, patch: Partial<HourRow>) {
    setHours((prev) => prev.map((h) => (h.day_of_week === dayOfWeek ? { ...h, ...patch } : h)));
    setSaved(false);
    setDirty(true);
  }

  function applyPreset(preset: typeof PRESETS[0]) {
    setHours(preset.apply());
    setDirty(true);
    setSaved(false);
  }

  function copyFromMonday() {
    const mon = hours.find((h) => h.day_of_week === 1);
    if (!mon) return;
    setHours((prev) =>
      prev.map((h) =>
        h.day_of_week >= 2 && h.day_of_week <= 5
          ? { ...h, open_time: mon.open_time, close_time: mon.close_time, is_closed: mon.is_closed }
          : h
      )
    );
    setDirty(true);
    setSaved(false);
  }

  async function saveAll() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/dashboard/hours', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, hours }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Save failed');
      setSaved(true);
      setDirty(false);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 dash-fade-in">
      <div>
        <h1
          className="text-[24px] font-semibold leading-none"
          style={{ color: 'var(--fg-0)', letterSpacing: '-0.02em' }}
        >
          Hours
        </h1>
        <p className="mt-1.5 text-[13px]" style={{ color: 'var(--fg-1)' }}>
          When you're open to take bookings.
        </p>
      </div>

      {/* Presets */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 pr-2">
          <Zap className="h-[13px] w-[13px]" style={{ color: 'var(--fg-2)' }} strokeWidth={1.8} />
          <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--fg-2)' }}>
            Presets
          </span>
        </div>
        {PRESETS.map((p) => (
          <button key={p.label} onClick={() => applyPreset(p)} className="dash-chip">
            {p.label}
          </button>
        ))}
        <button onClick={copyFromMonday} className="dash-chip">
          <Copy className="h-[11px] w-[11px]" strokeWidth={2} />
          Copy Mon to weekdays
        </button>
      </div>

      {error && (
        <div
          className="rounded-lg p-3 text-[13px]"
          style={{ background: 'var(--danger-bg)', border: '0.5px solid var(--danger)', color: 'var(--danger)' }}
        >
          {error}
        </div>
      )}

      {/* Days */}
      <div className="dash-card overflow-hidden" style={{ background: 'var(--bg-1)' }}>
        {DAYS.map(({ day, label }, i) => {
          const row = hours.find((h) => h.day_of_week === day)!;
          return (
            <div
              key={day}
              className="flex items-center gap-4 px-4 py-3"
              style={{
                borderBottom: i === DAYS.length - 1 ? 'none' : '0.5px solid var(--border-1)',
              }}
            >
              <span className="w-28 text-[13px] font-medium" style={{ color: row.is_closed ? 'var(--fg-2)' : 'var(--fg-0)' }}>
                {label}
              </span>

              {row.is_closed ? (
                <span className="flex-1 text-[13px]" style={{ color: 'var(--fg-2)' }}>
                  Closed
                </span>
              ) : (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="time"
                    value={row.open_time ?? '09:00'}
                    onChange={(e) => updateDay(day, { open_time: e.target.value })}
                    className="dash-input w-24"
                    style={{ height: 30 }}
                  />
                  <span className="text-[12px]" style={{ color: 'var(--fg-2)' }}>to</span>
                  <input
                    type="time"
                    value={row.close_time ?? '17:00'}
                    onChange={(e) => updateDay(day, { close_time: e.target.value })}
                    className="dash-input w-24"
                    style={{ height: 30 }}
                  />
                  <TimelineBar open={row.open_time} close={row.close_time} />
                </div>
              )}

              <button
                onClick={() => updateDay(day, { is_closed: !row.is_closed })}
                className="dash-chip"
                data-active={row.is_closed}
              >
                {row.is_closed ? 'Open' : 'Close'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Save bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={saveAll}
          disabled={saving || !dirty}
          className="dash-btn-accent"
        >
          {saving ? <Loader2 className="h-[14px] w-[14px] animate-spin" /> : null}
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-[13px]" style={{ color: 'var(--success)' }}>
            <Check className="h-4 w-4" strokeWidth={2.2} />
            Saved
          </span>
        )}
        {dirty && !saving && !saved && (
          <span className="text-[11px]" style={{ color: 'var(--fg-2)' }}>
            Unsaved changes
          </span>
        )}
      </div>
    </div>
  );
}

function TimelineBar({ open, close }: { open: string | null; close: string | null }) {
  if (!open || !close) return null;
  const [oh, om] = open.split(':').map(Number);
  const [ch, cm] = close.split(':').map(Number);
  const openMinutes = oh * 60 + om;
  const closeMinutes = ch * 60 + cm;
  const dayMinutes = 24 * 60;

  const leftPct = (openMinutes / dayMinutes) * 100;
  const widthPct = Math.max(2, ((closeMinutes - openMinutes) / dayMinutes) * 100);

  return (
    <div
      className="flex-1 h-1.5 rounded-full relative ml-2 overflow-hidden"
      style={{ background: 'var(--bg-3)', maxWidth: 220 }}
    >
      <div
        className="absolute top-0 bottom-0 rounded-full"
        style={{
          left: `${leftPct}%`,
          width: `${widthPct}%`,
          background: 'var(--accent)',
        }}
      />
    </div>
  );
}
