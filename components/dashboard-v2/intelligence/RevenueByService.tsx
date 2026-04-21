import { Card } from '../Card';
import { formatPrice } from '@/lib/supabase';
import type { DistributionPayload } from '@/lib/dashboard-v2/intelligence-queries';

interface RevenueByServiceProps {
  services: DistributionPayload['topServices'];
}

export function RevenueByService({ services }: RevenueByServiceProps) {
  const max = services.reduce((m, s) => Math.max(m, s.revenueCents), 0);

  return (
    <Card padding="md">
      <div className="text-[11px] font-semibold uppercase tracking-[0.3px] text-paper-text-3 dark:text-ink-text-3">
        Revenue by service
      </div>
      <div className="mt-1 mb-3 text-[12px] text-paper-text-3 dark:text-ink-text-3">
        Top 5 over the last 30 days
      </div>

      {services.length === 0 ? (
        <div className="py-8 text-center text-[13px] text-paper-text-3 dark:text-ink-text-3">
          No service revenue recorded in the last 30 days.
        </div>
      ) : (
        <ul className="space-y-3">
          {services.map((s) => (
            <li key={s.id}>
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <span className="text-[13px] font-medium text-paper-text-1 dark:text-ink-text-1 truncate">
                  {s.name}
                </span>
                <span className="text-[13px] font-semibold tabular-nums text-paper-text-1 dark:text-ink-text-1">
                  {formatPrice(s.revenueCents)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-paper-surface2 dark:bg-ink-surface2 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: max === 0 ? '0%' : `${(s.revenueCents / max) * 100}%`,
                    background: 'linear-gradient(90deg, #D4AF37 0%, #B8934C 100%)',
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
