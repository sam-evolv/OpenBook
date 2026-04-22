'use client';

import { useEffect, useState, useTransition } from 'react';
import { Heart, MessageCircle, Mail } from 'lucide-react';
import { Drawer } from '../Drawer';
import { Button } from '../Button';
import { Avatar } from '../Avatar';
import { StatusPill } from '../StatusPill';
import { ContextRow } from '../ContextRow';
import {
  toggleCustomerFavourite,
  saveCustomerNotes,
} from '@/app/(dashboard)/dashboard/customers/actions';
import type { CustomerRow } from '@/lib/dashboard-v2/customers-queries';
import { formatPrice } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export interface BookingHistoryEntry {
  id: string;
  starts_at: string;
  service_name: string | null;
  status: string | null;
  price_cents: number;
}

interface CustomerDrawerProps {
  customer: CustomerRow | null;
  history: BookingHistoryEntry[];
  open: boolean;
  onClose: () => void;
  previewMode?: boolean;
  /**
   * Optional — exposed so the preview can fake the async load without
   * hitting the server action. In the real app we just rely on the
   * server-action `revalidatePath` to refresh the row on next render.
   */
  onFavouriteChange?: (customerId: string, next: boolean) => void;
}

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  confirmed: 'success',
  completed: 'info',
  pending: 'warning',
  cancelled: 'danger',
};

function whatsappHref(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  return `https://wa.me/${digits}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

function cohortPillTone(cohort: CustomerRow['cohort']) {
  switch (cohort) {
    case 'regular':
      return 'success' as const;
    case 'new':
      return 'info' as const;
    case 'slipping':
      return 'warning' as const;
    case 'churned':
      return 'danger' as const;
  }
}

export function CustomerDrawer({
  customer,
  history,
  open,
  onClose,
  previewMode,
  onFavouriteChange,
}: CustomerDrawerProps) {
  const [notes, setNotes] = useState<string>('');
  const [savedNotes, setSavedNotes] = useState<string>('');
  const [favourited, setFavourited] = useState<boolean>(false);
  const [isSavingNotes, startNotesSave] = useTransition();
  const [isTogglingFav, startFavToggle] = useTransition();
  const [notesStatus, setNotesStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [notesError, setNotesError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !customer) return;
    setNotes(customer.notes ?? '');
    setSavedNotes(customer.notes ?? '');
    setFavourited(customer.favourited);
    setNotesStatus('idle');
    setNotesError(null);
  }, [open, customer]);

  if (!customer) {
    return (
      <Drawer open={open} onClose={onClose} title="Customer">
        <div />
      </Drawer>
    );
  }

  const notesDirty = notes !== savedNotes;

  const saveNotesNow = () => {
    if (!notesDirty) return;
    if (previewMode) {
      setSavedNotes(notes);
      setNotesStatus('saved');
      setTimeout(() => setNotesStatus('idle'), 1500);
      return;
    }
    startNotesSave(async () => {
      const res = await saveCustomerNotes(customer.id, notes);
      if (res.ok) {
        setSavedNotes(notes);
        setNotesStatus('saved');
        setTimeout(() => setNotesStatus('idle'), 1500);
      } else {
        setNotesStatus('error');
        setNotesError(res.error);
      }
    });
  };

  const toggleFav = () => {
    const next = !favourited;
    setFavourited(next);
    if (previewMode) {
      onFavouriteChange?.(customer.id, next);
      return;
    }
    startFavToggle(async () => {
      const res = await toggleCustomerFavourite(customer.id, next);
      if (!res.ok) {
        // Revert on failure.
        setFavourited(!next);
      } else {
        onFavouriteChange?.(customer.id, next);
      }
    });
  };

  const cadence =
    customer.booking_count >= 2 && customer.first_booking_at && customer.last_booking_at
      ? (() => {
          const span =
            (new Date(customer.last_booking_at).getTime() -
              new Date(customer.first_booking_at).getTime()) /
            (24 * 60 * 60 * 1000);
          const daysPerBooking = span / Math.max(1, customer.booking_count - 1);
          if (daysPerBooking < 14) return 'Weekly';
          if (daysPerBooking < 35) return 'Every 2–4 weeks';
          if (daysPerBooking < 70) return 'Monthly';
          return 'Occasional';
        })()
      : 'New';

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Customer"
      subtitle={customer.display_name}
      width="lg"
      footer={
        <>
          {customer.phone && (
            <a href={whatsappHref(customer.phone)} target="_blank" rel="noopener noreferrer">
              <Button
                variant="secondary"
                size="md"
                icon={<MessageCircle size={13} strokeWidth={2} />}
              >
                WhatsApp
              </Button>
            </a>
          )}
          {customer.email && (
            <a href={`mailto:${customer.email}`}>
              <Button variant="secondary" size="md" icon={<Mail size={13} strokeWidth={2} />}>
                Email
              </Button>
            </a>
          )}
          <div className="flex-1" />
          <Button
            variant={favourited ? 'primary' : 'ghost'}
            size="md"
            icon={
              <Heart
                size={13}
                strokeWidth={2}
                fill={favourited ? 'currentColor' : 'none'}
              />
            }
            onClick={toggleFav}
            disabled={isTogglingFav}
          >
            {favourited ? 'Favourited' : 'Favourite'}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Avatar name={customer.display_name} size="lg" favourited={favourited} />
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold tracking-tight text-paper-text-1 dark:text-ink-text-1 truncate">
              {customer.display_name}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-[12px] text-paper-text-3 dark:text-ink-text-3">
              {customer.phone ?? '—'} {customer.email && <span>· {customer.email}</span>}
            </div>
          </div>
          <StatusPill status={cohortPillTone(customer.cohort)} dot>
            {customer.cohort}
          </StatusPill>
        </div>

        <section>
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.6px] text-paper-text-3 dark:text-ink-text-3 mb-2">
            Metrics
          </div>
          <div className="rounded-xl border border-paper-border dark:border-ink-border bg-paper-surface dark:bg-ink-surface">
            <ContextRow
              label="Lifetime value"
              value={formatPrice(customer.lifetime_value_cents)}
              accent
            />
            <ContextRow label="Total bookings" value={customer.booking_count} />
            <ContextRow label="Last booking" value={timeAgo(customer.last_booking_at)} />
            <ContextRow label="Cadence" value={cadence} />
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.6px] text-paper-text-3 dark:text-ink-text-3">
              Notes
            </div>
            <div
              className={cn(
                'text-[11px] tabular-nums transition-opacity',
                notesStatus === 'saved'
                  ? 'text-emerald-500 dark:text-emerald-400 opacity-100'
                  : notesStatus === 'error'
                    ? 'text-red-500 dark:text-red-400 opacity-100'
                    : 'opacity-0',
              )}
            >
              {notesStatus === 'saved' && 'Saved'}
              {notesStatus === 'error' && (notesError ?? 'Save failed')}
            </div>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotesNow}
            placeholder="Anything useful — preferred slots, training notes, allergies…"
            rows={4}
            className={cn(
              'w-full rounded-md border px-3 py-2 text-[13px] leading-relaxed resize-none outline-none transition-colors',
              'bg-paper-surface dark:bg-ink-surface text-paper-text-1 dark:text-ink-text-1',
              'border-paper-border dark:border-ink-border',
              'focus:ring-2 focus:ring-gold focus:border-gold',
              'placeholder:text-paper-text-3 dark:placeholder:text-ink-text-3',
            )}
          />
          {notesDirty && !isSavingNotes && (
            <div className="mt-1 text-[11px] text-paper-text-3 dark:text-ink-text-3">
              Saves when you click away.
            </div>
          )}
        </section>

        <section>
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.6px] text-paper-text-3 dark:text-ink-text-3 mb-2">
            Recent bookings
          </div>
          {history.length === 0 ? (
            <div className="rounded-xl border border-paper-border dark:border-ink-border bg-paper-surface dark:bg-ink-surface p-4 text-[12.5px] text-paper-text-3 dark:text-ink-text-3 text-center italic">
              No bookings recorded yet.
            </div>
          ) : (
            <ul className="rounded-xl border border-paper-border dark:border-ink-border bg-paper-surface dark:bg-ink-surface divide-y divide-paper-border dark:divide-ink-border">
              {history.map((h) => (
                <li
                  key={h.id}
                  className="grid grid-cols-[1fr_auto_auto] gap-3 items-center px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-medium text-paper-text-1 dark:text-ink-text-1 truncate">
                      {h.service_name ?? '—'}
                    </div>
                    <div className="text-[11px] text-paper-text-3 dark:text-ink-text-3">
                      {formatDate(h.starts_at)}
                    </div>
                  </div>
                  {h.status && h.status !== 'confirmed' && (
                    <StatusPill status={STATUS_TONE[h.status] ?? 'neutral'}>
                      {h.status}
                    </StatusPill>
                  )}
                  <div className="text-[12.5px] font-semibold tabular-nums text-paper-text-1 dark:text-ink-text-1">
                    {h.price_cents === 0 ? (
                      <span className="text-paper-text-3 dark:text-ink-text-3 font-normal">
                        Free
                      </span>
                    ) : (
                      formatPrice(h.price_cents)
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Drawer>
  );
}
