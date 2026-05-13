'use client';

/**
 * AlertSheet — iOS-style bottom sheet for creating a standing alert.
 *
 * Single screen, progressive disclosure:
 *   1. Max price slider (€0 to business max, €5 snaps)
 *   2. Days/times pill — collapsed by default, taps open chips + time range
 *   3. Service picker — deferred for MVP (always "Any service")
 *
 * On Save, POSTs to /api/standing-slots and surfaces a toast via the
 * provided onSaved callback. Drag-to-dismiss + tap-backdrop both close.
 */

import { useEffect, useMemo, useState, useRef } from 'react';
import { Calendar, Clock, ChevronDown } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { ALL_DAYS_MASK } from '@/lib/standing-slots';

interface BusinessLite {
  id: string;
  name: string;
}

export interface AlertSheetProps {
  business: BusinessLite;
  onClose: () => void;
  onSaved: (slot: { id: string; max_price_cents: number }) => void;
}

// UI presents Monday-first, but the DB day_mask uses Postgres DOW
// (Sun=0..Sat=6). Index helpers keep the two perspectives separate.
const UI_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;
const UI_INDEX_TO_DOW = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun → DOW

function dayMaskToUiSelected(mask: number): boolean[] {
  return UI_INDEX_TO_DOW.map((dow) => (mask & (1 << dow)) !== 0);
}

function uiSelectedToDayMask(selected: boolean[]): number {
  return selected.reduce(
    (acc, on, i) => (on ? acc | (1 << UI_INDEX_TO_DOW[i]) : acc),
    0,
  );
}

const PRICE_STEP_CENTS = 500;

export function AlertSheet({ business, onClose, onSaved }: AlertSheetProps) {
  const [maxPriceCents, setMaxPriceCents] = useState(2_000);
  const [maxBusinessPriceCents, setMaxBusinessPriceCents] = useState(10_000);
  const [loadingMax, setLoadingMax] = useState(true);
  const [daysExpanded, setDaysExpanded] = useState(false);
  const [daySelected, setDaySelected] = useState<boolean[]>([true, true, true, true, true, true, true]);
  const [timeStart, setTimeStart] = useState('00:00');
  const [timeEnd, setTimeEnd] = useState('23:59');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sheetRef = useRef<HTMLDivElement>(null);
  const dragOriginY = useRef<number | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);

  // Lazy-load the price ceiling for this business.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/businesses/${business.id}/services-summary`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const ceiling = Math.max(1_000, Math.ceil(data.max_price_cents / PRICE_STEP_CENTS) * PRICE_STEP_CENTS);
        setMaxBusinessPriceCents(ceiling);
        setMaxPriceCents(Math.min(2_000, ceiling));
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoadingMax(false);
      });
    return () => {
      cancelled = true;
    };
  }, [business.id]);

  // Lock body scroll while sheet is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Escape closes.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const daysSummary = useMemo(() => {
    const allOn = daySelected.every(Boolean);
    const anyTimeRange = timeStart === '00:00' && (timeEnd === '23:59' || timeEnd === '23:59:00');
    if (allOn && anyTimeRange) return 'Any day, any time';
    const parts: string[] = [];
    if (allOn) parts.push('Any day');
    else {
      const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      parts.push(daySelected.map((on, i) => (on ? names[i] : null)).filter(Boolean).join('/'));
    }
    parts.push(`${timeStart}–${timeEnd}`);
    return parts.join(' · ');
  }, [daySelected, timeStart, timeEnd]);

  const priceLabel = useMemo(() => {
    const euros = Math.round(maxPriceCents / 100);
    return `Alert me under €${euros}`;
  }, [maxPriceCents]);

  function toggleDay(i: number) {
    haptics.tap();
    setDaySelected((curr) => curr.map((on, idx) => (idx === i ? !on : on)));
  }

  async function save() {
    if (saving) return;
    const dayMask = uiSelectedToDayMask(daySelected) || ALL_DAYS_MASK;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/standing-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: business.id,
          service_id: null,
          max_price_cents: maxPriceCents,
          day_mask: dayMask,
          time_start: timeStart,
          time_end: timeEnd,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `save_failed_${res.status}`);
      }
      const slot = await res.json();
      haptics.success();
      onSaved({ id: slot.id, max_price_cents: slot.max_price_cents });
    } catch (err) {
      console.error('[AlertSheet] save failed', err);
      haptics.error();
      setError('Could not save. Try again.');
      setSaving(false);
    }
  }

  // Drag-to-dismiss handlers
  function onTouchStart(e: React.TouchEvent) {
    dragOriginY.current = e.touches[0].clientY;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (dragOriginY.current === null) return;
    const dy = e.touches[0].clientY - dragOriginY.current;
    if (dy > 0) setDragOffsetY(dy);
  }
  function onTouchEnd() {
    if (dragOffsetY > 120) {
      onClose();
    } else {
      setDragOffsetY(0);
    }
    dragOriginY.current = null;
  }

  const minSlider = 0;
  const maxSlider = maxBusinessPriceCents;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Set up alerts for ${business.name}`}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 110,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(20px) saturate(120%)',
        WebkitBackdropFilter: 'blur(20px) saturate(120%)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        animation: 'ob-sheet-fade 200ms cubic-bezier(0.2, 0.9, 0.3, 1) both',
      }}
    >
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'rgba(20,20,22,0.92)',
          backdropFilter: 'blur(30px) saturate(180%)',
          WebkitBackdropFilter: 'blur(30px) saturate(180%)',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          border: '0.5px solid rgba(255,255,255,0.1)',
          borderBottom: 'none',
          padding: '12px 20px max(28px, env(safe-area-inset-bottom)) 20px',
          transform: `translateY(${dragOffsetY}px)`,
          transition: dragOffsetY === 0 ? 'transform 260ms cubic-bezier(0.2, 0.9, 0.3, 1)' : 'none',
          animation: 'ob-sheet-slide 320ms cubic-bezier(0.2, 0.9, 0.3, 1) both',
        }}
      >
        {/* drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 8 }}>
          <div
            style={{
              width: 36,
              height: 5,
              borderRadius: 3,
              background: 'rgba(255,255,255,0.25)',
            }}
          />
        </div>

        <div style={{ textAlign: 'center', marginTop: 6, marginBottom: 18 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#D4AF37',
            }}
          >
            Set up alerts
          </p>
          <h2
            style={{
              marginTop: 4,
              fontSize: 18,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.95)',
            }}
          >
            {business.name}
          </h2>
        </div>

        {/* Max price slider */}
        <div style={{ marginBottom: 24 }}>
          <p
            className="font-serif"
            style={{
              fontFamily: 'var(--font-fraunces, serif)',
              fontSize: 30,
              lineHeight: 1.1,
              letterSpacing: '-0.01em',
              color: '#D4AF37',
              textAlign: 'center',
            }}
          >
            {priceLabel}
          </p>
          <div style={{ marginTop: 14, padding: '0 4px' }}>
            <input
              type="range"
              min={minSlider}
              max={maxSlider}
              step={PRICE_STEP_CENTS}
              value={maxPriceCents}
              disabled={loadingMax}
              onChange={(e) => {
                setMaxPriceCents(Number(e.target.value));
                haptics.tap();
              }}
              aria-label="Maximum price"
              style={{
                width: '100%',
                accentColor: '#D4AF37',
              }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 11,
                color: 'rgba(255,255,255,0.4)',
                marginTop: 4,
              }}
            >
              <span>€0</span>
              <span>€{Math.round(maxSlider / 100)}</span>
            </div>
          </div>
        </div>

        {/* Days + times pill */}
        <button
          type="button"
          onClick={() => {
            haptics.tap();
            setDaysExpanded((v) => !v);
          }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 16px',
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(255,255,255,0.1)',
            borderRadius: 16,
            color: 'rgba(255,255,255,0.9)',
            fontSize: 14,
            textAlign: 'left',
          }}
        >
          <Calendar size={18} strokeWidth={1.8} />
          <span style={{ flex: 1 }}>{daysSummary}</span>
          <ChevronDown
            size={18}
            strokeWidth={1.8}
            style={{
              transform: daysExpanded ? 'rotate(180deg)' : 'rotate(0)',
              transition: 'transform 200ms',
              opacity: 0.5,
            }}
          />
        </button>

        {daysExpanded && (
          <div
            style={{
              marginTop: 12,
              padding: 14,
              background: 'rgba(255,255,255,0.03)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
            }}
          >
            <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
              {UI_DAYS.map((label, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  aria-pressed={daySelected[i]}
                  style={{
                    flex: 1,
                    aspectRatio: '1 / 1',
                    borderRadius: '50%',
                    border: '0.5px solid rgba(255,255,255,0.1)',
                    background: daySelected[i] ? '#D4AF37' : 'rgba(255,255,255,0.04)',
                    color: daySelected[i] ? '#000' : 'rgba(255,255,255,0.7)',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div
              style={{
                marginTop: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Clock size={16} strokeWidth={1.8} style={{ opacity: 0.5 }} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>From</span>
              <input
                type="time"
                value={timeStart}
                onChange={(e) => setTimeStart(e.target.value)}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '0.5px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  color: 'rgba(255,255,255,0.95)',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  colorScheme: 'dark',
                }}
              />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>To</span>
              <input
                type="time"
                value={timeEnd}
                onChange={(e) => setTimeEnd(e.target.value)}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '0.5px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  color: 'rgba(255,255,255,0.95)',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  colorScheme: 'dark',
                }}
              />
            </div>
          </div>
        )}

        {/* Save */}
        <button
          type="button"
          onClick={save}
          disabled={saving || loadingMax}
          style={{
            marginTop: 22,
            width: '100%',
            padding: '14px 18px',
            borderRadius: 999,
            background: '#D4AF37',
            color: '#000',
            fontWeight: 600,
            fontSize: 15,
            border: 'none',
            cursor: saving ? 'default' : 'pointer',
            opacity: saving || loadingMax ? 0.6 : 1,
            boxShadow: '0 8px 22px rgba(212,175,55,0.28)',
            transition: 'transform 140ms',
          }}
        >
          {saving ? 'Saving…' : 'Save alert'}
        </button>

        {error && (
          <p style={{ marginTop: 10, fontSize: 12, color: '#FF6B6B', textAlign: 'center' }}>
            {error}
          </p>
        )}

        <p
          style={{
            marginTop: 12,
            fontSize: 11.5,
            color: 'rgba(255,255,255,0.4)',
            textAlign: 'center',
          }}
        >
          We&rsquo;ll only ping you between 08:00 and 21:00 Dublin time.
        </p>
      </div>

      <style jsx>{`
        @keyframes ob-sheet-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes ob-sheet-slide {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
