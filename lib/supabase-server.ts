import { createServerClient } from '@supabase/ssr';
import {
  cookies,
  headers,
  type UnsafeUnwrappedCookies,
  type UnsafeUnwrappedHeaders,
} from 'next/headers';

/**
 * Server-side Supabase client. Uses the modern getAll/setAll cookie API
 * (the deprecated get/set/remove chunks the auth token across multiple
 * calls and can corrupt sessions). On real openbook.ie hosts, cookies are
 * scoped to .openbook.ie so the session is shared between app.* and dash.*.
 * On Vercel preview hosts, they must stay host-only or the browser rejects
 * them and OAuth appears to bounce back to login.
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies() as unknown as UnsafeUnwrappedCookies;
  const host = (headers() as unknown as UnsafeUnwrappedHeaders).get('host') ?? '';
  const isProduction = process.env.NODE_ENV === 'production';
  const useCrossSubdomain = isProduction && host.endsWith('openbook.ie');

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: useCrossSubdomain ? { domain: '.openbook.ie' } : undefined,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const opts = useCrossSubdomain
                ? { ...options, domain: '.openbook.ie' }
                : options;
              cookieStore.set({ name, value, ...opts });
            });
          } catch {
            /* Called from a Server Component — cookies are read-only here.
             * Middleware handles session refresh, so this is safe to ignore. */
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
