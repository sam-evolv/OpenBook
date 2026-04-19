import { createSupabaseServerClient, getCurrentOwner } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { BookingsList } from '@/components/dashboard/BookingsList';

export const dynamic = 'force-dynamic';

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: { filter?: 'upcoming' | 'past' | 'cancelled' | 'all' };
}) {
  const owner = await getCurrentOwner();
  if (!owner) redirect('/onboard');

  const sb = createSupabaseServerClient();
  const { data: business } = await sb
    .from('businesses')
    .select('id')
    .eq('owner_id', owner.id)
    .eq('is_live', true)
    .maybeSingle();

  if (!business) redirect('/onboard/flow');

  const filter = searchParams.filter ?? 'upcoming';
  const now = new Date().toISOString();

  let query = sb
    .from('bookings')
    .select(
      'id, starts_at, ends_at, status, price_cents, notes, services(name, duration_minutes), customers(first_name, last_name, email, phone)'
    )
    .eq('business_id', business.id);

  if (filter === 'upcoming') {
    query = query.gte('starts_at', now).neq('status', 'cancelled').order('starts_at', { ascending: true });
  } else if (filter === 'past') {
    query = query.lt('starts_at', now).neq('status', 'cancelled').order('starts_at', { ascending: false });
  } else if (filter === 'cancelled') {
    query = query.eq('status', 'cancelled').order('starts_at', { ascending: false });
  } else {
    query = query.order('starts_at', { ascending: false });
  }

  const { data: bookings } = await query.limit(100);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[24px] font-bold tracking-[-0.02em]">Bookings</h1>
        <p className="mt-1 text-[13px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
          All the bookings you've received.
        </p>
      </div>

      <BookingsList bookings={bookings ?? []} activeFilter={filter} />
    </div>
  );
}
