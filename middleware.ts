import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

/**
 * Middleware handles two jobs:
 * 1. Host-based routing — app.openbook.ie serves consumer app,
 *    dash.openbook.ie serves dashboard.
 * 2. Refreshes the Supabase session cookie on every request so
 *    SSR calls have a fresh token. Cookies are scoped to .openbook.ie
 *    so they work across subdomains.
 */

const CONSUMER_HOST = 'app.openbook.ie';
const DASHBOARD_HOST = 'dash.openbook.ie';

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const host = req.headers.get('host') ?? '';
  const pathname = url.pathname;

  /* Create a response we can mutate */
  let response = NextResponse.next({ request: { headers: req.headers } });

  /* Set up Supabase client bound to this request/response for cookie refresh */
  const isProduction = process.env.NODE_ENV === 'production';
  const domain = isProduction ? '.openbook.ie' : undefined;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          const cookieOpts = { ...options, domain: domain ?? options.domain };
          req.cookies.set({ name, value, ...cookieOpts });
          response = NextResponse.next({ request: { headers: req.headers } });
          response.cookies.set({ name, value, ...cookieOpts });
        },
        remove(name: string, options: CookieOptions) {
          const cookieOpts = {
            ...options,
            domain: domain ?? options.domain,
            maxAge: 0,
          };
          req.cookies.set({ name, value: '', ...cookieOpts });
          response = NextResponse.next({ request: { headers: req.headers } });
          response.cookies.set({ name, value: '', ...cookieOpts });
        },
      },
    }
  );

  /* Refresh session — this updates cookies if needed */
  await supabase.auth.getUser();

  /* Host-based routing */
  if (host.startsWith('dash.')) {
    /* dash.openbook.ie — rewrite to /dashboard routes */
    if (pathname === '/') {
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
    if (
      !pathname.startsWith('/dashboard') &&
      !pathname.startsWith('/onboard') &&
      !pathname.startsWith('/auth') &&
      !pathname.startsWith('/api')
    ) {
      url.pathname = `/dashboard${pathname}`;
      return NextResponse.rewrite(url);
    }
  } else if (host.startsWith('app.') || host.includes('localhost')) {
    /* app.openbook.ie — consumer + onboarding */
    if (pathname === '/') {
      url.pathname = '/home';
      return NextResponse.rewrite(url);
    }
    /* Block dashboard access on the consumer host */
    if (pathname.startsWith('/dashboard')) {
      url.host = DASHBOARD_HOST;
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
