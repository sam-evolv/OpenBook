import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * Bare `/dashboard` handler.
 *
 * Three entry paths all converge here:
 *   1. dash.openbook.ie/           → middleware redirect → /dashboard
 *   2. dash.openbook.ie/dashboard  → direct hit
 *   3. app.openbook.ie/dashboard   → middleware host-swap redirect → (1)
 *
 * The (dashboard) route-group layout runs its own
 * requireCurrentBusiness gate — unauthed users never reach this file
 * and users with no live business get routed to /onboard/flow by the
 * layout. By the time this page renders, the owner has a live
 * business, so we just land them on the actual home of the dashboard.
 *
 * Before this existed, dash.openbook.ie/ 404d because the middleware
 * redirected `/` → `/dashboard` and nothing served /dashboard.
 */
export default function DashboardRootPage() {
  redirect('/dashboard/overview');
}
