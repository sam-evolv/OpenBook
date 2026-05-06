import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Middleware handles two jobs:
 * 1. Refresh the Supabase session cookie on every request. Cookies are
 *    scoped to .openbook.ie so the session is shared between
 *    app.openbook.ie and dash.openbook.ie.
 * 2. Host-based routing for app.openbook.ie (consumer) — / rewrites to
 *    /home, and any /dashboard hit redirects to dash.openbook.ie.
 *
 * Dashboard host routing (dash.openbook.ie/ → /dashboard) is handled
 * at the page level in app/page.tsx, not here. An earlier middleware
 * version did this redirect itself and produced a production redirect
 * loop (see PR #72) — keeping the dash. routing in plain page handlers
 * keeps the control flow easier to reason about.
 *
 * Why the cookie handling is this careful: @supabase/ssr can call the
 * cookie setter multiple times per request (the auth token is chunked
 * across sb-<ref>-auth-token, .0, .1, …). Creating a fresh NextResponse
 * on each call — a pattern from older docs — drops every cookie except
 * the last, which silently corrupts the session. We build the response
 * once, apply all cookies in a single setAll pass, then stamp the
 * domain onto every Set-Cookie header as belt-and-suspenders.
 */

const DASHBOARD_HOST = 'dash.openbook.ie';
const COOKIE_DOMAIN = '.openbook.ie';

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const host = req.headers.get('host') ?? '';
  const pathname = url.pathname;
  const isProduction = process.env.NODE_ENV === 'production';
  const useCrossSubdomain = isProduction && host.endsWith('openbook.ie');

  let response = NextResponse.next({ request: { headers: req.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: useCrossSubdomain ? { domain: COOKIE_DOMAIN } : undefined,
      cookies: {
        getAll() {
          return req.cookies.getAll().map(({ name, value }) => ({ name, value }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            req.cookies.set(name, value);
          });
          response = NextResponse.next({ request: { headers: req.headers } });
          cookiesToSet.forEach(({ name, value, options }) => {
            const opts = useCrossSubdomain
              ? { ...options, domain: COOKIE_DOMAIN }
              : options;
            response.cookies.set(name, value, opts);
          });
        },
      },
    }
  );

  /* Refresh session — triggers setAll above if tokens rotated */
  await supabase.auth.getUser();

  /* Host-based routing. Any redirect/rewrite response must carry over the
     Supabase cookies we just wrote, otherwise the refreshed token is lost.
     dash.* routing is handled at the page level — see app/page.tsx. */
  let routed: NextResponse | null = null;

  if (host.startsWith('app.') || host.includes('localhost')) {
    if (pathname === '/') {
      url.pathname = '/home';
      routed = NextResponse.rewrite(url);
    } else if (pathname.startsWith('/dashboard')) {
      url.host = DASHBOARD_HOST;
      routed = NextResponse.redirect(url);
    }
  }

  if (routed) {
    response.cookies.getAll().forEach((cookie) => {
      routed!.cookies.set(cookie);
    });
    response = routed;
  }

  /* Belt-and-suspenders: force Domain=.openbook.ie onto every sb-* cookie
     header. This guards against any code path where the domain option
     didn't propagate through Supabase's chunk serializer. */
  if (useCrossSubdomain) {
    const existing = response.headers.getSetCookie();
    if (existing.length > 0) {
      const rewritten = existing.map((header) => {
        if (!/^sb-/i.test(header)) return header;
        if (/;\s*Domain=/i.test(header)) return header;
        return `${header}; Domain=${COOKIE_DOMAIN}`;
      });
      response.headers.delete('set-cookie');
      for (const h of rewritten) {
        response.headers.append('Set-Cookie', h);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
