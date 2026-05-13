'use client';

/**
 * AlertsList — renders the customer's standing_slots inside /me.
 *
 * Each row shows the business (or category fallback) + a one-line summary,
 * an active/paused toggle, and a swipe-left affordance to delete. Patches
 * and deletes hit the /api/standing-slots/[id] endpoints with optimistic
 * UI; failures revert.
 */

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { formatEUR } from '@/lib/money';

interface BusinessLite {
  id: string;
  name: string;
  slug: string;
}

export interface AlertSlot {
  id: string;
  business_id: string | null;
  category: string | null;
  city: string | null;
  max_price_cents: number;
  day_mask: number;
  time_start: string;
  time_end: string;
  active: boolean;
  paused_until: string | null;
  businesses?: BusinessLite | null;
}

const DAY_LABELS_DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ALL_DAYS_MASK = 127;

function summarise(slot: AlertSlot): string {
  const parts: string[] = [`Under ${formatEUR(slot.max_price_cents)}`];
  if (slot.day_mask !== ALL_DAYS_MASK) {
    const days: string[] = [];
    for (let dow = 0; dow < 7; dow++) {
      if (slot.day_mask & (1 << dow)) days.push(DAY_LABELS_DOW[dow]);
    }
    parts.push(days.join('/'));
  } else {
    parts.push('Any day');
  }
  const tStart = slot.time_start.slice(0, 5);
  const tEnd = slot.time_end.slice(0, 5);
  if (!(tStart === '00:00' && (tEnd === '23:59' || tEnd === '23:59:00' || tEnd === '23:59'))) {
    parts.push(`${tStart}–${tEnd}`);
  }
  return parts.join(' · ');
}

function alertTitle(slot: AlertSlot): string {
  if (slot.businesses?.name) return slot.businesses.name;
  if (slot.category && slot.city) return `Any ${slot.category} in ${slot.city}`;
  if (slot.category) return `Any ${slot.category}`;
  return 'Open spot alert';
}

export function AlertsList({ initialAlerts }: { initialAlerts: AlertSlot[] }) {
  const [alerts, setAlerts] = useState<AlertSlot[]>(initialAlerts);
  const [swipingId, setSwipingId] = useState<string | null>(null);

  async function toggleActive(slot: AlertSlot) {
    const next = !slot.active;
    haptics.tap();
    setAlerts((curr) =>
      curr.map((s) => (s.id === slot.id ? { ...s, active: next } : s)),
    );
    try {
      const res = await fetch(`/api/standing-slots/${slot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: next }),
      });
      if (!res.ok) throw new Error('patch failed');
    } catch (err) {
      console.error('[AlertsList toggle] failed', err);
      haptics.error();
      setAlerts((curr) =>
        curr.map((s) => (s.id === slot.id ? { ...s, active: !next } : s)),
      );
    }
  }

  async function remove(slot: AlertSlot) {
    haptics.warning();
    const previous = alerts;
    setAlerts((curr) => curr.filter((s) => s.id !== slot.id));
    try {
      const res = await fetch(`/api/standing-slots/${slot.id}`, {
        method: 'DELETE',
      });
      if (!res.ok && res.status !== 204) throw new Error('delete failed');
    } catch (err) {
      console.error('[AlertsList remove] failed', err);
      setAlerts(previous);
      haptics.error();
    }
  }

  if (alerts.length === 0) {
    return (
      <div
        className="rounded-[20px] border border-white/[0.075] bg-white/[0.03] px-4 py-5 text-center"
      >
        <p className="text-[13px] text-white/55">
          You don&rsquo;t have any alerts yet. Long-press a business on your
          home screen and choose &ldquo;Set up alerts&rdquo;.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {alerts.map((slot) => (
        <div
          key={slot.id}
          className="relative overflow-hidden rounded-[20px] border border-white/[0.075] bg-white/[0.04]"
        >
          {/* Delete affordance, revealed when row is swiped left. */}
          <button
            type="button"
            aria-label="Delete alert"
            onClick={() => remove(slot)}
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: 72,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#9F1F1F',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Trash2 size={18} strokeWidth={1.8} />
          </button>

          <div
            style={{
              padding: '14px 16px',
              background: 'rgba(20,20,22,0.95)',
              transform: swipingId === slot.id ? 'translateX(-72px)' : 'translateX(0)',
              transition: 'transform 220ms cubic-bezier(0.2, 0.9, 0.3, 1)',
              position: 'relative',
              zIndex: 1,
            }}
            onClick={() => setSwipingId(swipingId === slot.id ? null : slot.id)}
          >
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-white/95">
                  {alertTitle(slot)}
                </p>
                <p className="mt-0.5 truncate text-[12px] text-white/55">
                  {summarise(slot)}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={slot.active}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleActive(slot);
                }}
                style={{
                  width: 44,
                  height: 26,
                  borderRadius: 13,
                  padding: 2,
                  background: slot.active ? '#D4AF37' : 'rgba(120,120,128,0.32)',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: slot.active ? 'flex-end' : 'flex-start',
                  transition: 'background 220ms',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: '#fff',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
                  }}
                />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
