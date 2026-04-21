'use client';

import { TILE_PALETTE_MAP } from '@/lib/tile-palette';
import { colourForStaff } from '@/lib/dashboard-v2/staff-colours';
import type { StaffRow } from '@/lib/dashboard-v2/calendar-queries';
import { cn } from '@/lib/utils';

interface StaffFilterBarProps {
  staff: StaffRow[];
  active: string | 'all';
  onChange: (next: string | 'all') => void;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function StaffFilterBar({ staff, active, onChange }: StaffFilterBarProps) {
  if (staff.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="text-[11px] uppercase tracking-[0.4px] font-medium text-paper-text-3 dark:text-ink-text-3 mr-1">
        Viewing
      </div>
      <button
        type="button"
        onClick={() => onChange('all')}
        className={cn(
          'flex items-center gap-2 h-8 px-3 rounded-full text-[12.5px] font-medium transition-colors',
          active === 'all'
            ? 'bg-paper-surface2 dark:bg-ink-surface2 border border-paper-borderStrong dark:border-ink-borderStrong text-paper-text-1 dark:text-ink-text-1'
            : 'border border-paper-border dark:border-ink-border text-paper-text-2 dark:text-ink-text-2 hover:text-paper-text-1 dark:hover:text-ink-text-1',
        )}
      >
        <span className="flex">
          {staff.slice(0, 3).map((s, i) => {
            const mid = TILE_PALETTE_MAP[colourForStaff(s)].mid;
            return (
              <span
                key={s.id}
                aria-hidden
                className="h-4 w-4 rounded-full border-[1.5px] border-paper-bg dark:border-ink-bg"
                style={{
                  background: mid,
                  marginLeft: i > 0 ? -5 : 0,
                }}
              />
            );
          })}
        </span>
        All team
      </button>
      {staff.map((s) => {
        const slug = colourForStaff(s);
        const mid = TILE_PALETTE_MAP[slug].mid;
        const isActive = active === s.id;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            className={cn(
              'flex items-center gap-1.5 h-8 pl-1 pr-3 rounded-full text-[12.5px] font-medium transition-colors',
              isActive
                ? 'bg-paper-surface2 dark:bg-ink-surface2 border border-paper-borderStrong dark:border-ink-borderStrong text-paper-text-1 dark:text-ink-text-1'
                : 'border border-paper-border dark:border-ink-border text-paper-text-2 dark:text-ink-text-2 hover:text-paper-text-1 dark:hover:text-ink-text-1',
            )}
          >
            <span
              className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-[9.5px] font-bold text-black"
              style={{ background: mid }}
            >
              {initials(s.name)}
            </span>
            {s.name}
          </button>
        );
      })}
    </div>
  );
}
