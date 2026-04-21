'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../Button';
import { BookingDetailDrawer, type BookingDetailData } from '../BookingDetailDrawer';
import { CalendarTopBar, type CalendarView } from './CalendarTopBar';
import { StaffFilterBar } from './StaffFilterBar';
import { WeekGrid } from './WeekGrid';
import { QuietZoneNudge } from './QuietZoneNudge';
import { CalendarEmptyState } from './CalendarEmptyState';
import { NewBookingModal } from './NewBookingModal';
import type { BookingBlock, StaffRow, WeekPayload } from '@/lib/dashboard-v2/calendar-queries';
import { cancelBooking } from '@/app/(dashboard-v2)/v2/calendar/actions';
import { formatPrice } from '@/lib/supabase';

export interface CalendarClientProps {
  payload: WeekPayload;
  view: CalendarView;
  activeStaff: string | 'all';
  anchorDate: string; // ISO date for the visible day/week
  previewMode?: boolean;
}

function rangeLabel(weekStart: string, weekEnd: string, view: CalendarView): string {
  const s = new Date(weekStart);
  const e = new Date(new Date(weekEnd).getTime() - 1);
  if (view === 'day') {
    return s.toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  const sMonth = s.toLocaleDateString('en-IE', { month: 'short' });
  const eMonth = e.toLocaleDateString('en-IE', { month: 'short' });
  const year = e.getFullYear();
  return sMonth === eMonth
    ? `${s.getDate()} – ${e.getDate()} ${eMonth} ${year}`
    : `${s.getDate()} ${sMonth} – ${e.getDate()} ${eMonth} ${year}`;
}

function todayIndex(weekStart: string): number | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(weekStart);
  const diffDays = Math.floor((today.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays < 0 || diffDays > 6) return null;
  return diffDays;
}

function bookingToDetail(b: BookingBlock, staffById: Map<string, StaffRow>): BookingDetailData {
  const staff = b.staff_id ? staffById.get(b.staff_id) ?? null : null;
  return {
    id: b.id,
    starts_at: b.starts_at,
    ends_at: b.ends_at,
    status: b.status,
    price_cents: b.price_cents,
    notes: b.notes,
    service_name: b.service.name,
    service_duration_minutes: b.service.duration_minutes,
    customer_name: b.customer.display_name,
    customer_email: b.customer.email,
    customer_phone: b.customer.phone,
    staff_name: staff?.name ?? null,
    stripe_payment_intent_id: b.stripe_payment_intent_id,
  };
}

export function CalendarClient({
  payload,
  view,
  activeStaff,
  anchorDate,
  previewMode = false,
}: CalendarClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [selected, setSelected] = useState<BookingBlock | null>(null);
  const [previewView, setPreviewView] = useState<CalendarView>(view);
  const [previewStaff, setPreviewStaff] = useState<string | 'all'>(activeStaff);
  const [previewAnchor, setPreviewAnchor] = useState<string>(anchorDate);

  const [modalMode, setModalMode] = useState<
    | { kind: 'closed' }
    | { kind: 'create'; date?: string; time?: string }
    | {
        kind: 'reschedule';
        bookingId: string;
        serviceId: string | null;
        staffId: string | null;
        customerId: string;
        customerName: string;
        customerPhone: string | null;
        dateYmd: string;
        time: string;
      }
  >({ kind: 'closed' });

  const effectiveView = previewMode ? previewView : view;
  const effectiveStaff = previewMode ? previewStaff : activeStaff;
  const effectiveAnchor = previewMode ? previewAnchor : anchorDate;

  const staffById = new Map(payload.staff.map((s) => [s.id, s]));

  const pushFilter = (patch: { view?: CalendarView; staff?: string | 'all'; anchor?: string }) => {
    if (previewMode) {
      if (patch.view) setPreviewView(patch.view);
      if (patch.staff !== undefined) setPreviewStaff(patch.staff);
      if (patch.anchor) setPreviewAnchor(patch.anchor);
      return;
    }
    const params = new URLSearchParams();
    const nextView = patch.view ?? effectiveView;
    const nextStaff = patch.staff ?? effectiveStaff;
    const nextAnchor = patch.anchor ?? effectiveAnchor;
    if (nextView !== 'week') params.set('view', nextView);
    if (nextStaff !== 'all') params.set('staff', nextStaff);
    const todayIso = new Date().toISOString().slice(0, 10);
    if (nextAnchor !== todayIso) params.set('date', nextAnchor);
    startTransition(() => {
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    });
  };

  const shiftAnchor = (days: number) => {
    const d = new Date(effectiveAnchor);
    d.setDate(d.getDate() + days);
    pushFilter({ anchor: d.toISOString().slice(0, 10) });
  };

  const goToday = () => {
    pushFilter({ anchor: new Date().toISOString().slice(0, 10) });
  };

  const onNewBooking = () => setModalMode({ kind: 'create' });

  const onEmptyClick = (date: Date) => {
    const d = date;
    const dateYmd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    setModalMode({ kind: 'create', date: dateYmd, time });
  };

  const onReschedule = () => {
    if (!selected) return;
    const starts = new Date(selected.starts_at);
    const ymd = `${starts.getFullYear()}-${String(starts.getMonth() + 1).padStart(2, '0')}-${String(starts.getDate()).padStart(2, '0')}`;
    const hm = `${String(starts.getHours()).padStart(2, '0')}:${String(starts.getMinutes()).padStart(2, '0')}`;
    setModalMode({
      kind: 'reschedule',
      bookingId: selected.id,
      serviceId: selected.service_id,
      staffId: selected.staff_id,
      customerId: selected.customer_id,
      customerName: selected.customer.display_name,
      customerPhone: selected.customer.phone,
      dateYmd: ymd,
      time: hm,
    });
    setSelected(null);
  };

  const weekTotals = payload.bookings.reduce(
    (acc, b) => ({
      count: acc.count + 1,
      revenue: acc.revenue + (b.status === 'cancelled' ? 0 : b.price_cents),
    }),
    { count: 0, revenue: 0 },
  );

  const handleCancel = async (id: string) => {
    if (previewMode) return { ok: true as const };
    const res = await cancelBooking(id);
    return res;
  };

  const shiftStep = effectiveView === 'day' ? 1 : 7;

  return (
    <>
      <CalendarTopBar
        view={effectiveView}
        onChangeView={(v) => pushFilter({ view: v })}
        onNewBooking={onNewBooking}
      />

      <div className="mx-auto max-w-[1400px] px-8 py-5 space-y-5">
        <StaffFilterBar
          staff={payload.staff}
          active={effectiveStaff}
          onChange={(next) => pushFilter({ staff: next })}
        />

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<ChevronLeft size={14} strokeWidth={2} />}
              onClick={() => shiftAnchor(-shiftStep)}
              aria-label="Previous"
            >
              {''}
            </Button>
            <div className="text-[14px] font-semibold min-w-[180px] text-paper-text-1 dark:text-ink-text-1">
              {rangeLabel(payload.weekStart, payload.weekEnd, effectiveView)}
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<ChevronRight size={14} strokeWidth={2} />}
              onClick={() => shiftAnchor(shiftStep)}
              aria-label="Next"
            >
              {''}
            </Button>
            <Button variant="ghost" size="sm" onClick={goToday}>
              Today
            </Button>
          </div>
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.4px] font-medium text-paper-text-3 dark:text-ink-text-3">
              This {effectiveView === 'day' ? 'day' : 'week'}
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <div className="text-[15px] font-semibold tabular-nums text-paper-text-1 dark:text-ink-text-1">
                {weekTotals.count} {weekTotals.count === 1 ? 'booking' : 'bookings'}
              </div>
              <div className="text-[13px] font-semibold text-gold tabular-nums">
                {formatPrice(weekTotals.revenue)}
              </div>
            </div>
          </div>
        </div>

        {payload.bookings.length === 0 && (
          <CalendarEmptyState onNewBooking={onNewBooking} />
        )}

        <WeekGrid
          mode={effectiveView === 'day' ? 'day' : 'week'}
          weekStart={payload.weekStart}
          bookings={payload.bookings}
          staff={payload.staff}
          hours={payload.hours}
          closures={payload.closures}
          staffFilter={effectiveStaff}
          todayIndex={todayIndex(payload.weekStart)}
          onBookingClick={(b) => setSelected(b)}
          onEmptyClick={onEmptyClick}
        />

        <QuietZoneNudge bookings={payload.bookings} />
      </div>

      <BookingDetailDrawer
        booking={selected ? bookingToDetail(selected, staffById) : null}
        open={selected !== null}
        onClose={() => setSelected(null)}
        editable
        onReschedule={onReschedule}
        onCancel={handleCancel}
        previewMode={previewMode}
      />

      <NewBookingModal
        open={modalMode.kind !== 'closed'}
        onClose={() => setModalMode({ kind: 'closed' })}
        services={payload.services}
        staff={payload.staff}
        customers={payload.customers}
        reschedule={modalMode.kind === 'reschedule' ? modalMode : null}
        initialDate={modalMode.kind === 'create' ? modalMode.date : undefined}
        initialTime={modalMode.kind === 'create' ? modalMode.time : undefined}
        previewMode={previewMode}
      />
    </>
  );
}
