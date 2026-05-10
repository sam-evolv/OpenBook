import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;
  const customerId = (await cookies()).get('ob_customer_id')?.value;
  if (!customerId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const sb = supabaseAdmin();

  const { data: booking } = await sb
    .from('bookings')
    .select('id, status, customer_id, ends_at')
    .eq('id', bookingId)
    .eq('customer_id', customerId)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  if (booking.status === 'cancelled') {
    return NextResponse.json({ ok: true });
  }

  if (Date.now() > new Date(booking.ends_at).getTime()) {
    return NextResponse.json(
      { error: 'Past bookings cannot be cancelled' },
      { status: 400 }
    );
  }

  const { error } = await sb
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', booking.id)
    .eq('customer_id', customerId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
