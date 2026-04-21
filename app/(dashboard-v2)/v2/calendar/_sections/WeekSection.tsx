import { createSupabaseServerClient } from '@/lib/supabase-server';
import { loadWeek } from '@/lib/dashboard-v2/calendar-queries';
import { CalendarClient } from '@/components/dashboard-v2/calendar/CalendarClient';
import type { CalendarView } from '@/components/dashboard-v2/calendar/CalendarTopBar';

interface WeekSectionProps {
  businessId: string;
  view: CalendarView;
  anchorIso: string;
  activeStaff: string | 'all';
}

export async function WeekSection({
  businessId,
  view,
  anchorIso,
  activeStaff,
}: WeekSectionProps) {
  const sb = createSupabaseServerClient();
  const payload = await loadWeek(
    sb,
    businessId,
    new Date(anchorIso),
    activeStaff === 'all' ? null : activeStaff,
  );

  return (
    <CalendarClient
      payload={payload}
      view={view}
      activeStaff={activeStaff}
      anchorDate={anchorIso.slice(0, 10)}
    />
  );
}
