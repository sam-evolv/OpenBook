import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing Supabase env vars — set NEXT_PUBLIC_SUPABASE_URL ' +
        'and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.',
    );
  }

  const cookieStore = cookies();
  const isProduction = process.env.NODE_ENV === 'production';

  return createServerClient<Database>(url, key, {
    cookieOptions: isProduction ? { domain: '.openbook.ie' } : undefined,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            const opts = isProduction
              ? { ...options, domain: '.openbook.ie' }
              : options;
            cookieStore.set({ name, value, ...opts });
          });
        } catch {
          // Called from a Server Component — middleware refreshes the
          // session instead, so this is safely ignored.
        }
      },
    },
  });
}

export function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
