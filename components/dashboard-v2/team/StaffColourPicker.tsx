'use client';

import { TILE_PALETTE_MAP } from '@/lib/tile-palette';
import {
  STAFF_COLOUR_PALETTE,
  colourForStaff,
} from '@/lib/dashboard-v2/staff-colours';
import { cn } from '@/lib/utils';

interface StaffColourPickerProps {
  /** Staff id — used to compute the hash fallback preview. */
  staffId: string;
  value: string | null;
  onChange: (next: string | null) => void;
}

export function StaffColourPicker({ staffId, value, onChange }: StaffColourPickerProps) {
  const fallback = colourForStaff({ id: staffId, colour: null });
  const effective = value ?? fallback;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {STAFF_COLOUR_PALETTE.map((slug) => {
          const mid = TILE_PALETTE_MAP[slug].mid;
          const isActive = effective === slug;
          return (
            <button
              key={slug}
              type="button"
              onClick={() => onChange(slug)}
              aria-label={slug}
              className={cn(
                'relative h-8 w-8 rounded-full transition-transform',
                isActive
                  ? 'ring-2 ring-offset-2 ring-offset-paper-bg dark:ring-offset-ink-bg scale-105'
                  : 'hover:scale-105',
              )}
              style={{
                background: mid,
                boxShadow: isActive ? `0 0 0 2px ${mid}` : undefined,
              }}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-2 text-[11.5px] text-paper-text-3 dark:text-ink-text-3">
        {value === null && fallback === effective ? (
          <>
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: TILE_PALETTE_MAP[fallback].mid }}
            />
            Default (hashed from staff id). Click a swatch to override.
          </>
        ) : (
          <>
            Using{' '}
            <span className="font-medium text-paper-text-2 dark:text-ink-text-2">
              {effective}
            </span>
            .{' '}
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-gold hover:underline"
            >
              Reset to default
            </button>
          </>
        )}
      </div>
    </div>
  );
}
