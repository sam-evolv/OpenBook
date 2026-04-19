import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client. The auth cookie is scoped to .openbook.ie
 * (leading dot) so the session is readable on both app.openbook.ie and
 * dash.openbook.ie. Local dev falls back to host-scoped cookies.
 */
export function createSupabaseBrowserClient() {
  const onOpenbookDomain =
    typeof window !== 'undefined' &&
    window.location.hostname.endsWith('openbook.ie');

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    onOpenbookDomain
      ? {
          cookieOptions: {
            domain: '.openbook.ie',
            sameSite: 'lax',
            secure: true,
            path: '/',
          },
        }
      : undefined
  );
}
