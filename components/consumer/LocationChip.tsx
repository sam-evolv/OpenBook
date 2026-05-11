/**
 * LocationChip — single chip that opens a sheet listing Irish cities +
 * "Anywhere in Ireland". Persists to localStorage `ob_explore_city`.
 *
 * For PR 2 the geolocation "Use my location" option is left out; will
 * be wired in once the distance line on cards lands (needs navigator.geolocation
 * and a city resolver). Spec calls it out as silent-hidden if not granted.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

export type CityValue = string; // "anywhere" or a lowercase city slug, e.g. "cork"

const CITIES: ReadonlyArray<{ id: CityValue; label: string }> = [
  { id: 'anywhere', label: 'Anywhere in Ireland' },
  { id: 'cork', label: 'Cork' },
  { id: 'dublin', label: 'Dublin' },
  { id: 'galway', label: 'Galway' },
  { id: 'limerick', label: 'Limerick' },
  { id: 'waterford', label: 'Waterford' },
];

type Props = {
  value: CityValue;
  onChange: (next: CityValue) => void;
};

export function LocationChip({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const label = CITIES.find((c) => c.id === value)?.label ?? 'Anywhere in Ireland';
  const chipText = value === 'anywhere' ? 'Anywhere' : label;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="
          inline-flex items-center gap-1.5 h-9 px-3 rounded-full
          text-[13.5px] font-medium text-white/80
          bg-white/[0.03] border border-white/[0.08]
          transition active:scale-95
        "
      >
        {chipText}
        <ChevronDown className="w-3.5 h-3.5 text-white/50" strokeWidth={2.2} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Choose location"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            ref={sheetRef}
            onClick={(e) => e.stopPropagation()}
            className="
              relative w-full sm:max-w-md
              bg-[#0E0E0E] border-t sm:border border-white/10
              sm:rounded-2xl rounded-t-2xl
              px-5 pt-5 pb-8
              animate-[slideUp_180ms_ease-out]
            "
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-[20px] font-medium text-white">
                Where?
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-white/[0.04] border border-white/[0.08]"
              >
                <X className="w-4 h-4 text-white/70" strokeWidth={2.2} />
              </button>
            </div>
            <ul className="flex flex-col">
              {CITIES.map((c) => {
                const active = c.id === value;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(c.id);
                        setOpen(false);
                      }}
                      className={`
                        w-full h-[52px] flex items-center justify-between
                        text-left text-[15px]
                        border-b border-white/[0.06] last:border-b-0
                        ${active ? 'text-[#D4AF37] font-medium' : 'text-white/85'}
                      `}
                    >
                      {c.label}
                      {active && (
                        <span className="text-[12px] uppercase tracking-[0.1em] text-[#D4AF37]">
                          Selected
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
