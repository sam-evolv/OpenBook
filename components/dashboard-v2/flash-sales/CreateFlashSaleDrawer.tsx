'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Drawer } from '../Drawer';
import { Button } from '../Button';
import {
  TARGET_AUDIENCES,
  type QuietSuggestion,
  type TargetAudience,
} from '@/lib/dashboard-v2/flash-sales-queries';
import { createFlashSaleDraftAction } from '@/app/(dashboard)/dashboard/flash-sales/actions';
import { formatPrice } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface CreateFlashSaleDrawerProps {
  open: boolean;
  onClose: () => void;
  services: Array<{
    id: string;
    name: string;
    price_cents: number;
    duration_minutes: number;
  }>;
  audienceCounts: Record<TargetAudience, number>;
  optedInCount: number;
  totalCustomerCount: number;
  /** If opened from a quiet suggestion, prefills the slot field. */
  prefillSlot: QuietSuggestion | null;
  onCreated?: () => void;
}

function toLocalInputValue(iso: string): string {
  // Convert an ISO string to the `YYYY-MM-DDTHH:mm` format <input type="datetime-local"> expects.
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localToIso(local: string): string {
  if (!local) return '';
  return new Date(local).toISOString();
}

export function CreateFlashSaleDrawer({
  open,
  onClose,
  services,
  audienceCounts,
  optedInCount,
  totalCustomerCount,
  prefillSlot,
  onCreated,
}: CreateFlashSaleDrawerProps) {
  const [serviceId, setServiceId] = useState<string>('');
  const [slotLocal, setSlotLocal] = useState<string>('');
  const [discount, setDiscount] = useState<number>(20);
  const [maxBookings, setMaxBookings] = useState<number>(1);
  const [expiresInHours, setExpiresInHours] = useState<number>(6);
  const [message, setMessage] = useState<string>('');
  const [audience, setAudience] = useState<TargetAudience>('favourites');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Reset form every open.
  useEffect(() => {
    if (!open) return;
    setServiceId(services[0]?.id ?? '');
    setSlotLocal(prefillSlot ? toLocalInputValue(prefillSlot.slot_time) : '');
    setDiscount(20);
    setMaxBookings(1);
    setExpiresInHours(6);
    setMessage('');
    setAudience('favourites');
    setError(null);
  }, [open, prefillSlot, services]);

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [services, serviceId],
  );

  const salePrice = selectedService
    ? Math.round(selectedService.price_cents * (1 - discount / 100))
    : null;

  const targetSize = audienceCounts[audience] ?? 0;

  function onSubmit() {
    setError(null);
    if (!serviceId) return setError('Pick a service');
    if (!slotLocal) return setError('Pick a slot');
    const iso = localToIso(slotLocal);
    if (!iso) return setError('Invalid slot time');

    startTransition(async () => {
      const res = await createFlashSaleDraftAction({
        serviceId,
        slotTimeIso: iso,
        discountPercent: discount,
        maxBookings,
        message: message.trim() || null,
        audience,
        expiresInHours,
        sourceHint: prefillSlot ? 'quiet_suggestion' : 'manual',
      });
      if (res.ok) {
        onCreated?.();
        onClose();
      } else {
        setError(res.error);
      }
    });
  }

  if (services.length === 0) {
    return (
      <Drawer open={open} onClose={onClose} title="Create flash sale" width="md">
        <div className="text-[13px] leading-relaxed text-paper-text-2 dark:text-ink-text-2">
          You need at least one active service before you can run a flash sale.
          Add one on the Catalog page.
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Create flash sale"
      subtitle={prefillSlot ? `Targeting ${prefillSlot.window_label}` : undefined}
      width="md"
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11.5px] text-paper-text-3 dark:text-ink-text-3">
            Saves as a draft. Nothing sends in Stage 1.
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="md" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={onSubmit}
              disabled={isPending}
            >
              {isPending ? 'Saving\u2026' : 'Save draft'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {error && (
          <div className="text-[12.5px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <Field label="Service">
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className={fieldInput}
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {formatPrice(s.price_cents)} · {s.duration_minutes} min
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Slot"
          hint="Exact date and time customers can book at the sale price."
        >
          <input
            type="datetime-local"
            value={slotLocal}
            onChange={(e) => setSlotLocal(e.target.value)}
            className={fieldInput}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={`Discount · ${discount}%`}>
            <input
              type="range"
              min={5}
              max={50}
              step={5}
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              className="w-full accent-gold"
            />
          </Field>
          <Field label="Max bookings">
            <input
              type="number"
              min={1}
              max={50}
              value={maxBookings}
              onChange={(e) => setMaxBookings(Number(e.target.value))}
              className={fieldInput}
            />
          </Field>
        </div>

        <Field label="Expires after" hint="How long the sale stays claimable.">
          <select
            value={expiresInHours}
            onChange={(e) => setExpiresInHours(Number(e.target.value))}
            className={fieldInput}
          >
            <option value={3}>3 hours</option>
            <option value={6}>6 hours</option>
            <option value={12}>12 hours</option>
            <option value={24}>24 hours</option>
            <option value={48}>48 hours</option>
          </select>
        </Field>

        {salePrice != null && selectedService && (
          <div className="rounded-lg border border-gold-border bg-gold-soft px-3 py-2.5 text-[12.5px]">
            <div className="text-paper-text-2 dark:text-ink-text-2">
              Sale price:{' '}
              <span className="font-semibold text-paper-text-1 dark:text-ink-text-1">
                {formatPrice(salePrice)}
              </span>{' '}
              <span className="text-paper-text-3 dark:text-ink-text-3 line-through">
                {formatPrice(selectedService.price_cents)}
              </span>
            </div>
          </div>
        )}

        <Field label="Message" hint="Optional. Appears above the service details in the offer.">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Last-minute opening — 20% off your next session."
            className={cn(fieldInput, 'resize-none')}
          />
        </Field>

        <Field label="Audience">
          <div className="space-y-1.5">
            {TARGET_AUDIENCES.map((a) => {
              const count = audienceCounts[a.value] ?? 0;
              const selected = audience === a.value;
              return (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setAudience(a.value)}
                  className={cn(
                    'w-full text-left rounded-lg border px-3 py-2 transition-colors',
                    selected
                      ? 'border-gold bg-gold-soft'
                      : 'border-paper-border dark:border-ink-border bg-paper-surface dark:bg-ink-surface hover:bg-paper-surface2 dark:hover:bg-ink-surface2',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-paper-text-1 dark:text-ink-text-1">
                      {a.label}
                    </span>
                    <span className="text-[11.5px] tabular-nums text-paper-text-3 dark:text-ink-text-3">
                      {count} {count === 1 ? 'person' : 'people'}
                    </span>
                  </div>
                  <div className="text-[11.5px] text-paper-text-3 dark:text-ink-text-3 mt-0.5">
                    {a.hint}
                  </div>
                </button>
              );
            })}
          </div>
        </Field>

        <div className="rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 px-3 py-2.5 text-[12px] text-amber-800 dark:text-amber-300 leading-relaxed">
          <div className="font-semibold mb-0.5">Dry run — no messages will send</div>
          Will target <span className="font-semibold">{targetSize}</span>{' '}
          {targetSize === 1 ? 'customer' : 'customers'} on publish, but {optedInCount} of {totalCustomerCount}{' '}
          are opted-in. Opt-ins arrive in Stage 2 via WhatsApp
          YES replies and owner invites.
        </div>
      </div>
    </Drawer>
  );
}

const fieldInput =
  'w-full h-9 rounded-md border border-paper-border dark:border-ink-border bg-paper-surface dark:bg-ink-surface px-2.5 text-[13px] text-paper-text-1 dark:text-ink-text-1 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-[11px] font-semibold uppercase tracking-[0.4px] text-paper-text-3 dark:text-ink-text-3 mb-1.5">
        {label}
      </div>
      {children}
      {hint && (
        <div className="mt-1 text-[11.5px] text-paper-text-3 dark:text-ink-text-3">
          {hint}
        </div>
      )}
    </label>
  );
}
