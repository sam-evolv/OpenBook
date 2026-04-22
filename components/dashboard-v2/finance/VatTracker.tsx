import { Receipt, FileText } from 'lucide-react';
import { Card } from '../Card';
import { Button } from '../Button';
import { formatPrice } from '@/lib/supabase';
import type { FinancePayload } from '@/lib/dashboard-v2/finance-queries';
import { cn } from '@/lib/utils';

export function VatTracker({ vat }: { vat: FinancePayload['vat'] }) {
  const warn = vat.percent > 80;
  const crossed = vat.accruedCents >= vat.thresholdCents;

  return (
    <Card padding="none">
      <div
        className={cn(
          'grid grid-cols-1 lg:grid-cols-[1fr_2fr] rounded-xl',
          warn
            ? 'bg-gradient-to-br from-amber-50 to-transparent dark:from-amber-950/20'
            : 'bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-950/20',
        )}
      >
        <div className="p-5 border-b lg:border-b-0 lg:border-r border-paper-border dark:border-ink-border">
          <div className="flex items-center gap-2 mb-2.5">
            <Receipt
              size={14}
              className={warn ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}
            />
            <div
              className={cn(
                'text-[11px] font-semibold uppercase tracking-[0.5px]',
                warn
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-blue-600 dark:text-blue-400',
              )}
            >
              Irish VAT threshold
            </div>
          </div>
          <div className="text-[32px] font-semibold tabular-nums tracking-tight leading-none text-paper-text-1 dark:text-ink-text-1">
            {formatPrice(vat.accruedCents)}
          </div>
          <div className="mt-1.5 text-[12px] text-paper-text-2 dark:text-ink-text-2">
            of {formatPrice(vat.thresholdCents)} services threshold
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-paper-surface3 dark:bg-ink-surface3 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, vat.percent)}%`,
                background: warn ? '#D97706' : '#3B82F6',
              }}
            />
          </div>
          <div className="mt-2 text-[11.5px] text-paper-text-3 dark:text-ink-text-3">
            Rolling 12 months · updated on every load
          </div>
        </div>
        <div className="p-5">
          <div className="text-[13px] font-semibold text-paper-text-1 dark:text-ink-text-1 mb-2">
            {crossed
              ? 'You have passed the VAT registration threshold'
              : `You're ${Math.round(vat.percent)}% of the way to the VAT registration threshold`}
          </div>
          <div className="text-[12px] leading-relaxed text-paper-text-2 dark:text-ink-text-2 mb-3.5">
            In Ireland, once your services turnover in any rolling 12-month period hits{' '}
            <strong className="text-paper-text-1 dark:text-ink-text-1">€42,500 (services)</strong>{' '}
            or{' '}
            <strong className="text-paper-text-1 dark:text-ink-text-1">€85,000 (goods)</strong>,
            you must register for VAT and charge 23% on services. At your current pace
            {vat.crossingIn ? (
              <>
                , you'll cross the threshold around{' '}
                <strong className="text-paper-text-1 dark:text-ink-text-1">
                  {vat.crossingIn}
                </strong>
                .
              </>
            ) : crossed ? (
              '. Talk to an accountant about registering.'
            ) : (
              '.'
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<FileText size={13} strokeWidth={2} />}
              disabled
              title="VAT projection report coming in the next cycle"
            >
              VAT projection
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled
              title="Accountant partner directory coming soon"
            >
              Talk to an accountant
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
