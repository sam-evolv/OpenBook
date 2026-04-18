import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Host-based routing.
 *
 *   app.openbook.ie    → consumer app (default /home)
 *   dash.openbook.ie   → business dashboard (default /dashboard)
 *   *.vercel.app       → dev preview, no host switching
 *   anything else      → redirect to app.openbook.ie (fallback)
 *
 * Logic:
 * - dash.* incoming request for "/" → rewrite to /dashboard
 * - dash.* anything else → leave untouched (already hitting /dashboard/...)
 * - app.* incoming request for "/" → rewrite to /home
 * - preview/localhost → route to /home by default
 */
export function middleware(req: NextRequest) {
  const host = req.headers.get('host') ?? '';
  const url = req.nextUrl.clone();

  const isDash = host.startsWith('dash.');
  const isApp = host.startsWith('app.');
  const isRoot = url.pathname === '/';

  // Dashboard subdomain — route "/" to /dashboard
  if (isDash) {
    if (isRoot) {
      url.pathname = '/dashboard';
      return NextResponse.rewrite(url);
    }
    // Block consumer routes on dash.* subdomain
    const consumerRoutes = ['/home', '/explore', '/assistant', '/wallet', '/me', '/business/', '/booking/', '/consumer-bookings'];
    if (consumerRoutes.some((r) => url.pathname.startsWith(r))) {
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Consumer subdomain (or preview) — route "/" to /home
  if (isApp || !isDash) {
    if (isRoot) {
      url.pathname = '/home';
      return NextResponse.rewrite(url);
    }
    // Block dashboard routes on app.* subdomain
    if (isApp && url.pathname.startsWith('/dashboard')) {
      const dashUrl = new URL(url);
      dashUrl.host = host.replace('app.', 'dash.');
      return NextResponse.redirect(dashUrl);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon, robots, sitemap
     * - public files (svg, png, jpg, ico)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
