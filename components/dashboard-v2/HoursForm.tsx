'use client';

import { useState, useTransition } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { TopBar } from './TopBar';
import { saveHours, type HourRowInput } from '@/app/(dashboard-v2)/v2/hours/actions';
import { cn } from '@/lib/utils';

export interface HourRow {
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

interface HoursFormProps {
  initialHours: HourRow[];
}

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon → Sun
const DAY_LABELS: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

interface Preset {
  label: string;
  apply: () => HourRow[];
}

const PRESETS: Preset[] = [
  {
    label: '9–5 weekdays',
    apply: () =>
      DAY_ORDER.map((d) => ({
        day_of_week: d,
        open_time: d >= 1 && d <= 5 ? '09:00' : null,
        close_time: d >= 1 && d <= 5 ? '17:00' : null,
        is_closed: d === 0 || d === 6,
      })),
  },
  {
    label: '9–6 weekdays + Sat 10–4',
    apply: () =>
      DAY_ORDER.map((d) => ({
        day_of_week: d,
        open_time: d >= 1 && d <= 5 ? '09:00' : d === 6 ? '10:00' : null,
        close_time: d >= 1 && d <= 5 ? '18:00' : d === 6 ? '16:00' : null,
        is_closed: d === 0,
      })),
  },
  {
    label: 'Every day 10–6',
    apply: () =>
      DAY_ORDER.map((d) => ({
        day_of_week: d,
        open_time: '10:00',
        close_time: '18:00',
        is_closed: false,
      })),
  },
];

function emptyForDay(dow: number): HourRow {
  return { day_of_week: dow, open_time: null, close_time: null, is_closed: true };
}

function normalise(rows: HourRow[]): HourRow[] {
  const byDay = new Map(rows.map((r) => [r.day_of_week, r]));
  return DAY_ORDER.map((dow) => byDay.get(dow) ?? emptyForDay(dow));
}

export function HoursForm({ initialHours }: HoursFormProps) {
  const [hours, setHours] = useState<HourRow[]>(() => normalise(initialHours));
  const [dirty, setDirty] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const updateDay = (dow: number, patch: Partial<HourRow>) => {
    setHours((prev) => prev.map((d) => (d.day_of_week === dow ? { ...d, ...patch } : d)));
    setDirty(true);
    setStatus('idle');
  };

  const applyPreset = (preset: Preset) => {
    setHours(preset.apply());
    setDirty(true);
    setStatus('idle');
  };

  const reset = () => {
    setHours(normalise(initialHours));
    setDirty(false);
    setStatus('idle');
  };

  const onSave = () => {
    setStatus('idle');
    setErrorMsg(null);
    startTransition(async () => {
      const payload: HourRowInput[] = hours.map((h) => ({
        day_of_week: h.day_of_week,
        open_time: h.open_time,
        close_time: h.close_time,
        is_closed: h.is_closed,
      }));
      const res = await saveHours(payload);
      if (res.ok) {
        setStatus('saved');
        setDirty(false);
      } else {
        setStatus('error');
        setErrorMsg(res.error);
      }
    });
  };

  return (
    <>
      <TopBar
        title="Hours"
        subtitle="When you're open to take bookings"
        actions={
          <>
            {dirty && (
              <Button
                variant="ghost"
                size="md"
                icon={<RotateCcw size={13} strokeWidth={2} />}
                onClick={reset}
                disabled={isPending}
              >
                Reset
              </Button>
            )}
            <Button
              variant="primary"
              size="md"
              icon={status === 'saved' ? <Check size={13} strokeWidth={2.5} /> : undefined}
              onClick={onSave}
              disabled={!dirty || isPending}
            >
              {isPending ? 'Saving…' : status === 'saved' ? 'Saved' : 'Save changes'}
            </Button>
          </>
        }
      />

      <div className="mx-auto max-w-4xl px-8 py-8 space-y-6">
        <section>
          <div className="text-[11px] font-semibold uppercase tracking-[0.6px] text-paper-text-3 dark:text-ink-text-3 mb-3">
            Presets
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p.label}
                variant="secondary"
                size="sm"
                onClick={() => applyPreset(p)}
                disabled={isPending}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </section>

        <section>
          <div className="text-[11px] font-semibold uppercase tracking-[0.6px] text-paper-text-3 dark:text-ink-text-3 mb-3">
            Schedule
          </div>
          <Card padding="none">
            {hours.map((h, i) => (
              <DayRow
                key={h.day_of_week}
                hour={h}
                isLast={i === hours.length - 1}
                onChange={(patch) => updateDay(h.day_of_week, patch)}
              />
            ))}
          </Card>
          {status === 'error' && errorMsg && (
            <p className="mt-3 text-[12px] text-red-500 dark:text-red-400">
              Couldn't save: {errorMsg}
            </p>
          )}
        </section>
      </div>
    </>
  );
}

function DayRow({
  hour,
  isLast,
  onChange,
}: {
  hour: HourRow;
  isLast: boolean;
  onChange: (patch: Partial<HourRow>) => void;
}) {
  const closed = hour.is_closed;

  const toggleClosed = () => {
    if (closed) {
      onChange({
        is_closed: false,
        open_time: hour.open_time ?? '09:00',
        close_time: hour.close_time ?? '17:00',
      });
    } else {
      onChange({ is_closed: true });
    }
  };

  return (
    <div
      className={cn(
        'grid grid-cols-[120px_1fr_1fr_auto] items-center gap-4 px-5 py-3.5',
        !isLast && 'border-b border-paper-border dark:border-ink-border',
      )}
    >
      <div className="text-[13px] font-medium text-paper-text-1 dark:text-ink-text-1">
        {DAY_LABELS[hour.day_of_week]}
      </div>
      <TimeInput
        value={hour.open_time ?? ''}
        disabled={closed}
        placeholder="Closed"
        onChange={(v) => onChange({ open_time: v || null })}
      />
      <TimeInput
        value={hour.close_time ?? ''}
        disabled={closed}
        placeholder="–"
        onChange={(v) => onChange({ close_time: v || null })}
      />
      <button
        type="button"
        onClick={toggleClosed}
        className={cn(
          'min-w-[60px] px-2.5 py-1 rounded-md text-[11.5px] font-semibold uppercase tracking-[0.3px] transition-colors',
          closed
            ? 'bg-gold text-black border border-gold-muted hover:brightness-110'
            : 'bg-paper-surface2 dark:bg-ink-surface2 text-paper-text-2 dark:text-ink-text-2 border border-paper-borderStrong dark:border-ink-borderStrong hover:bg-paper-surface3 dark:hover:bg-ink-surface3',
        )}
        aria-label={closed ? 'Open this day' : 'Close this day'}
      >
        {closed ? 'Open' : 'Close'}
      </button>
    </div>
  );
}

function TimeInput({
  value,
  disabled,
  placeholder,
  onChange,
}: {
  value: string;
  disabled?: boolean;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="time"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'h-9 w-full rounded-md border px-3 text-[13px] tabular-nums outline-none transition-colors',
        'bg-paper-surface dark:bg-ink-surface',
        'text-paper-text-1 dark:text-ink-text-1',
        'border-paper-border dark:border-ink-border',
        'focus:ring-2 focus:ring-gold focus:border-gold',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        'placeholder:text-paper-text-3 dark:placeholder:text-ink-text-3',
      )}
    />
  );
}
