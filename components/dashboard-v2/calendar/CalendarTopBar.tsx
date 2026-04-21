'use client';

import { Plus } from 'lucide-react';
import { TopBar } from '../TopBar';
import { Button } from '../Button';
import { cn } from '@/lib/utils';

export type CalendarView = 'day' | 'week' | 'month';

interface CalendarTopBarProps {
  view: CalendarView;
  onChangeView: (v: CalendarView) => void;
  onNewBooking: () => void;
  newBookingDisabled?: boolean;
}

const VIEWS: { id: CalendarView; label: string; live: boolean }[] = [
  { id: 'day', label: 'Day', live: true },
  { id: 'week', label: 'Week', live: true },
  { id: 'month', label: 'Month', live: false },
];

export function CalendarTopBar({
  view,
  onChangeView,
  onNewBooking,
  newBookingDisabled,
}: CalendarTopBarProps) {
  return (
    <TopBar
      title="Calendar"
      subtitle="Your week at a glance — click any slot to book"
      actions={
        <>
          <div
            className="flex gap-0.5 p-0.5 rounded-lg bg-paper-surface dark:bg-ink-surface border border-paper-border dark:border-ink-border"
            role="tablist"
          >
            {VIEWS.map((v) => {
              const active = view === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => v.live && onChangeView(v.id)}
                  disabled={!v.live}
                  title={v.live ? undefined : 'Coming soon'}
                  className={cn(
                    'px-3 py-1 rounded-md text-[12px] font-medium transition-colors',
                    active
                      ? 'bg-paper-surface2 dark:bg-ink-surface2 text-paper-text-1 dark:text-ink-text-1'
                      : 'text-paper-text-3 dark:text-ink-text-3 hover:text-paper-text-1 dark:hover:text-ink-text-1',
                    !v.live && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  {v.label}
                  {!v.live && (
                    <span className="ml-1.5 text-[9.5px] uppercase tracking-[0.3px] text-gold">
                      Soon
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <Button
            variant="primary"
            size="md"
            icon={<Plus size={13} strokeWidth={2} />}
            onClick={onNewBooking}
            disabled={newBookingDisabled}
          >
            New booking
          </Button>
        </>
      }
    />
  );
}
