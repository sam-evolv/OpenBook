import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/booking/[id]
 *
 * Polled by the consumer AI tab while a payment card is visible —
 * flips status to 'confirmed' inline once the Stripe webhook has
 * updated the row, without needing a chat reload.
 *
 * Auth: tries the Supabase session first (auth_customer_id() RPC, the
 * canonical AI-flow path) and falls back to the ob_customer_id cookie
 * used by the legacy guest booking flow.
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  let customerId: string | null = null;

  try {
    const userClient = createSupabaseServerClient();
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (user) {
      const { data } = await userClient.rpc('auth_customer_id');
      if (typeof data === 'string') customerId = data;
    }
  } catch {
    /* fall through to cookie */
  }

  if (!customerId) {
    customerId = cookies().get('ob_customer_id')?.value ?? null;
  }

  if (!customerId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const sb = supabaseAdmin();

  const { data: booking, error } = await sb
    .from('bookings')
    .select(
      `
      id, status, starts_at, ends_at, price_cents, customer_id,
      businesses (id, slug, name, primary_colour),
      services (id, name, duration_minutes, price_cents)
    `
    )
    .eq('id', params.id)
    .eq('customer_id', customerId)
    .maybeSingle();

  if (error || !booking) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ booking });
}
