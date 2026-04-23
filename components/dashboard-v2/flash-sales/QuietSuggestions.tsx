'use client';

import { Zap } from 'lucide-react';
import { Card } from '../Card';
import { Button } from '../Button';
import type { QuietSuggestion } from '@/lib/dashboard-v2/flash-sales-queries';

interface QuietSuggestionsProps {
  suggestions: QuietSuggestion[];
  onPick: (slot: QuietSuggestion) => void;
}

export function QuietSuggestions({ suggestions, onPick }: QuietSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <Card variant="gold" padding="md">
      <div className="flex items-center gap-2 mb-3">
        <Zap size={13} className="text-gold" strokeWidth={2} />
        <span className="text-[11px] font-semibold uppercase tracking-[0.4px] text-gold">
          AI suggestions
        </span>
      </div>
      <p className="text-[13px] leading-relaxed text-paper-text-2 dark:text-ink-text-2 mb-3.5">
        These afternoons are light on bookings over the next 7 days. Good
        candidates for a flash sale.
      </p>
      <ul className="space-y-2">
        {suggestions.map((s) => (
          <li
            key={s.slot_time}
            className="flex items-center gap-3 rounded-lg border border-gold-border bg-paper-bg dark:bg-ink-bg px-3 py-2"
          >
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-paper-text-1 dark:text-ink-text-1 truncate">
                {s.window_label}
              </div>
              <div className="text-[11.5px] text-paper-text-3 dark:text-ink-text-3">
                {s.existing_bookings === 0
                  ? 'Nothing booked yet'
                  : `${s.existing_bookings} ${s.existing_bookings === 1 ? 'booking' : 'bookings'} so far`}
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onPick(s)}
            >
              Draft sale
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
