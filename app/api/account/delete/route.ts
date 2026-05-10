import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE() {
  const cookieStore = await cookies();
  const cookieCustomerId = cookieStore.get('ob_customer_id')?.value ?? null;
  const userClient = createSupabaseServerClient();
  const admin = supabaseAdmin();

  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user && !cookieCustomerId) {
    return NextResponse.json({ error: 'No account data found' }, { status: 404 });
  }

  if (user) {
    await admin.from('customers').delete().eq('user_id', user.id);
  }

  if (cookieCustomerId) {
    await admin.from('customers').delete().eq('id', cookieCustomerId);
    cookieStore.delete('ob_customer_id');
  }

  if (user) {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  await userClient.auth.signOut();
  return NextResponse.json({ deleted: true });
}
