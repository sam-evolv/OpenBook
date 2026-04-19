import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Returns a Supabase client configured for server-side use with cookies
 * scoped to .openbook.ie so the session works across app.openbook.ie
 * and dash.openbook.ie.
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies();

  /* In local dev, cookies can't use the .openbook.ie domain. Only apply
     it in production. */
  const domain = process.env.NODE_ENV === 'production' ? '.openbook.ie' : undefined;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({
              name,
              value,
              ...options,
              domain: domain ?? options.domain,
            });
          } catch {
            /* Called from a Server Component — can't set cookies.
             * This is OK because middleware handles session refresh. */
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({
              name,
              value: '',
              ...options,
              domain: domain ?? options.domain,
              maxAge: 0,
            });
          } catch {
            /* see above */
          }
        },
      },
    }
  );
}

/**
 * Get the current owner row for the signed-in user.
 * Returns null if not signed in or no owner row exists.
 */
export async function getCurrentOwner() {
  const sb = createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const { data } = await sb.from('owners').select('*').eq('id', user.id).maybeSingle();
  return data;
}
