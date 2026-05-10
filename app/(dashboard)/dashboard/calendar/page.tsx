import { Suspense } from 'react';
import { requireCurrentBusiness } from '@/lib/queries/business';
import { WeekGridSkeleton } from '@/components/dashboard-v2/calendar/skeletons';
import { WeekSection } from './_sections/WeekSection';
import type { CalendarView } from '@/components/dashboard-v2/calendar/CalendarTopBar';

export const dynamic = 'force-dynamic';

const VALID_VIEWS: CalendarView[] = ['day', 'week', 'month'];

export default async function CalendarV2Page({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; staff?: string }>;
}) {
  const sp = await searchParams;
  const { business } = await requireCurrentBusiness<{ id: string }>('id');

  const requestedView = VALID_VIEWS.includes(sp.view as CalendarView)
    ? (sp.view as CalendarView)
    : 'week';
  // Month view is reserved in the switcher but not yet implemented — fall back
  // to week so the page still renders if someone deep-links to ?view=month.
  const view: CalendarView = requestedView === 'month' ? 'week' : requestedView;

  const anchorIso = sp.date
    ? new Date(sp.date).toISOString()
    : new Date().toISOString();

  const activeStaff = sp.staff && sp.staff !== 'all' ? sp.staff : 'all';

  return (
    <Suspense fallback={<WeekGridSkeleton />}>
      <WeekSection
        businessId={business.id}
        view={view}
        anchorIso={anchorIso}
        activeStaff={activeStaff}
      />
    </Suspense>
  );
}
