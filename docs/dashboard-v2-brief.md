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
- 2026-04-21: **Customer name normalisation (out of scope).** The `customers` table carries both `full_name` and `first_name`/`last_name`. Existing code reads inconsistently: consumer `/me` uses `full_name`, dashboard reads `first_name`/`last_name`, booking API writes only `full_name`. Phase 2 Bookings reads with fallback `first_name last_name || full_name || 'Guest'`. Canonical cleanup (derive `full_name` server-side, drop or deprecate the other pair) is a **separate cleanup PR after Phase 4**, tracked in §8.
- 2026-04-21: **Phase 3 open question — where does revenue goal editing live?** The prototype shows "Monthly revenue goal" under Settings → Business info, but the brief's §5 migration lists `businesses.monthly_revenue_goal` as a Phase 3 Overview concern. **Decide during Phase 3 Overview work** whether the edit UI lives on Overview (closer to the goal's visualisation) or Settings (closer to other business config). Phase 2 Settings ships without this field.
- 2026-04-21: **Phase 3 prerequisite — generate Supabase types.** Before Phase 3 PR #1 starts, run `supabase gen types typescript` and commit the output. Phase 2 pages are narrow enough to type by hand; Phase 3+ (Overview, Calendar, Intelligence) touch enough tables that generated types become worth the setup.
- 2026-04-21: **Auto-merge rule** added to §7 Deployment Strategy. PRs that are UI-only or additive-migration-only, with no changes to auth/payments/webhooks/RLS and no new secrets, auto-merge after Sam's preview sign-off. Momentum-first for the rest of Phase 2 and all of Phase 3; human-in-the-loop retained for anything touching auth, payments, webhooks, RLS, or destructive schema changes.

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

### Phase 3: Complex pages with new data (5 PRs)

5. **Overview** — the hero page. Needs:
   - A revenue goal setting on `businesses.monthly_revenue_goal` (add column, migration required). **Open question — decide this PR**: does the edit UI live on Overview (closer to the goal's visualisation) or on Settings (closer to other business config)? Prototype suggests Settings; existing v5b.2 doesn't have a goal yet; the visual feedback loop is strongest on Overview. Flag to Sam.
   - Waitlist component (already exists? Check `waitlist` table)
   - AI Intelligence cards: these should be backed by a new `insights` table or computed on-the-fly via a Postgres view. Decide which in this PR.
   - **Prerequisite:** run `supabase gen types typescript` before this PR and commit the generated types. Phase 3 touches enough tables that hand-typing per page is no longer the cheap path.
6. **Calendar** — week view with multi-staff filter. Requires:
   - `staff` table already exists per memory. Confirm schema.
   - A booking detail drawer component
   - A new booking modal
   - Drag-and-drop for rescheduling is **out of scope for v1**. Click-to-open, button-to-reschedule is enough.
7. **Customers CRM** — read-heavy. Add `customers.favourited` boolean column if missing. Win-back cohort query.
8. **Team page** — read the `staff` table. Compute utilisation from bookings. Roles & permissions can be hardcoded in v1; full RBAC is a separate project.
9. **Intelligence page** — analytics-heavy. Requires:
   - `business_health_score` — a view or materialized view
   - Category benchmarks — these need a seed table of anonymised category averages. Use hardcoded values for v1, mark with a TODO.

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

Likely missing columns/tables (verify against actual schema first):

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
