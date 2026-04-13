import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// When true, all auth redirects are skipped so you can browse the dashboard
// without a real session during local development.
const DEV_BYPASS = process.env.NODE_ENV === 'development'

// Consumer app routes — publicly accessible, no auth required.
// These bypass Supabase entirely (faster, no session overhead).
// '/' is the marketing landing page — public, no auth gate.
const CONSUMER_PREFIXES = [
  '/',
  '/home',
  '/explore',
  '/business',
  '/booking',
  '/consumer-bookings',
  '/wallet',
  '/me',
  '/welcome',
]

function isConsumer(pathname: string) {
  return CONSUMER_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )
}

// Routes that require an authenticated session.
const PROTECTED = [
  '/overview', '/calendar', '/bookings', '/services', '/packages',
  '/staff', '/customers', '/analytics', '/messages', '/reviews',
  '/schedule', '/settings', '/onboarding',
]

function isProtected(pathname: string) {
  return PROTECTED.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Consumer routes are public — skip Supabase entirely.
  if (isConsumer(pathname)) return NextResponse.next()

  const res = NextResponse.next()

  // Always refresh the Supabase session cookie so it doesn't expire mid-session.
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

  // Refresh session (important for expiry rotation).
  const { data: { user } } = await supabase.auth.getUser()

  // In development, skip all auth redirects.
  if (DEV_BYPASS) return res

  // Redirect unauthenticated users away from protected pages.
  if (!user && isProtected(pathname)) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  return res
}

export const config = {
  matcher: [
    // Run on all routes except static files and Next.js internals.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)',
  ],
}
