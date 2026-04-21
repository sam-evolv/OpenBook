import { UserCheck } from 'lucide-react';
import { Card } from '../Card';
import { Button } from '../Button';
import { formatPrice } from '@/lib/supabase';

interface WinBackCalloutProps {
  slippingCount: number;
  potentialLtvCents: number;
}

/**
 * Rendered only when there's slipping customers. Uses the amber/warning
 * treatment (not gold) to reinforce "attention needed".
 */
export function WinBackCallout({ slippingCount, potentialLtvCents }: WinBackCalloutProps) {
  if (slippingCount === 0) return null;

  return (
    <Card variant="warning">
      <div className="flex items-center gap-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 shrink-0">
          <UserCheck size={14} className="text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13.5px] font-semibold text-paper-text-1 dark:text-ink-text-1">
            {slippingCount} {slippingCount === 1 ? 'customer is' : 'customers are'} slipping away
          </div>
          <div className="text-[12px] text-paper-text-2 dark:text-ink-text-2 mt-0.5">
            Last booked 4–8 weeks ago. A win-back offer can save{' '}
            <span className="font-semibold text-paper-text-1 dark:text-ink-text-1">
              {formatPrice(potentialLtvCents)} LTV
            </span>
            .
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          disabled
          title="Coming in Marketing"
          className="cursor-not-allowed"
        >
          Send win-back
        </Button>
      </div>
    </Card>
  );
}
