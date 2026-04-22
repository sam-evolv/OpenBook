# OpenBook Dashboard v4 — Production Implementation Brief

**Purpose:** Full specification for translating the OpenBook dashboard v4 prototype into production code in the existing Next.js 14 App Router codebase. Lives alongside the repo so every session working on the migration inherits the same context.

**Source of truth:** The v4 prototype file (`openbook-dashboard-v4.jsx`) is the visual + UX spec. This document is the migration plan + engineering rules. Where they disagree, this document wins.

**Change log:**
- 2026-04-20: Route `/v2/overview` clarified to live at `app/(dashboard-v2)/v2/overview/page.tsx` (route group doesn't add a URL segment).
- 2026-04-20: Font requirement switched from Inter to Geist (matches existing repo convention; Geist is Vercel's font).
- 2026-04-20: File casing standardised to PascalCase (matches repo convention); the companion components file and this brief updated accordingly.
- 2026-04-20: All Phase 1 components live under `components/dashboard-v2/` (not `components/dashboard/`) so old and new coexist until cutover.
- 2026-04-20: Added convention rule — *"When in doubt on any convention, match the nearest existing file in the same folder."*
- 2026-04-21: **Icon prop convention** — `Button` and `FieldRow` take `icon: ReactNode`, not `icon: LucideIcon`. Callers pass a pre-rendered element (`<Plus size={14} />`), not a component reference. Reason: function/component references can't be serialised across the React Server Component boundary, so the `LucideIcon` prop pattern fails when a server component renders these client components. Passing a ReactNode works in both server and client trees. Tradeoff: caller now sets `size` and `strokeWidth` on the icon explicitly (previously inferred from Button size). `EmptyState` keeps `icon: LucideIcon` because it is itself a server component — function refs flow fine across server→server.
- 2026-04-21: **Theme toggle — production pattern.** The Phase 1 preview page toggles theme by setting the `theme` cookie client-side and calling `window.location.reload()`. This is fine for a throwaway preview, but **production dashboard pages should use `router.refresh()` instead of a full reload** after flipping the cookie. The server layout re-reads the cookie on refresh and streams the new theme; the `ThemeProvider` hook updates `document.documentElement[data-theme]` optimistically so the flip feels instant.
- 2026-04-21: **Pairing rule for Phase 2.** Phase 2 ships in **two PRs, not four**: (a) Hours + Settings, (b) Bookings + Services. Pairing pages that share patterns (two write-forms, two read-heavy screens) reduces reviewer overhead and keeps design-system usage consistent across closely-related surfaces. Future phases should pair logically adjacent pages when the form/read-style is shared and the risk of coupling is low.
- 2026-04-21: **`requireCurrentBusiness()` helper.** `lib/queries/business.ts` exports an async server function that reads the authed owner, fetches the live business row, and redirects on miss. Returns `{ owner, business }`. Replaces the inline 4-line server-query block that every dashboard page currently repeats. Not a React hook — it's a server-side fetch-or-redirect utility.
- 2026-04-21: **`businesses.automations` column.** New `jsonb` column on `businesses`, default `'{}'::jsonb`, persists the on/off state of the 8 Settings automation toggles (auto_reviews, auto_waitlist_fill, auto_reminders, win_back_offers, smart_rescheduling, low_stock_alerts, membership_renewal_nudges, class_fill_notifications). Wiring each toggle to real automation logic is a tier-gating-and-eligibility concern for a future PR — Phase 2 persists state only.
- 2026-04-21: ~~**Customer name normalisation (out of scope).** The `customers` table carries both `full_name` and `first_name`/`last_name`…~~ **Superseded 2026-04-22 (see below).** This entry was based on a wrong reading of the schema — `first_name`/`last_name` don't actually exist on `customers`. The cleanup-PR-after-Phase-4 note still stands for the `full_name` vs `name` duplication.
- 2026-04-21: **Phase 3 open question — where does revenue goal editing live?** The prototype shows "Monthly revenue goal" under Settings → Business info, but the brief's §5 migration lists `businesses.monthly_revenue_goal` as a Phase 3 Overview concern. **Decide during Phase 3 Overview work** whether the edit UI lives on Overview (closer to the goal's visualisation) or Settings (closer to other business config). Phase 2 Settings ships without this field.
- 2026-04-21: **Phase 3 prerequisite — generate Supabase types.** Before Phase 3 PR #1 starts, run `supabase gen types typescript` and commit the output. Phase 2 pages are narrow enough to type by hand; Phase 3+ (Overview, Calendar, Intelligence) touch enough tables that generated types become worth the setup.
- 2026-04-21: **Auto-merge rule** added to §7 Deployment Strategy. PRs that are UI-only or additive-migration-only, with no changes to auth/payments/webhooks/RLS and no new secrets, auto-merge after Sam's preview sign-off. Momentum-first for the rest of Phase 2 and all of Phase 3; human-in-the-loop retained for anything touching auth, payments, webhooks, RLS, or destructive schema changes.
- 2026-04-22: **Schema reality — `ai_insights` exists as the `insights` table proposed in §5.** No migration needed. Columns: `id, business_id, headline, body, insight_type, data_snapshot jsonb, dismissed bool, generated_at, model`. Phase 3 Overview + Intelligence read from this table directly. §5 updated.
- 2026-04-22: **Schema reality — `customer_businesses` pivot replaces the `customers.favourited` column proposed in §5.** Per-business favouriting via `customer_businesses.is_favourite` is a better design than a global customer flag (a customer can favourite multiple businesses). Phase 3 Customers queries this pivot. §5 updated.
- 2026-04-22: **Schema reality — `flash_sales` exists with a different shape than §5 proposed.** Actual columns: `id, business_id, service_id, discount_percent, original_price_cents, sale_price_cents, slot_time, expires_at, max_bookings, bookings_taken, status, message`. Single-service + single-slot, not the multi-service `service_ids[]` + `target_audience` shape the brief imagined. Phase 4 Flash Sales will work with the real shape.
- 2026-04-22: **Customer name bug + hotfix.** Both `app/(dashboard)/dashboard/bookings/page.tsx` (v5b.2) and `app/(dashboard-v2)/v2/bookings/page.tsx` (Phase 2 PR 2) queried `customers(first_name, last_name, email, phone)`, but `first_name`/`last_name` don't exist on the `customers` table (it has `full_name` and `name`). PostgREST returns 42703 for the query, so both pages fail against real data. Hotfix in Phase 3 PR 3.0 updates `/v2/bookings` to select `full_name, name, email, phone` and simplifies `displayCustomerName` to `full_name || name || 'Guest'`. v5b.2 `/dashboard/bookings` is left as-is — it's a cutover casualty, not worth fixing code we're deleting.
- 2026-04-22: **Computed-field policy for Phase 3.** For every computed metric (customer cohort status, LTV, staff utilisation, health score, top customers): **default to computing server-side per request** while we're under ~1,000 bookings per business. No cron-persisted derived columns in Phase 3. Each Phase 3 PR plan must explicitly call out computed-vs-persisted decisions for its metrics. We revisit once a single business's dashboard request gets uncomfortably slow (> 300ms P50 on the main query).
- 2026-04-24: **Customer cohort heuristic.** Phase 3 Customers derives the status pill from booking history. Thresholds (explicit so future tuning is traceable):
  - `churned`: last booking > 60 days ago
  - `slipping`: last booking 30–60 days ago (regardless of booking count) OR doesn't match any other bucket
  - `new`: lifetime bookings ≤ 3 AND first booking ≤ 30 days ago
  - `regular`: lifetime bookings ≥ 3 AND last booking ≤ 30 days ago
  If none of the top three conditions match, fall through to `slipping` (safer default — surfaces ambiguous customers for owner attention rather than hiding them as "regular"). Implemented in `lib/dashboard-v2/customers-queries.ts`.
- 2026-04-24: **Staff utilisation formula caveat.** Phase 3 Team computes `utilisation% = booked_minutes / business_open_minutes × 100` over 30 days. This **overestimates for part-time staff** — a staff member who only works Tuesdays sees their utilisation diluted across all 7 business-open days. The approximation is intentional for v1 and stays in place until the `staff_hours` table exists to give each staff member their own available-hours denominator. Don't "fix" this without introducing `staff_hours` first — it's a known compromise, not a bug.
- 2026-04-22: **Cutover complete.** v5b.2 dashboard deleted (`app/(dashboard)/dashboard/*` old pages and `components/dashboard/*` old clients). Phase 3 pages moved from `app/(dashboard-v2)/v2/*` to `app/(dashboard)/dashboard/*` so `/dashboard/*` is now the canonical URL space. The `(dashboard-v2)` route group is gone. Skipped the planned NEXT_PUBLIC_DASHBOARD_V2 feature flag machinery — business isn't live, single-user dogfooding, progressive rollout was unnecessary ceremony. The first_name/last_name bug in the old Bookings page is moot because the file is deleted.

  **Naming holdover:** `components/dashboard-v2/*` and `lib/dashboard-v2/*` folder names kept for now. Renaming to `components/dashboard/*` and `lib/dashboard/*` is a separate small cleanup PR — deferred to avoid mixing structural rename with a code-moving PR.

- 2026-04-25: **Business health score formula.** Phase 3 Intelligence composes a 0–100 score from 5 weighted components over the last 30 days:
  - **Show rate (25 pts):** `100 − (cancelled + no-show) / (confirmed + completed + cancelled + no-show) × 100`
  - **Retention (25 pts):** % of non-cancelled bookings in the window made by customers with ≥ 2 lifetime bookings
  - **Utilisation (20 pts):** same formula as Team page (`booked_minutes / business_open_minutes × 100`), capped at 100
  - **Booking velocity (20 pts):** `100 × min(1, this_30d_count / prior_30d_count)`. If prior-30d is 0 and this-30d ≥ 1, score 100; if both 0, score 0
  - **Review signal (10 pts):** `avg(reviews.rating in last 90d) × 2` (5 stars → 10 pts); 0 if no reviews in window
  Each component is normalised 0–100 then multiplied by its weight; sum is rounded to int. **Minimum signal threshold:** < 10 non-cancelled bookings **in the last 30 days** (dormant businesses with old bookings see the calibration message, not a stale score). The trend delta is this-30d score minus prior-30d score using the same formula. Percentile claims ("Top 18% of personal trainers") are hidden until cross-business aggregates exist. Implemented in `lib/dashboard-v2/intelligence-queries.ts`.
- 2026-04-22: **Empty states mandate for Phase 3.** Brief §6 already flags this but it's being upgraded to a hard rule: **every Phase 3 page must ship a meaningful first-time-user empty state, and the preview must show the empty state**, not just the populated state. "Coming soon" placeholders don't count — the empty state must point the user at a concrete first action. Each preview will render both populated and empty variants side-by-side so Sam can eyeball both in one pass.

---

## 1. Context

### What we're building
OpenBook is an AI-powered booking platform for local service businesses in Ireland. The business dashboard at `dash.openbook.ie` is where business owners manage their operations. We have a prototype of a world-class redesign covering 13 pages (Overview, Calendar, Messages, Intelligence, Flash Sales, Marketing, Bookings, Customers, Catalog, Team, Finance, Hours, Settings) that we need to ship to production.

### Current state
- Live at `dash.openbook.ie` on Vercel
- Next.js 14 App Router + TypeScript + Tailwind
- Supabase for DB, auth, storage, RLS
- Stripe Connect for payments
- Resend for email
- Anthropic Claude API for AI
- Meta WhatsApp Cloud API (direct, no Twilio)
- GitHub repo: `sam-evolv/OpenBook`

### Existing dashboard (v5b.2)
A functional v5b.2 dashboard already lives at `app/(dashboard)/dashboard/` with its own `DashboardNav`, `ThemeProvider`, and per-page Client components. This migration **replaces** it. The old dashboard stays untouched during Phase 1–3 and is deleted at cutover (Phase 4 end).

### Design language
- **Theme:** Linear/Stripe/Vercel-grade dark SaaS dashboard (with light mode toggle)
- **Signature colours:** Black (`#08090B`) background + Gold (`#D4AF37`) accent, nothing else
- **No generic AI aesthetics:** No purple gradients on white, no default sans fallbacks, no emoji icons
- **Dark mode primary, light mode equal-quality**
- **Font: Geist** (via `geist` package — already a dependency; exposes `--font-geist-sans` and `--font-geist-mono`)

---

## 2. Prerequisites — things to verify before starting

Before writing any code, verify:

1. **Which branch is live?** Check Vercel MCP with `get-project` to see the production deploy's commit hash. Confirm that hash matches what's on `main` (or whatever the deploy branch is).
2. **Tailwind config state.** Read `tailwind.config.ts` (or `.js`). Check if custom colours, fonts, or spacing scales exist. Does it have dark mode configured?
3. **Existing component locations.** List the contents of:
   - `app/(dashboard)/` — current dashboard pages
   - `components/dashboard/` — existing shared components (will be replaced by `components/dashboard-v2/`)
   - `lib/supabase/` or similar — existing Supabase client setup
4. **Auth pattern.** How does `app/(dashboard)/dashboard/layout.tsx` currently handle auth? Is there a `useUser` hook, a server-side auth check, or both?
5. **Supabase schema reality.** Read the current tables via the Supabase MCP: `bookings`, `businesses`, `services`, `customers`, `packages`, `waitlist`, `whatsapp_conversations`, `whatsapp_messages`. Confirm columns match what the prototype assumes.

**If any of the above differ significantly from assumptions in this brief, stop and flag it before writing code.**

---

## 3. Sequencing — the order of work

**Core principle: never ship a broken dashboard.** The existing dashboard stays live and functional until each piece of the new one is ready. Use a parallel route group during migration.

### Phase 0: Setup (one session, ~1 hour)
- Create `app/(dashboard-v2)/` route group as a parallel namespace, with the real route at `app/(dashboard-v2)/v2/overview/page.tsx` → URL `/v2/overview`. (Route groups in parens don't add URL segments, so the `v2/` directory is required for a distinct URL.)
- Create `components/dashboard-v2/` folder for shared pieces. Leave `components/dashboard/` (the v5b.2 dashboard) untouched.
- Set up dark mode properly: Tailwind `darkMode: ['selector', '[data-theme="dark"]']` strategy, `data-theme` attribute on the `(dashboard-v2)` layout root, cookie persistence via `cookies().get('theme')` in the server layout.
- Install `recharts` if not already installed. (`lucide-react` is already a dependency.)
- Verify Geist is wired at the `(dashboard-v2)` layout via the `geist` package (`GeistSans.variable` / `GeistMono.variable` on the outer div).
- Verify the empty v2 route loads at `/v2/overview` (gated behind auth).

### Phase 1: Design system (one PR, ~3 hours)
This is the **non-negotiable foundation**. Everything else depends on it.

Extract these as **pure UI components** (no Supabase, no business logic, fully typed) in `components/dashboard-v2/`:
- `ThemeProvider.tsx` — wraps dark/light mode with cookie persistence
- `Sidebar.tsx` — the 13-item nav with workspace switcher, search, AI badge, user footer, theme toggle
- `TopBar.tsx` — reusable page header with title, subtitle, actions slot
- `Card.tsx` — the rounded surface with theme-aware background
- `Button.tsx` — primary (gold) / secondary / ghost / danger variants × sm/md/lg sizes
- `Metric.tsx` — label + big number + delta + sparkline
- `FieldRow.tsx` — labelled input (single line or textarea)
- `MetricBlock.tsx` — small metric for use in list rows (label + value + sub)
- `ContextRow.tsx` — key/value row for the Messages right pane

Each component must:
- Accept typed props (`interface FooProps`)
- Use Tailwind classes that resolve to the design tokens in `tailwind.config.ts`
- Support dark and light via Tailwind's `dark:` prefix, not CSS variables
- Be a client component only if it needs state or events (Sidebar, Button, etc.); everything else is RSC by default

**These exact components in production-ready Tailwind are in the companion file `openbook-dashboard-components.tsx`.** Use that as the starting point — don't re-derive from the prototype.

Ship this as PR #1. Merge before touching pages.

### Phase 2: Simple pages (2 PRs, paired) — see 2026-04-21 change-log entry for pairing rationale

**PR 1 — Hours + Settings** (two write-forms):
1. **Hours page** — lightweight, just a form. Reads/writes `business_hours` table.
2. **Settings page** — the Automations toggles + business info form. Writes to `businesses` table (automations persisted as JSON column; wiring the toggles to real automation logic is out of scope).

**PR 2 — Bookings + Services** (two read-heavy screens):
3. **Bookings page** — read-only table with tabs (Upcoming/Past/Cancelled/All), search, status filtering. Queries `bookings` joined with `customers`, `services`.
4. **Services page** — list with Top Seller / Under-booked badges, edit drawer per service. Only the Services sub-tab of the Catalog page; Packages/Classes/Inventory are deferred.

Each PR:
- Replaces the existing page under the real route (not `v2`) once verified on staging
- Includes matching Supabase queries in `lib/queries/` or equivalent
- Ships without touching the other pages

### Phase 3: Complex pages with new data (4 feature PRs + 1 prereqs PR)

Split per the 2026-04-22 scope assessment: Calendar gets its own PR (biggest piece of the rebuild); Customers + Team pair up (shared list+drawer CRM pattern + shared `staff.colour` migration); Overview and Intelligence stay solo because each is dense enough on its own.

- **PR 3.0 — Prereqs.** Commit generated types to `lib/database.types.ts`, hotfix the `/v2/bookings` `first_name`/`last_name` bug (see 2026-04-22 change-log), reconcile §5 migrations with real schema. Auto-merge eligible.
- **PR 3.1 — Overview (solo).** Hero page.
  - Revenue goal widget. **Decision landed 2026-04-22:** edit UI lives on **Overview** — that's where the visual feedback loop is and the one place it's glanced at every day. Settings stays focused on business info + automations.
  - Additive migration: `businesses.monthly_revenue_goal numeric`.
  - Waitlist summary card reads from the `waitlist` table (`business_id, customer_id, service_id, requested_date, notified_at`).
  - AI Intelligence cards read from the existing `ai_insights` table (`headline, body, insight_type, data_snapshot, dismissed`). Dismiss action flips `dismissed` to true.
  - Top customers widget: computed server-side from `bookings` grouped by `customer_id` in the last 30 days — no persisted rollup column.
- **PR 3.2 — Calendar (solo).** Biggest piece in the rebuild.
  - Week view + day view, multi-staff filter with per-staff colour.
  - Additive migration: `staff.colour text` (palette slug from `lib/tile-palette.ts`; constrained client-side to avoid clashing with brand gold).
  - Honours `business_hours`, `service_schedules` (per-service day/time constraints), `business_closures` (per-date overrides — bank holidays etc), and `businesses.buffer_minutes` when generating and laying out slots.
  - Reuses the `Drawer` primitive for booking detail; adds a `NewBookingModal` (service + staff + customer + time). Click-to-open + button-to-reschedule; drag-to-reschedule out of scope for v1 per brief §8.
- **PR 3.3 — Customers + Team (paired).** Both are list + detail-drawer CRM patterns.
  - **Customers**: favourite indicator from `customer_businesses.is_favourite` (pivot — *not* a column on `customers` as brief originally proposed). Cohort filters (regular / slipping / churned) computed server-side from `bookings.created_at` aggregates — no `customers.status` column. LTV computed server-side from `SUM(bookings.price_cents)` — no `customers.lifetime_value` column. Only `customers.notes text` gets persisted (additive migration) since it's user-entered, not derived.
  - **Team**: staff list from `staff` table (has `name, title, bio, email, avatar_url, instagram_handle, specialties, is_active, sort_order` already). Utilisation computed server-side from `bookings.staff_id` grouped by `staff_id` over the last 30 days. `staff.colour` picker — shares the migration with Calendar.
- **PR 3.4 — Intelligence (solo).** Analytics-heavy.
  - Business health score computed server-side per request (no materialized view in v1). Single query combining booking volume, show rate, review rating, and waitlist depth.
  - Category benchmarks **hardcoded in v1** with a clear TODO: replace with real aggregates once the platform hosts >100 businesses per category. Hardcoded values live in `lib/dashboard-v2/benchmarks.ts` with source citations in comments.
  - AI insights feed from `ai_insights` (shared query helper with Overview).
  - Distribution metrics (source breakdown, device, channel) from `bookings.source`.

### Phase 4: New features requiring backend work (5 PRs)

10. **Messages** — three-pane inbox. This is the biggest piece.
    - Query `whatsapp_conversations` + `whatsapp_messages`
    - AI-suggested replies: a Next.js route handler that hits the Anthropic API with the thread context
    - Real-time updates via Supabase Realtime subscriptions (or poll every 5s initially — realtime can come in v2)
    - The "ChatGPT query" conversation type: needs a new table `ai_queries` to track MCP-sourced interactions
11. **Flash Sales** — this is the marketing USP.
    - New table `flash_sales` (id, business_id, discount_pct, services[], starts_at, ends_at, target_audience, status)
    - New table `flash_sale_notifications` (sale_id, customer_id, sent_at, viewed_at, booked_at)
    - Notification delivery via WhatsApp Cloud API (for favourites with phone numbers) and push (for consumer app users — may not exist yet)
    - AI recommendation engine: a cron job that checks for quiet windows and creates suggestions
12. **Marketing broadcasts** — simpler than Flash Sales.
    - New table `broadcasts` (id, business_id, title, body, channels[], audience, scheduled_for, sent_at)
    - Reuses the same WhatsApp send infrastructure as Flash Sales
13. **Finance** — Stripe integration heavy.
    - Read payouts from Stripe API (don't mirror to DB; fetch fresh)
    - Build monthly P&L from existing `bookings` + Stripe fees
    - VAT tracker: rolling 12-month sum from `bookings.created_at` + `bookings.amount`. Update daily via cron.
    - "Send to accountant" = email a CSV via Resend
14. **Classes + Retail** (in Catalog) — defer unless specifically needed. These are lowest priority.

---

## 4. Engineering rules

### File structure
```
app/
  (dashboard-v2)/
    layout.tsx                # Auth + <Sidebar> shell + theme cookie read
    v2/
      overview/page.tsx
      calendar/page.tsx
      messages/page.tsx
      ... etc
components/
  dashboard-v2/
    Sidebar.tsx
    TopBar.tsx
    Card.tsx
    Button.tsx
    Metric.tsx
    FieldRow.tsx
    ThemeProvider.tsx
  calendar/
    WeekGrid.tsx
    BookingDrawer.tsx
    NewBookingModal.tsx
  messages/
    ConversationList.tsx
    ThreadView.tsx
    ContextPane.tsx
  ... etc
lib/
  queries/
    bookings.ts
    customers.ts
    ... etc
  supabase/
    client.ts                 # existing
    server.ts                 # existing
  stripe/
    payouts.ts
    fees.ts
```

**Convention rule (2026-04-20):** When in doubt on any convention — file naming, import style, whether to use a local helper — **match the nearest existing file in the same folder.** This brief defers to the codebase. The codebase defers to its own precedent.

### TypeScript rules
- No `any`. If the type isn't clear, define it.
- Supabase rows should use generated types from `supabase gen types typescript`. If the project doesn't have generated types yet, generate them as part of Phase 0.
- Every component exports a typed props interface.
- Server Components by default. Client components only when state/events/hooks are needed — use `'use client'` directive.

### Tailwind conventions
- Use the design tokens in `tailwind.config.ts` (see companion components file for the full config).
- Do **not** use inline styles (`style={{ ... }}`) in production code — they're in the prototype for speed only.
- Dark mode via `dark:` prefix on every colour/background/border class. The selector strategy resolves `dark:` against `[data-theme="dark"]` on the dashboard-v2 layout root.
- Font: `font-sans` = Geist (`var(--font-geist-sans)`, loaded via the `geist` package).

### Data fetching rules
- **Server Components fetch data directly** with Supabase server client. No useEffect data-fetching in client components.
- **Mutations use Server Actions** (`'use server'`) where possible, or Route Handlers for third-party webhooks.
- **Real-time updates** use Supabase Realtime subscriptions in client components.
- **Never** expose the Supabase service role key client-side.

### Auth rules
- All dashboard pages require authenticated user
- `app/(dashboard-v2)/layout.tsx` server-side checks the session via `getCurrentOwner()` and redirects to `/onboard` if none. If the owner hasn't completed onboarding, redirect to `/onboard/flow`. (Mirrors `app/(dashboard)/dashboard/layout.tsx`.)
- Every Supabase query uses RLS policies; never rely on client-side filtering
- The `business_id` used in queries comes from `session.user.id` → `businesses.owner_id`

### Error handling
- Every async operation has a try/catch or error boundary
- Surface errors to the user as toasts (use `sonner` or existing toast system)
- Log errors to the server (Vercel logs, or Sentry if configured)

### Accessibility
- Every interactive element has visible focus states (`focus-visible:ring-2`)
- Colour contrast ≥ 4.5:1 for body text, ≥ 3:1 for large text
- Interactive targets ≥ 44×44px on touch devices
- All icons used as buttons have `aria-label`s

---

## 5. Database migrations needed

**Reality-check status** (after the 2026-04-22 schema reconciliation):

| Item | Brief proposed | Schema reality |
|---|---|---|
| `businesses.monthly_revenue_goal` | Add column | ❌ Still needed — Phase 3 Overview |
| `businesses.stripe_payout_schedule` | Add column | ❌ Still needed — Phase 4 Finance |
| `customers.favourited` | Add column | ✅ **Use `customer_businesses.is_favourite`** pivot instead — already exists |
| `customers.status` / `notes` / `lifetime_value` | Add columns | ❌ Still needed — Phase 3 Customers (or compute server-side; prefer compute for `status` + `lifetime_value`, persist `notes`) |
| `flash_sales` table | New table | ✅ **Exists** — different shape than proposed, see 2026-04-22 change-log |
| `flash_sale_notifications` table | New table | ❌ Still needed — Phase 4 Flash Sales |
| `broadcasts` table | New table | ❌ Still needed — Phase 4 Marketing |
| `insights` table | New table | ✅ **Exists as `ai_insights`** — see 2026-04-22 change-log |
| `ai_queries` table | New table | ❌ Still needed — Phase 4 Messages / MCP |
| `staff.colour` | Not in brief | ❌ **Add column** — Phase 3 Team + Calendar (multi-staff colour coding) |

The rest of this section shows the original proposed DDL. **Only treat the "❌ Still needed" rows as migration tasks.**

```sql

```sql
-- businesses
alter table businesses add column if not exists monthly_revenue_goal numeric;
alter table businesses add column if not exists stripe_payout_schedule text default 'weekly';

-- customers
alter table customers add column if not exists favourited boolean default false;
alter table customers add column if not exists status text default 'new'; -- new | regular | slipping | churned
alter table customers add column if not exists notes text;
alter table customers add column if not exists lifetime_value numeric default 0;

-- flash_sales (new)
create table if not exists flash_sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  title text not null,
  discount_pct int not null,
  service_ids uuid[] not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  target_audience text not null default 'favourites',
  status text not null default 'draft',
  created_at timestamptz default now()
);

-- flash_sale_notifications (new)
create table if not exists flash_sale_notifications (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid references flash_sales(id) on delete cascade,
  customer_id uuid references customers(id) on delete cascade,
  sent_at timestamptz,
  viewed_at timestamptz,
  booked_at timestamptz,
  booking_id uuid references bookings(id)
);

-- broadcasts (new)
create table if not exists broadcasts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  title text not null,
  body text not null,
  channels text[] not null default '{whatsapp}',
  audience text not null default 'all',
  scheduled_for timestamptz,
  sent_at timestamptz,
  sent_count int default 0,
  opened_count int default 0,
  bookings_driven int default 0,
  revenue_driven numeric default 0,
  created_at timestamptz default now()
);

-- insights (new) — store AI-generated insights per business
create table if not exists insights (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  kind text not null, -- opportunity | warning | trend
  title text not null,
  body text not null,
  metric_label text,
  action_label text,
  action_href text,
  dismissed_at timestamptz,
  created_at timestamptz default now()
);

-- ai_queries (new) — track MCP-sourced queries
create table if not exists ai_queries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  source text not null, -- chatgpt | claude | gemini
  query text not null,
  region text,
  resulted_in_booking_id uuid references bookings(id),
  created_at timestamptz default now()
);
```

**RLS policies:** every new table needs `business_id = auth.uid()` check (via join to `businesses.owner_id`). Copy patterns from existing `bookings` table RLS.

### 5.1 Bonus discoveries — existing schema features to wire up (2026-04-22)

These already exist in the real schema but weren't enumerated in the brief. Phase 3+ pages should honour them rather than reinventing:

- **`businesses.buffer_minutes`** — gap between consecutive bookings. Calendar slot generation must respect it.
- **`businesses.instagram_access_token` / `instagram_handle` / `instagram_connected_at`** — Instagram integration already live. Overview can show connection status; Marketing (Phase 4) uses this for cross-posting.
- **`businesses.whatsapp_enabled` / `whatsapp_number` / `whatsapp_display_name` / `whatsapp_phone_number`** — WhatsApp Cloud API config already wired. Messages (Phase 4) reads from this.
- **`businesses.stripe_charges_enabled`** — Stripe onboarding flag separate from `stripe_onboarding_completed`. Finance (Phase 4) uses the charges flag as the canonical "ready for payouts" signal.
- **`bookings.staff_id`** — staff assignment lives on the booking row already. Calendar + Team compute utilisation from this directly; no new column needed.
- **`bookings.source`** — string noting how the booking was made (`whatsapp`, `web`, etc). Intelligence distribution metrics read from this. Marketing broadcast attribution (Phase 4) reads from this.
- **`bookings.reminder_24h_sent` / `reminder_2h_sent`** — reminder pipeline flags. Settings automations toggles should gate which reminder cron writes these; the flags themselves exist already.
- **`bookings.stripe_payment_intent_id`** — live on the booking row. Finance (Phase 4) joins on this for payout reconciliation.
- **`business_closures`** — per-date closure overrides (`business_id, date, name, is_bank_holiday`). Calendar honours these; availability API (consumer side) already does.
- **`service_schedules`** — per-service day-of-week + start-time constraints (`service_id, day_of_week, start_time`). Calendar slot generation intersects these with `business_hours`.
- **`customer_credits`** — package credits tracking (`customer_id, package_id, business_id, sessions_remaining, expires_at, purchased_at, stripe_payment_intent_id`). Phase 4 Catalog Packages tab reads this.
- **`reviews`** — booking-linked reviews with business response (`booking_id, customer_id, rating, comment, business_response`). Overview AI insights can surface recent negative reviews; review auto-request automation (Phase 4) writes here.
- **`instagram_posts`** — cached IG posts for the business page. Not a Phase 3 concern but worth knowing it exists.
- **`whatsapp_sessions`** — WA session state (separate from `whatsapp_conversations`). Phase 4 Messages.

---

## 6. Things the prototype gets wrong or oversimplifies

Be aware of these as you build the real thing:

1. **Data is mocked.** Every number in the prototype is invented. Real queries will return different shapes.
2. **No loading states.** The prototype has no skeleton screens. Every page needs skeleton components for initial load and optimistic UI for mutations.
3. **No error states.** What happens when Supabase times out? Every async operation needs a handled failure path.
4. **No empty states for first-time users.** A brand-new business has zero bookings, zero customers, zero everything. Each page needs a tailored empty state that guides them to their first meaningful action.
5. **Drag-and-drop is shown but not required.** The calendar prototype implies drag-to-reschedule. V1 can ship with click-to-edit only.
6. **Inline styles only.** Production uses Tailwind. Use the companion components file as the style translation reference.
7. **Staff colour assignment.** The prototype hardcodes coach colours. Production should let the business owner pick a colour per staff member, constrained to a palette that doesn't clash with brand gold.
8. **AI suggestion chips in Messages.** These need a real endpoint. Build `POST /api/ai/suggest-reply` that takes the thread and returns 2–3 suggestions via Claude. Cache for 60s per thread to avoid hammering the API.
9. **VAT tracker.** The Irish VAT calculation in the prototype assumes a €40k threshold, but the actual services threshold is €42,500 as of Jan 2025. Verify the current Revenue.ie figure at build time.
10. **"ChatGPT query" in the Messages inbox.** The prototype shows MCP-sourced bookings in the unified inbox. For this to work, the MCP server at `mcp.openbook.ie` needs to write to the `ai_queries` table. If the MCP isn't built yet, ship Messages without this feature in v1 and add it when MCP goes live.

---

## 7. Deployment strategy

### Branching
- Work happens on feature branches: `dashboard-v2/phase-0-setup`, `dashboard-v2/phase-1-design-system`, `dashboard-v2/overview`, etc.
- Each PR merges to `main`, which auto-deploys to Vercel preview
- Promote to production only after smoke testing on the preview URL

### Auto-merge rule (2026-04-21)
For the remainder of Phase 2 and all of Phase 3, a PR **auto-merges** after Sam's preview sign-off if it meets **all** of these criteria:

- UI / frontend code only, **or** additive database migrations (new column, new table, new index)
- No changes to authentication or authorisation logic
- No changes to payment code (Stripe)
- No changes to public webhook handlers (WhatsApp, any inbound route from the public internet)
- No changes to RLS policies
- No destructive migrations (drop / rename / data backfill)
- No new environment variables or secrets required

**Workflow:** prereqs check → build → preview → Sam's visual sign-off → commit → push → open PR → auto-merge → delete branch → start next PR's prereqs immediately (don't wait for a "go" between merge and next prereqs — Sam reviews prereqs reports as they arrive).

If a PR fails **any** criterion, stop before merging and ask Sam to review the GitHub diff first. Auth, payments, webhooks, RLS, and destructive migrations always get a human in the loop.

### Feature flags
The `(dashboard-v2)` route group with `/v2/*` URLs gives us a parallel namespace — no env flag required until cutover. Users hit the old dashboard at `/dashboard/*`; the new one is at `/v2/*` until we swap routes.

### Rollback plan
If a page has a regression after cutover, revert the cutover commit. Keep the old pages around for two weeks post-cutover before deleting.

### Smoke tests before each production promotion
- Load the page logged in as the demo business
- Load the page logged in as a new/empty business (empty state works?)
- Load on mobile viewport (640px) — this prototype is desktop-first; responsive is a whole separate concern
- Load in dark mode and light mode
- Trigger each mutation button and verify it succeeds

---

## 8. What's NOT in scope for this migration

Flag these for future work:

- Mobile-responsive design below 1024px (the prototype assumes desktop; mobile is a separate project)
- Multi-location support (schema-level, deferred per earlier conversation)
- Gift cards (deferred)
- Membership recurring payments via Stripe Subscriptions (huge scope, deferred)
- Full RBAC for Team (roles are hardcoded in v1)
- Inventory/Retail page (Catalog sub-tab; low priority)
- Classes page (Catalog sub-tab; defer until a yoga studio actually needs it)
- Drag-to-reschedule on Calendar
- Real-time Messages via Supabase Realtime (poll first, realtime later)
- Memberships renewal nudges (a cron job; separate project)
- Low-stock alerts (depends on inventory shipping)
- **Customer name normalisation** — the `customers` table currently carries both `full_name` and `first_name`/`last_name`, and different code paths read/write each inconsistently. Separate cleanup PR after Phase 4. Canonical suggestion: `full_name` derived server-side from a trigger or application logic; the split columns either go away or become the canonical source of truth, but not both.
- **Multi-staff bookings.** `bookings.staff_id` is a single column — the schema assumes **one booking = one staff member**. If a multi-staff business signs up (combined massage+facial where two therapists attend the same appointment, or relay-style class coaching), the model needs a `booking_staff` pivot table, UI to attach multiple staff to a booking, and revenue-share logic for staff utilisation metrics. Out of scope for this migration; flag as a data-model change when the first multi-staff business asks.
- **Staff authentication / self-login.** In v1, staff are owner-managed entities without their own dashboard access — created, edited, and deactivated by the business owner from the Team page. Staff-facing surfaces (their own calendar, their own customers, their own hours) are a separate project. When that lands, `staff.user_id` (new column) will link to an auth account and the existing hardcoded roles become enforceable.
- **In-app refund issuance.** Phase 4 Finance v1 reads refunds from the Stripe API and displays them in the transactions table + P&L, but **owners issue refunds via Stripe Dashboard** — there's no in-app refund button. A proper in-app flow needs refund-reason tracking (free-text vs enum), customer notification design (email / WhatsApp template), partial-refund UX, and a `bookings.refunded_cents` column (or a `refunds` table) for the bookkeeper CSV. Deferred to a follow-up PR once the shape of the refund UX is decided.

---

## 9. Success criteria

The migration is "done" when:

1. Every one of the 13 pages renders correctly with real data for the demo business (Evolv Performance)
2. Every mutation works (create booking, send broadcast, toggle automation, etc.)
3. Dark mode and light mode are both pixel-polished
4. A brand-new business account sees meaningful empty states on every page, not a wall of zeros
5. All old dashboard pages (`app/(dashboard)/dashboard/*`) and `components/dashboard/*` are deleted from the repo
6. Vercel deploy logs show no runtime errors for 48 hours post-cutover
7. Sam says "this is the dashboard I want to sell"

---

## 10. Final notes to the Claude Code session running this

- **Do not rush.** This is a multi-session project. Ship Phase 0, stop, let Sam test, then ship Phase 1. Each phase is a natural checkpoint.
- **Ask, don't assume.** If the existing codebase contradicts this brief, stop and ask Sam which wins.
- **Commit often, commit cleanly.** One logical change per commit. Clear messages. Makes reverts easy.
- **Update this brief as you learn.** If you discover something the brief got wrong, write it into the brief's change log (top of file) and amend the relevant section. The next session inherits the correction.
- **Match the nearest existing file.** When a naming/structural question isn't answered explicitly here, don't invent — copy the closest precedent already in the repo.
- **The prototype is the spec for look and feel.** The brief is the spec for how to build it. The existing codebase is the spec for conventions. When in doubt, the existing codebase wins for conventions.

End of brief.
