import { cookies } from 'next/headers';
import { supabaseAdmin, type BookingWithDetails } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ConsumerHeader } from '@/components/consumer/ConsumerHeader';
import { BottomTabBar } from '@/components/consumer/BottomTabBar';
import { BookingsList } from './BookingsList';

export const dynamic = 'force-dynamic';

async function getMyBookings(): Promise<BookingWithDetails[]> {
  // A user can identify two ways here (see [bookingId]/page.tsx for the
  // long version): an auth-linked customer record (AI flow) and/or the
  // legacy ob_customer_id cookie (pre-auth guest flow). Show both so a
  // freshly-authed AI booking lands here alongside any earlier guest
  // bookings from the same browser.
  const sb = supabaseAdmin();
  const cookieCustomerId = cookies().get('ob_customer_id')?.value ?? null;

  let authCustomerId: string | null = null;
  try {
    const userClient = createSupabaseServerClient();
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (user) {
      const { data } = await userClient
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      authCustomerId = (data?.id as string | undefined) ?? null;
    }
  } catch {
    /* fall through to cookie-only */
  }

  const allowedCustomerIds = [authCustomerId, cookieCustomerId].filter(
    (v): v is string => typeof v === 'string' && v.length > 0
  );
  if (allowedCustomerIds.length === 0) return [];

  const { data } = await sb
    .from('bookings')
    .select(
      `
      *,
      businesses (slug, name, primary_colour, cover_image_url, city),
      services (name, duration_minutes, price_cents)
    `
    )
    .in('customer_id', allowedCustomerIds)
    .in('status', ['confirmed', 'pending', 'completed'])
    .order('starts_at', { ascending: false });

  return (data ?? []) as BookingWithDetails[];
}

export default async function MyBookingsPage() {
  const bookings = await getMyBookings();

  return (
    <main className="relative min-h-[100dvh] text-white antialiased overflow-hidden">
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(800px 400px at 50% -10%, rgba(212,175,55,0.08), transparent 55%),' +
            'linear-gradient(180deg, #050505 0%, #020202 100%)',
        }}
      />

      <ConsumerHeader showClose={false} domain="openbook.ie" />

      <div className="px-5 pt-4 pb-36">
        <h1 className="text-[28px] font-bold tracking-tight leading-none">
          My <span className="text-[#D4AF37]">bookings</span>
        </h1>
        <p className="mt-1.5 text-[14px] text-white/55">
          Upcoming and past appointments.
        </p>

        <div className="mt-6">
          <BookingsList bookings={bookings} />
        </div>
      </div>

      <BottomTabBar />
    </main>
  );
}
