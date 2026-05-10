import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * Root `/` handler.
 *
 * On known production hosts the middleware intercepts `/` before this
 * file runs (dash.* redirects to /dashboard; app.* and localhost
 * rewrite to /home). This page is the belt-and-braces fallback for:
 *   - Vercel preview subdomains (open-book-git-*.vercel.app) where the
 *     middleware's host check doesn't match
 *   - Unknown / unmapped hosts
 *
 * Host sniffing is cheap enough to keep inline here — the middleware
 * remains the canonical router for the two production hosts.
 */
export default async function RootPage() {
  const host = (await headers()).get('host') ?? '';
  if (host.startsWith('dash.')) {
    redirect('/dashboard');
  }
  redirect('/home');
}
