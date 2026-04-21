import { Heart } from 'lucide-react';
import { Card } from '../Card';
import { Button } from '../Button';

interface FavouritesCalloutProps {
  count: number;
}

/**
 * Rendered only when count > 0. Below that, there's nothing useful to
 * say — empty state elsewhere handles the "no customers yet" message.
 */
export function FavouritesCallout({ count }: FavouritesCalloutProps) {
  if (count === 0) return null;

  return (
    <Card variant="gold">
      <div className="flex items-center gap-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gold-soft border border-gold-border shrink-0">
          <Heart size={14} className="text-gold" fill="currentColor" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13.5px] font-semibold text-paper-text-1 dark:text-ink-text-1">
            {count} {count === 1 ? 'customer has' : 'customers have'} you favourited
          </div>
          <div className="text-[12px] text-paper-text-2 dark:text-ink-text-2 mt-0.5">
            These are the customers who'll receive flash sale notifications when you run one.
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          disabled
          title="Coming in Marketing"
          className="cursor-not-allowed"
        >
          Send broadcast
        </Button>
      </div>
    </Card>
  );
}
