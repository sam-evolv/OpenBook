'use client';

import { Search } from 'lucide-react';
import type { CohortStatus } from '@/lib/dashboard-v2/customers-queries';
import { cn } from '@/lib/utils';

export type CohortFilter = 'all' | 'favourites' | CohortStatus;

export interface CustomerFiltersProps {
  active: CohortFilter;
  counts: Record<CohortFilter, number>;
  onChange: (next: CohortFilter) => void;
  searchDraft: string;
  onSearchChange: (value: string) => void;
  onSearchCommit: () => void;
}

const FILTERS: { id: CohortFilter; label: string; tone?: 'gold' | 'warning' | 'danger' }[] = [
  { id: 'all', label: 'All' },
  { id: 'favourites', label: 'Favourites', tone: 'gold' },
  { id: 'regular', label: 'Regular' },
  { id: 'new', label: 'New' },
  { id: 'slipping', label: 'Slipping', tone: 'warning' },
  { id: 'churned', label: 'Churned', tone: 'danger' },
];

const TONE_CLASSES = {
  gold: 'text-gold',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-red-500 dark:text-red-400',
} as const;

export function CustomerFilters({
  active,
  counts,
  onChange,
  searchDraft,
  onSearchChange,
  onSearchCommit,
}: CustomerFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {FILTERS.map((f) => {
        const isActive = active === f.id;
        const tone = f.tone;
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange(f.id)}
            className={cn(
              'flex items-center gap-1.5 h-8 px-3 rounded-md text-[13px] font-medium transition-colors',
              isActive
                ? 'bg-paper-surface2 dark:bg-ink-surface2 border border-paper-borderStrong dark:border-ink-borderStrong text-paper-text-1 dark:text-ink-text-1'
                : 'border border-paper-border dark:border-ink-border text-paper-text-2 dark:text-ink-text-2 hover:text-paper-text-1 dark:hover:text-ink-text-1',
            )}
          >
            {f.label}
            <span
              className={cn(
                'text-[11px] tabular-nums',
                tone ? TONE_CLASSES[tone] : 'text-paper-text-3 dark:text-ink-text-3',
              )}
            >
              {counts[f.id] ?? 0}
            </span>
          </button>
        );
      })}
      <div className="flex-1" />
      <div className="relative">
        <Search
          size={13}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-paper-text-3 dark:text-ink-text-3 pointer-events-none"
        />
        <input
          type="search"
          value={searchDraft}
          onChange={(e) => onSearchChange(e.target.value)}
          onBlur={onSearchCommit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSearchCommit();
            }
          }}
          placeholder="Search customer or phone…"
          className="h-8 w-56 rounded-md border border-paper-border dark:border-ink-border bg-paper-surface dark:bg-ink-surface pl-8 pr-3 text-[12.5px] text-paper-text-1 dark:text-ink-text-1 placeholder:text-paper-text-3 dark:placeholder:text-ink-text-3 outline-none focus:ring-2 focus:ring-gold focus:border-gold"
        />
      </div>
    </div>
  );
}
