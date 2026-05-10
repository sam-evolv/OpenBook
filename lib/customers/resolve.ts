import type { SupabaseClient } from '@supabase/supabase-js';

export interface CustomerInput {
  email: string | null;
  fullName?: string | null;
  phone?: string | null;
}

export interface ResolvedCustomer {
  id: string;
  was_created: boolean;
}

// Resolve or create a customer by email.
//
// - email present, 0 rows match: insert a new customer, return id
// - email present, 1 row matches: return that row's id
// - email present, 2+ rows match: return the newest row's id. The customers
//   table has no UNIQUE(email) constraint and contains legitimate duplicates
//   from auth flows (e.g. Google sign-in producing a second row with a
//   user_id link). Picking the newest row is the closest thing to "current
//   customer record" without merging auth identities.
// - email null: insert an anonymous customer, return id
//
// On insert, full_name and phone are written. On match, neither is
// overwritten; the caller can do a separate UPDATE to enrich if it wants.
//
// Throws on actual DB errors. Does not throw on "no rows" or "multiple rows".
export async function resolveOrCreateCustomer(
  sb: SupabaseClient,
  input: CustomerInput,
): Promise<ResolvedCustomer> {
  const { email, fullName, phone } = input;

  if (email) {
    const { data: existing, error: lookupErr } = await sb
      .from('customers')
      .select('id, created_at')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1);

    if (lookupErr) {
      throw lookupErr;
    }

    if (existing && existing.length > 0) {
      return { id: existing[0].id, was_created: false };
    }
  }

  const { data: created, error: createErr } = await sb
    .from('customers')
    .insert({
      email: email ?? null,
      full_name: fullName ?? null,
      name: fullName ?? null,
      phone: phone ?? null,
    })
    .select('id')
    .single();

  if (createErr || !created) {
    throw createErr ?? new Error('customer insert returned no row');
  }

  return { id: created.id, was_created: true };
}
