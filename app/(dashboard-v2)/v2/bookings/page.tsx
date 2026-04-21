import { requireCurrentBusiness } from '@/lib/queries/business';
import {
  BookingsClient,
  type BookingRow,
  type TabId,
  type StatusFilter,
} from '@/components/dashboard-v2/BookingsClient';

export const dynamic = 'force-dynamic';

const VALID_TABS: TabId[] = ['upcoming', 'past', 'cancelled', 'all'];
const VALID_STATUSES: StatusFilter[] = ['all', 'pending', 'confirmed', 'completed'];

export default async function BookingsV2Page({
  searchParams,
}: {
  searchParams: { tab?: string; q?: string; status?: string };
}) {
  const { business, sb } = await requireCurrentBusiness<{ id: string }>('id');

  const tab: TabId = VALID_TABS.includes(searchParams.tab as TabId)
    ? (searchParams.tab as TabId)
    : 'upcoming';
  const q = (searchParams.q ?? '').trim();
  const statusFilter: StatusFilter = VALID_STATUSES.includes(searchParams.status as StatusFilter)
    ? (searchParams.status as StatusFilter)
    : 'all';

  const now = new Date().toISOString();
  let query = sb
    .from('bookings')
    .select(
      'id, starts_at, ends_at, status, price_cents, notes, services(name, duration_minutes), customers(full_name, name, email, phone)',
    )
    .eq('business_id', business.id);

  if (tab === 'upcoming') {
    query = query.gte('starts_at', now).neq('status', 'cancelled');
  } else if (tab === 'past') {
    query = query.lt('starts_at', now).neq('status', 'cancelled');
  } else if (tab === 'cancelled') {
    query = query.eq('status', 'cancelled');
  }

  if (statusFilter !== 'all' && tab !== 'cancelled') {
    query = query.eq('status', statusFilter);
  }

  const ordered =
    tab === 'upcoming'
      ? query.order('starts_at', { ascending: true })
      : query.order('starts_at', { ascending: false });

  const { data: rows } = await ordered.limit(100);
  const bookings = (rows ?? []) as unknown as BookingRow[];

  const filtered = q
    ? bookings.filter((b) => {
        const full = (b.customers?.full_name ?? '').toLowerCase();
        const shortName = (b.customers?.name ?? '').toLowerCase();
        const email = (b.customers?.email ?? '').toLowerCase();
        const service = (b.services?.name ?? '').toLowerCase();
        const needle = q.toLowerCase();
        return (
          full.includes(needle) ||
          shortName.includes(needle) ||
          email.includes(needle) ||
          service.includes(needle)
        );
      })
    : bookings;

  return (
    <BookingsClient
      bookings={filtered}
      filters={{ tab, q, status: statusFilter }}
    />
  );
}
