import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// When true, all auth redirects are skipped so you can browse the dashboard
// without a real session during local development.
const DEV_BYPASS = process.env.NODE_ENV === 'development'

// ── Consumer public routes ─────────────────────────────────────────────────
// These are accessible without authentication — bypass Supabase entirely.
// '/' is the marketing landing page — public, no auth gate.
const CONSUMER_PUBLIC = [
  '/',
  '/home',
  '/explore',
  '/business',
  '/welcome',
  '/auth/callback',
]

// ── Consumer protected routes ──────────────────────────────────────────────
// These require a consumer auth session → redirect to /welcome if absent.
const CONSUMER_PROTECTED = [
  '/booking',
  '/consumer-bookings',
  '/wallet',
  '/me',
]

// ── Dashboard protected routes ─────────────────────────────────────────────
// These require a business/dashboard session → redirect to /login if absent.
const DASHBOARD_PROTECTED = [
  '/overview', '/calendar', '/bookings', '/services', '/packages',
  '/staff', '/customers', '/analytics', '/messages', '/reviews',
  '/schedule', '/settings', '/onboarding',
]

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── Consumer public routes — no Supabase needed ──
  if (matchesPrefix(pathname, CONSUMER_PUBLIC)) {
    return NextResponse.next()
  }

  // ── For all auth-aware routes, create the Supabase client ──
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value)
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Refresh session (important for cookie rotation).
  const { data: { user } } = await supabase.auth.getUser()

  // In development, skip all auth redirects.
  if (DEV_BYPASS) return res

  // ── Consumer protected — redirect to /welcome if not logged in ──
  if (!user && matchesPrefix(pathname, CONSUMER_PROTECTED)) {
    const url = req.nextUrl.clone()
    url.pathname = '/welcome'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // ── Dashboard protected — redirect to /login if not logged in ──
  if (!user && matchesPrefix(pathname, DASHBOARD_PROTECTED)) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  matcher: [
    // Run on all routes except static files and Next.js internals.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)',
  ],
}
