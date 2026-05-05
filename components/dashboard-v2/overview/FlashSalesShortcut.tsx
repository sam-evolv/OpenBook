import Link from 'next/link';
import { Zap, ArrowRight } from 'lucide-react';
import { Card } from '../Card';

export function FlashSalesShortcut() {
  return (
    <Link href="/dashboard/flash-sales" className="block group">
      <Card variant="gold" padding="md" className="hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gold-soft border border-gold-border text-gold">
            <Zap size={16} strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] font-semibold text-paper-text-1 dark:text-ink-text-1">
              Flash sales
            </div>
            <div className="mt-0.5 text-[12px] text-paper-text-3 dark:text-ink-text-3 leading-[1.4]">
              Run a time-boxed offer to fill quiet slots — your favourites get notified first.
            </div>
          </div>
          <div className="flex items-center gap-1 text-[12px] font-medium text-gold shrink-0 group-hover:translate-x-0.5 transition-transform">
            Open
            <ArrowRight size={12} />
          </div>
        </div>
      </Card>
    </Link>
  );
}
