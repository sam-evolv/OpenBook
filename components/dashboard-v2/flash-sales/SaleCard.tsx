'use client';

import { useTransition } from 'react';
import { Trash2, Send, Clock, Ticket } from 'lucide-react';
import { Card } from '../Card';
import { Button } from '../Button';
import { StatusPill } from '../StatusPill';
import type { FlashSaleRow, TargetAudience } from '@/lib/dashboard-v2/flash-sales-queries';
import { formatPrice } from '@/lib/supabase';
import {
  discardFlashSaleAction,
  publishFlashSaleDryRunAction,
} from '@/app/(dashboard)/dashboard/flash-sales/actions';

interface SaleCardProps {
  sale: FlashSaleRow;
  /** Only meaningful for drafts; ignored otherwise. */
  audience: TargetAudience;
  onChanged?: () => void;
}

function formatSlot(iso: string): string {
  return new Date(iso).toLocaleString('en-IE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function SaleCard({ sale, audience, onChanged }: SaleCardProps) {
  const [isPending, startTransition] = useTransition();

  const isDraft = sale.ui_state === 'draft';
  const isPast = sale.ui_state === 'past';

  function onDiscard() {
    if (!confirm('Discard this flash sale?')) return;
    startTransition(async () => {
      await discardFlashSaleAction(sale.id);
      onChanged?.();
    });
  }

  function onPublish() {
    startTransition(async () => {
      await publishFlashSaleDryRunAction({ saleId: sale.id, audience });
      onChanged?.();
    });
  }

  return (
    <Card padding="md">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-soft border border-gold-border">
          <Ticket size={16} className="text-gold" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-[14.5px] font-semibold tracking-tight text-paper-text-1 dark:text-ink-text-1 truncate">
              {sale.service_name ?? 'Service removed'}
            </h3>
            <StatusPill status={isDraft ? 'warning' : isPast ? 'info' : 'success'}>
              {isDraft ? 'Draft' : isPast ? 'Past' : 'Upcoming'}
            </StatusPill>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-paper-text-2 dark:text-ink-text-2">
            <span className="inline-flex items-center gap-1.5">
              <Clock size={11} />
              {formatSlot(sale.slot_time)}
            </span>
            <span>·</span>
            <span>
              {formatPrice(sale.sale_price_cents)}{' '}
              <span className="text-paper-text-3 dark:text-ink-text-3 line-through">
                {formatPrice(sale.original_price_cents)}
              </span>
            </span>
            <span>·</span>
            <span className="font-medium text-gold">
              {sale.discount_percent}% off
            </span>
            {sale.max_bookings != null && (
              <>
                <span>·</span>
                <span>
                  {sale.bookings_taken ?? 0} / {sale.max_bookings} claimed
                </span>
              </>
            )}
          </div>

          {sale.message && (
            <p className="mt-2 text-[12.5px] leading-relaxed text-paper-text-2 dark:text-ink-text-2 line-clamp-2">
              {sale.message}
            </p>
          )}

          {!isDraft && sale.notifications_total > 0 && (
            <div className="mt-2 text-[11.5px] text-paper-text-3 dark:text-ink-text-3">
              {sale.notifications_queued > 0 && (
                <span className="mr-3">
                  <span className="font-semibold text-paper-text-2 dark:text-ink-text-2">
                    {sale.notifications_queued}
                  </span>{' '}
                  queued
                </span>
              )}
              {sale.notifications_blocked > 0 && (
                <span>
                  <span className="font-semibold text-paper-text-2 dark:text-ink-text-2">
                    {sale.notifications_blocked}
                  </span>{' '}
                  blocked · no opt-in
                </span>
              )}
            </div>
          )}
        </div>

        {isDraft ? (
          <div className="flex flex-col gap-1.5 shrink-0">
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={<Send size={12} />}
              onClick={onPublish}
              disabled={isPending}
            >
              {isPending ? 'Publishing\u2026' : 'Publish (dry run)'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon={<Trash2 size={12} />}
              onClick={onDiscard}
              disabled={isPending}
            >
              Discard
            </Button>
          </div>
        ) : !isPast ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={<Trash2 size={12} />}
            onClick={onDiscard}
            disabled={isPending}
          >
            Discard
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
