import { requireCurrentBusiness } from '@/lib/queries/business';
import { HoursForm, type HourRow } from '@/components/dashboard-v2/HoursForm';

export const dynamic = 'force-dynamic';

export default async function HoursV2Page() {
  const { business, sb } = await requireCurrentBusiness<{ id: string }>('id');

  const { data: rows } = await sb
    .from('business_hours')
    .select('day_of_week, open_time, close_time, is_closed')
    .eq('business_id', business.id)
    .order('day_of_week', { ascending: true });

  return <HoursForm initialHours={(rows ?? []) as HourRow[]} />;
}
