import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client. We configure the auth cookie with
 * domain=.openbook.ie so the session works across app.openbook.ie
 * and dash.openbook.ie.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        /* Only set domain in production — local dev uses localhost */
        domain:
          typeof window !== 'undefined' && window.location.hostname.endsWith('openbook.ie')
            ? '.openbook.ie'
            : undefined,
        sameSite: 'lax',
        secure:
          typeof window !== 'undefined' && window.location.protocol === 'https:',
      },
    }
  );
}
