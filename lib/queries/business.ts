import { redirect } from 'next/navigation';
import { createSupabaseServerClient, getCurrentOwner } from '@/lib/supabase-server';

/**
 * Fetch-or-redirect for authed dashboard pages. Returns the current
 * owner + their live business row. Redirects if the owner is not signed in
 * or has no live business yet. Not a React hook — this runs on the server.
 *
 * The `business` is typed as `Record<string, unknown>`; callers cast to the
 * concrete shape they asked for via the `columns` argument. Supabase's
 * string-select typing collapses to a union that the compiler can't narrow
 * here, so we surface a loose type and push the cast to the single call-
 * site that knows what it selected.
 */
export async function requireCurrentBusiness<T = Record<string, unknown>>(
  columns = '*',
): Promise<{
  owner: NonNullable<Awaited<ReturnType<typeof getCurrentOwner>>>;
  business: T;
  sb: ReturnType<typeof createSupabaseServerClient>;
}> {
  const owner = await getCurrentOwner();
  if (!owner) redirect('/onboard');

  const sb = createSupabaseServerClient();
  const { data: businesses, error } = await sb
    .from('businesses')
    .select(columns)
    .eq('owner_id', owner.id)
    .eq('is_live', true)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('requireCurrentBusiness:', error);
    throw error;
  }

  const business = businesses?.[0] ?? null;
  if (!business) redirect('/onboard/flow');

  return { owner, business: business as unknown as T, sb };
}
