'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Check, Sparkles, AlertTriangle } from 'lucide-react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { CustomerPicker } from './CustomerPicker';
import { TILE_PALETTE_MAP } from '@/lib/tile-palette';
import { colourForStaff } from '@/lib/dashboard-v2/staff-colours';
import type {
  CustomerOption,
  ServiceOption,
  StaffRow,
} from '@/lib/dashboard-v2/calendar-queries';
import {
  createBooking,
  rescheduleBooking,
  fetchAvailableSlots,
  type CreateBookingResult,
} from '@/app/(dashboard)/dashboard/calendar/actions';
import { formatPrice, formatDuration } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export interface NewBookingModalProps {
  open: boolean;
  onClose: () => void;
  services: ServiceOption[];
  staff: StaffRow[];
  customers: CustomerOption[];
  /** When null, modal opens in create mode. When set, reschedule mode. */
  reschedule?: {
    bookingId: string;
    serviceId: string | null;
    staffId: string | null;
    customerId: string;
    customerName: string;
    customerPhone: string | null;
    dateYmd: string;
    time: string;
  } | null;
  /** Seed the date/time when a user clicks an empty grid slot (create mode). */
  initialDate?: string;
  initialTime?: string;
  previewMode?: boolean;
}

type SelectedCustomer = {
  id: string;
  display_name: string;
  phone: string | null;
};

function toDateYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function roundToStep(time: string, step = 15): string {
  const [h, m] = time.split(':').map(Number);
  const mins = (h ?? 0) * 60 + (m ?? 0);
  const rounded = Math.round(mins / step) * step;
  const H = Math.floor(rounded / 60);
  const M = rounded % 60;
  return `${String(H).padStart(2, '0')}:${String(M).padStart(2, '0')}`;
}

export function NewBookingModal({
  open,
  onClose,
  services,
  staff,
  customers,
  reschedule,
  initialDate,
  initialTime,
  previewMode,
}: NewBookingModalProps) {
  const isReschedule = reschedule != null;

  // Resolve initial values from either reschedule target or seed inputs.
  const seedDate = reschedule?.dateYmd ?? initialDate ?? toDateYmd(new Date());
  const seedTime = reschedule?.time ?? (initialTime ? roundToStep(initialTime) : '');
  const seedServiceId = reschedule?.serviceId ?? (services[0]?.id ?? null);
  const seedStaffId = reschedule?.staffId ?? null;
  const seedCustomer: SelectedCustomer | null = reschedule
    ? {
        id: reschedule.customerId,
        display_name: reschedule.customerName,
        phone: reschedule.customerPhone,
      }
    : null;

  const [customer, setCustomer] = useState<SelectedCustomer | null>(seedCustomer);
  const [serviceId, setServiceId] = useState<string | null>(seedServiceId);
  const [staffId, setStaffId] = useState<string | null>(seedStaffId);
  const [dateYmd, setDateYmd] = useState<string>(seedDate);
  const [time, setTime] = useState<string>(seedTime);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [slotTaken, setSlotTaken] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Reset state whenever the modal re-opens with a different target.
  useEffect(() => {
    if (!open) return;
    setCustomer(seedCustomer);
    setServiceId(seedServiceId);
    setStaffId(seedStaffId);
    setDateYmd(seedDate);
    setTime(seedTime);
    setSlots([]);
    setSubmitError(null);
    setSlotTaken(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reschedule?.bookingId, initialDate, initialTime]);

  // Fetch fresh slots whenever (service, staff, date) changes.
  useEffect(() => {
    if (!open) return;
    if (!serviceId || !dateYmd) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    if (previewMode) {
      // Preview mode: synthesise a plausible list of slots.
      const svc = services.find((s) => s.id === serviceId);
      const duration = svc?.duration_minutes ?? 60;
      const out: string[] = [];
      for (let h = 9; h * 60 + duration <= 18 * 60; h += 1) {
        out.push(`${String(h).padStart(2, '0')}:00`);
      }
      setSlots(out);
      setSlotsLoading(false);
      return;
    }
    const ctrl = { cancelled: false };
    (async () => {
      const res = await fetchAvailableSlots({
        serviceId,
        staffId,
        dateYmd,
        excludeBookingId: reschedule?.bookingId,
      });
      if (ctrl.cancelled) return;
      if (res.ok) {
        setSlots(res.slots);
      } else {
        setSlots([]);
        setSubmitError(res.error);
      }
      setSlotsLoading(false);
    })();
    return () => {
      ctrl.cancelled = true;
    };
  }, [open, previewMode, serviceId, staffId, dateYmd, reschedule?.bookingId, services]);

  const service = services.find((s) => s.id === serviceId) ?? null;
  const staffMember = staff.find((s) => s.id === staffId) ?? null;

  // Dirty check. In reschedule mode, Save is disabled until the date or
  // time actually changes — no accidental same-time resave. In create
  // mode, Save is enabled once all fields are set.
  const dirty = isReschedule
    ? reschedule !== null &&
      (dateYmd !== reschedule.dateYmd ||
        time !== reschedule.time ||
        serviceId !== reschedule.serviceId ||
        staffId !== reschedule.staffId)
    : Boolean(customer && serviceId && dateYmd && time);
  const canSubmit = dirty && !isPending && !slotsLoading;

  const submit = () => {
    if (!canSubmit || !customer || !serviceId || !time) return;
    setSubmitError(null);
    setSlotTaken(false);
    if (previewMode) {
      onClose();
      return;
    }
    startTransition(async () => {
      const res: CreateBookingResult = isReschedule
        ? await rescheduleBooking({
            bookingId: reschedule!.bookingId,
            serviceId,
            staffId,
            dateYmd,
            time,
          })
        : await createBooking({
            customerId: customer.id,
            serviceId,
            staffId,
            dateYmd,
            time,
          });

      if (res.ok) {
        onClose();
        return;
      }
      if (res.code === 'slot_taken') {
        setSlotTaken(true);
        setSlots(res.freshSlots);
        setTime(''); // force user to re-pick from the fresh list
        return;
      }
      setSubmitError(res.error);
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isReschedule ? 'Reschedule booking' : 'New booking'}
      subtitle={isReschedule ? reschedule?.customerName : undefined}
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={<Check size={13} strokeWidth={2.5} />}
            onClick={submit}
            disabled={!canSubmit}
          >
            {isPending
              ? 'Saving…'
              : isReschedule
                ? 'Save reschedule'
                : 'Create booking'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Customer — locked in reschedule mode */}
        <Field label="Customer">
          {isReschedule && customer ? (
            <div className="rounded-md border border-paper-border dark:border-ink-border bg-paper-surface dark:bg-ink-surface px-3 py-2 text-[13px] text-paper-text-1 dark:text-ink-text-1">
              {customer.display_name}
              {customer.phone && (
                <span className="text-paper-text-3 dark:text-ink-text-3 ml-2 text-[12px]">
                  {customer.phone}
                </span>
              )}
            </div>
          ) : (
            <CustomerPicker
              customers={customers}
              selected={customer}
              onChange={setCustomer}
              previewMode={previewMode}
            />
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Service">
            <select
              value={serviceId ?? ''}
              onChange={(e) => setServiceId(e.target.value || null)}
              className="h-10 w-full rounded-md border border-paper-border dark:border-ink-border bg-paper-surface dark:bg-ink-surface px-3 text-[13px] text-paper-text-1 dark:text-ink-text-1 outline-none focus:ring-2 focus:ring-gold focus:border-gold"
            >
              {services.length === 0 && <option value="">No services yet</option>}
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.price_cents === 0 ? 'Free' : formatPrice(s.price_cents)} ·{' '}
                  {formatDuration(s.duration_minutes)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Coach">
            <select
              value={staffId ?? ''}
              onChange={(e) => setStaffId(e.target.value || null)}
              className="h-10 w-full rounded-md border border-paper-border dark:border-ink-border bg-paper-surface dark:bg-ink-surface px-3 text-[13px] text-paper-text-1 dark:text-ink-text-1 outline-none focus:ring-2 focus:ring-gold focus:border-gold"
            >
              <option value="">Anyone available</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {staffMember && (
              <div className="mt-1.5 flex items-center gap-2 text-[11.5px] text-paper-text-3 dark:text-ink-text-3">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    background: TILE_PALETTE_MAP[colourForStaff(staffMember)].mid,
                  }}
                />
                Bookings will appear in {staffMember.name}'s colour
              </div>
            )}
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <input
              type="date"
              value={dateYmd}
              onChange={(e) => setDateYmd(e.target.value)}
              className="h-10 w-full rounded-md border border-paper-border dark:border-ink-border bg-paper-surface dark:bg-ink-surface px-3 text-[13px] tabular-nums text-paper-text-1 dark:text-ink-text-1 outline-none focus:ring-2 focus:ring-gold focus:border-gold"
            />
          </Field>
          <Field label="Time">
            {isReschedule && reschedule && time === reschedule.time && !slotTaken && (
              <div className="mb-1 text-[11px] text-paper-text-3 dark:text-ink-text-3">
                Current time. Pick a different slot to reschedule.
              </div>
            )}
            <select
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={slotsLoading || (slots.length === 0 && !slotsLoading)}
              className="h-10 w-full rounded-md border border-paper-border dark:border-ink-border bg-paper-surface dark:bg-ink-surface px-3 text-[13px] tabular-nums text-paper-text-1 dark:text-ink-text-1 outline-none focus:ring-2 focus:ring-gold focus:border-gold disabled:opacity-50"
            >
              {slotsLoading ? (
                <option>Loading…</option>
              ) : slots.length === 0 ? (
                <option value="">No availability for this day</option>
              ) : (
                <>
                  {!time && <option value="">Pick a time…</option>}
                  {slots.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </>
              )}
            </select>
          </Field>
        </div>

        {slotTaken && (
          <div className="rounded-md border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-3 flex items-start gap-2 text-[12.5px] text-amber-700 dark:text-amber-300">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <div>
              Someone just booked that slot. Here are the latest available times — pick one and
              save again.
            </div>
          </div>
        )}

        {!isReschedule && (
          <div className="rounded-md border border-gold-border bg-gold-soft px-3 py-2.5 flex items-center gap-2.5 text-[12px] text-paper-text-2 dark:text-ink-text-2">
            <Sparkles size={13} className="text-gold shrink-0" strokeWidth={2} />
            <div className="leading-snug">
              Auto-send confirmation via WhatsApp
              <span className="text-paper-text-3 dark:text-ink-text-3">
                {' '}
                — runs on save if Automations → Auto-reminders is on.
              </span>
            </div>
          </div>
        )}

        {submitError && (
          <p className="text-[12.5px] text-red-500 dark:text-red-400">{submitError}</p>
        )}
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[11.5px] font-medium text-paper-text-2 dark:text-ink-text-2">
        {label}
      </div>
      {children}
    </div>
  );
}
