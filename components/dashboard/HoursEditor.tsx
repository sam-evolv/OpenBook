'use client';

import { useState } from 'react';
import { Loader2, Check } from 'lucide-react';

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

const DAY_LABELS = [
  { day: 1, label: 'Monday' },
  { day: 2, label: 'Tuesday' },
  { day: 3, label: 'Wednesday' },
  { day: 4, label: 'Thursday' },
  { day: 5, label: 'Friday' },
  { day: 6, label: 'Saturday' },
  { day: 0, label: 'Sunday' },
];

export function HoursEditor({ businessId, initialHours }: Props) {
  const [hours, setHours] = useState<HourRow[]>(() => {
    // Ensure all 7 days are present
    const map = new Map(initialHours.map((h) => [h.day_of_week, h]));
    return DAY_LABELS.map(({ day }) => {
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

  function updateDay(dayOfWeek: number, patch: Partial<HourRow>) {
    setHours((prev) =>
      prev.map((h) => (h.day_of_week === dayOfWeek ? { ...h, ...patch } : h))
    );
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
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div
          className="rounded-lg p-3 text-[13px]"
          style={{
            background: 'rgba(255,80,80,0.08)',
            border: '0.5px solid rgba(255,80,80,0.25)',
            color: 'rgba(255,150,150,0.9)',
          }}
        >
          {error}
        </div>
      )}

      <div
        className="rounded-xl overflow-hidden divide-y"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '0.5px solid rgba(255,255,255,0.06)',
        }}
      >
        {DAY_LABELS.map(({ day, label }) => {
          const row = hours.find((h) => h.day_of_week === day)!;
          return (
            <div
              key={day}
              className="flex items-center gap-4 px-4 py-3"
              style={{ borderColor: 'rgba(255,255,255,0.05)' }}
            >
              <span className="w-24 text-[13px] font-medium">{label}</span>

              {row.is_closed ? (
                <span
                  className="flex-1 text-[13px]"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  Closed
                </span>
              ) : (
                <>
                  <input
                    type="time"
                    value={row.open_time ?? '09:00'}
                    onChange={(e) => updateDay(day, { open_time: e.target.value })}
                    className="bg-transparent text-[13px] tabular-nums focus:outline-none"
                    style={{ color: 'rgba(255,255,255,0.85)' }}
                  />
                  <span className="text-[13px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    to
                  </span>
                  <input
                    type="time"
                    value={row.close_time ?? '17:00'}
                    onChange={(e) => updateDay(day, { close_time: e.target.value })}
                    className="bg-transparent text-[13px] tabular-nums focus:outline-none"
                    style={{ color: 'rgba(255,255,255,0.85)' }}
                  />
                  <div className="flex-1" />
                </>
              )}

              <button
                onClick={() => updateDay(day, { is_closed: !row.is_closed })}
                className="text-[12px] font-medium px-3 py-1 rounded-full transition-colors"
                style={{
                  background: row.is_closed
                    ? 'rgba(212,175,55,0.1)'
                    : 'rgba(255,255,255,0.05)',
                  color: row.is_closed ? '#D4AF37' : 'rgba(255,255,255,0.55)',
                }}
              >
                {row.is_closed ? 'Open this day' : 'Mark closed'}
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={saveAll}
          disabled={saving}
          className="flex h-11 items-center gap-2 px-5 rounded-full text-[13px] font-semibold text-black active:scale-[0.98] transition-all disabled:opacity-50"
          style={{
            background: 'linear-gradient(145deg, #F6D77C 0%, #D4AF37 50%, #8B6428 100%)',
            boxShadow: '0 8px 20px rgba(212, 175, 55, 0.2)',
          }}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-[13px] text-emerald-400">
            <Check className="h-4 w-4" strokeWidth={2.5} />
            Saved
          </span>
        )}
      </div>
    </div>
  );
}
