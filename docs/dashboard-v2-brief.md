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

- 2026-04-22: **Sidebar-mount gap from cutover PR #30.** The cutover deleted v5b.2's `DashboardNav` but never mounted the v2 `Sidebar` in the new route-group layout. Every page post-cutover rendered as TopBar + content only — no cross-page nav, no space for the Sidebar's unread counter / upcoming-bookings badge / Live-on-AI card. Not caught because Phase 1–3 visual previews verified individual pages in isolation (with the Sidebar rendered as a sibling component in the preview route) and cross-page navigation was never part of the review loop. Fixed in a small standalone PR that wraps `app/(dashboard)/layout.tsx` in `<ThemeProvider>` + flex shell + `<Sidebar>`.

  **Lesson-learned for future cutover / layout PRs:** *Individual page previews verify content, not shell. Any PR that touches a route-group `layout.tsx` or deletes a layout component must include an explicit nav-and-shell render check on at least one downstream page, not just the components it directly modifies.*

- 2026-04-22: **AI provider reality correction.** The brief originally specified "Anthropic Claude API for AI" across the board. Audit (2026-04-22) found the live code is split: `lib/whatsapp-brain.ts` uses **OpenAI GPT-4o** (env `OPENAI_API_KEY`) — that's the shipped state and the provider we're building on going forward. The consumer `/api/assistant` route at `app.openbook.ie/assistant` is still on Anthropic (`claude-sonnet-4-5`, env `ANTHROPIC_API_KEY`) and is flagged for migration — to be batched into the Phase 4 Messages PR alongside the reply-suggestions endpoint, or handled separately. Brief §1 ("Tech stack"), §3 Phase 4 Messages, and §6 item 8 updated to reflect OpenAI as the canonical internal provider. **External USP stays as-is:** "queryable on ChatGPT / Claude / Gemini via MCP" is about being bookable FROM those assistants, unaffected by the internal provider choice. Legacy `src/` folder contains older Anthropic-based code (Vite prototype), unreferenced from the live app — flagged for a standalone delete-`src/` PR.
- 2026-04-22: **`/api/assistant` migration + vocabulary-mismatch fix.** Migrated from Anthropic `claude-sonnet-4-5` to OpenAI `gpt-4o-mini`. Model lock confirmed for reply-suggestion work in Phase 4 Messages. Smoke test on Vercel preview revealed a **pre-existing v5b.2 bug** the migration did not introduce: `ILIKE '%personal trainer%'` does not match data category `"Personal Training"` because `"trainer"` is not a substring of `"training"`. Same mismatch bites `"physiotherapist"` vs `"physiotherapy"`. Also: model was defaulting to Dublin for unspecified-city queries, and the route had no coverage-gap handling for city-specific searches against Cork-only seeded data. Fixes landed in the same PR: (1) **server-side synonym expansion** via a hand-curated `CATEGORY_SYNONYMS` map in `app/api/assistant/route.ts` — one user-facing key explodes to multiple DB-facing substrings; (2) **city-empty fallback** — if a city filter returns zero, retry without it and flag `fallback: 'city_no_coverage'` so the model surfaces each result's actual city honestly; (3) **prompt updates** — explicit "do not default to a city" + "acknowledge coverage gap when fallback fires". Query-term vocabulary in the tool description framed as a guide, not a whitelist. Maintenance burden of the synonym map tracked in §8 (migrate to `pg_trgm` post-50-businesses). Verified against live Supabase data via REST probes — "personal trainer" → 3 matches, "physiotherapist" → Cork Physio, "yoga" → Yoga Flow Cork, "Dublin" city queries → fallback fires correctly.
- 2026-04-25: **Business health score formula.** Phase 3 Intelligence composes a 0–100 score from 5 weighted components over the last 30 days:
  - **Show rate (25 pts):** `100 − (cancelled + no-show) / (confirmed + completed + cancelled + no-show) × 100`
  - **Retention (25 pts):** % of non-cancelled bookings in the window made by customers with ≥ 2 lifetime bookings
  - **Utilisation (20 pts):** same formula as Team page (`booked_minutes / business_open_minutes × 100`), capped at 100
  - **Booking velocity (20 pts):** `100 × min(1, this_30d_count / prior_30d_count)`. If prior-30d is 0 and this-30d ≥ 1, score 100; if both 0, score 0
  - **Review signal (10 pts):** `avg(reviews.rating in last 90d) × 2` (5 stars → 10 pts); 0 if no reviews in window
  Each component is normalised 0–100 then multiplied by its weight; sum is rounded to int. **Minimum signal threshold:** < 10 non-cancelled bookings **in the last 30 days** (dormant businesses with old bookings see the calibration message, not a stale score). The trend delta is this-30d score minus prior-30d score using the same formula. Percentile claims ("Top 18% of personal trainers") are hidden until cross-business aggregates exist. Implemented in `lib/dashboard-v2/intelligence-queries.ts`.
- 2026-04-22: **Empty states mandate for Phase 3.** Brief §6 already flags this but it's being upgraded to a hard rule: **every Phase 3 page must ship a meaningful first-time-user empty state, and the preview must show the empty state**, not just the populated state. "Coming soon" placeholders don't count — the empty state must point the user at a concrete first action. Each preview will render both populated and empty variants side-by-side so Sam can eyeball both in one pass.
- 2026-04-23: **Pre-existing webhook security issues caught in Messages Stage 1 review (fixed in the Messages PR).** Neither issue was introduced by Messages work — both were already live in `app/api/whatsapp/webhook/route.ts` from pre-Phase-4 code. Surfaced during the mandatory diff review on the dashboard-to-WhatsApp send path and fixed inline rather than deferred:
  1. **Missing webhook signature verification.** The POST handler accepted any request without HMAC validation. An attacker could POST fake payloads to `/api/whatsapp/webhook` — triggering the OpenAI brain (burning credits), inserting fake inbound messages, and causing the business to send real WhatsApp replies to attacker-specified numbers. Fixed by verifying `x-hub-signature-256` against `HMAC-SHA256(WHATSAPP_APP_SECRET, rawBody)` with `crypto.timingSafeEqual`. Fails closed on missing secret, missing header, or digest mismatch — returns 403 in all rejection cases.
  2. **"First live business" fallback on phone_number_id no-match.** If Meta's `phone_number_id` didn't resolve to a known business, the handler picked the first `is_live=true` row in the table and routed the message there. Works today (only Evolv is live) but corrupts customer data the moment a second real business onboards. Fixed by removing the fallback entirely — no-match now logs and returns 200 without touching state.
  - **New env var required:** `WHATSAPP_APP_SECRET` — from the Meta app dashboard, distinct from `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (which is only the one-time subscription token for the GET handshake). Must be set before the Messages PR merges or the webhook will 403 all legitimate Meta traffic.
  - **Minor follow-up:** `whatsapp_messages.meta_message_id` insert writes a column that isn't in the generated `lib/database.types.ts`. Verify the column exists in the live DB; if it does, re-run `supabase gen types typescript`. If it doesn't, the insert has been silently dropping the field — separate follow-up PR after Messages ships.
  - **New deployment rule:** §7 gains a "Public-webhook security requirements" subsection mandating signature verification + fail-closed + no-fallback-routing on every public webhook endpoint going forward.
  - **Future observability (not in this PR):** the webhook's inner `try/catch` still returns 200 to Meta on any post-verification failure (intentional — stops Meta from retry-storming us on our own bugs). That hides real errors. Wire a dead-letter queue (Supabase table with a 30-day TTL) or Sentry to catch DB-insert failures, AI-brain timeouts, and `sendWhatsAppMessage` errors **after** signature verification has passed, so we can observe them without changing the 200-OK-to-Meta contract. Candidates: small `webhook_failures` table populated on each inner catch, or a wrapper that forwards the exception to Sentry. Separate PR once we have an error-tracking provider decided.
- 2026-04-23: **Dogfooding bugs — backlogged.** (1) **Theme toggle broken.** The Sidebar-footer light/dark toggle near the user initials doesn't actually swap themes — click produces no visual change. Likely causes to investigate: (a) the cookie write from `useTheme().toggle` isn't propagating to the server render because `ThemeProvider`'s optimistic `document.documentElement[data-theme]` update isn't firing, (b) the cookie is being written with the wrong `domain` / `path` in dev so the server read on refresh misses it, (c) the `router.refresh()` pattern documented in the 2026-04-21 change-log entry isn't being called after the cookie flip. Verify `components/dashboard-v2/ThemeProvider.tsx` + Sidebar's `onClick={toggle}` handler end-to-end. Polish PR. (2) **Multi-business infinite redirect** — full write-up in §8 "Multi-business ownership" entry. Temp workaround applied: only one Evolv business on Sam's account set `is_live=true`.
- 2026-04-23: **Preview Auth Fix PR.** Production `dash.openbook.ie` root was 404-ing because `middleware.ts` redirects `dash.*:/` → `/dashboard` but no page served `/dashboard`. Fixed by adding `app/(dashboard)/dashboard/page.tsx` (redirects to `/dashboard/overview`; layout already handles unauth / no-business gating). `app/page.tsx` upgraded to a host-sniffing fallback for preview subdomains and other hosts the middleware doesn't match — redirects to `/dashboard` or `/home` based on `Host` header. Added `docs/auth-setup.md` documenting the manual `owners`-row seeding step for new auth users, the Vercel Deployment Protection disable step (**Settings → Deployment Protection → Preview deployments → None**) that unblocks preview review, and the Supabase redirect allowlist. Long-term `owners` trigger logged in §8 as a deferred follow-up. Auto-merge eligible: pure routing + documentation, no migration, no auth logic.
- 2026-04-23: **Phase 4 PR 4.3 Flash Sales Stage 1 — dashboard dry-run.** Additive migration: new `flash_sale_notifications` table with owner-scoped RLS; new `customer_businesses.promo_opt_in / promo_opt_in_at / promo_opt_in_source` columns (GDPR audit trail); new `bookings.flash_sale_id` FK for attribution. `flash_sales` table kept as-is — the 4 existing RLS policies (3 owner-scoped + 1 "public can view active") are more precise than the `flash_sales_owner_all` my migration originally tried to add, so Studio rolled back; the preserved policies cover the consumer-flow read path and owner CRUD. No DELETE policy — drafts soft-delete via `status='deleted'`. `/dashboard/flash-sales` ships Active/Upcoming/Past sections, a QuietZoneNudge-extending AI suggestions widget capped at 3, and a Create drawer that lets the owner set service / specific slot / 5–50% discount / max bookings / 3–48h expiry / short message / target audience (all / favourites / slipping / churned — `regular` and `new` intentionally excluded to protect loyal pricing anchors and not flash-sale first-time customers). Publishing a draft is **dry-run only** — it materialises `flash_sale_notifications` rows with `status='queued'` for opted-in customers and `status='blocked' + block_reason='no_opt_in'` for the rest, but never calls WhatsApp. Stage 1 ships with **zero opted-in customers by design** because the consumer-flow checkbox was dropped (see next entry). Prominent dashboard banner: "Will send to 0 of N customers. Opt-ins arrive in Stage 2."
  - **Consumer-flow checkbox dropped from Stage 1** — discovered during build that the consumer booking flow is cookie-only guest mode with no phone collection at all. Bolting an opt-in checkbox onto a flow that doesn't know the customer's phone number would be cosmetic. The proper fix is architectural and lives in a Consumer Booking Flow v2 PR (added to §8 as a named Phase 5 priority). Stage 2 of Flash Sales unlocks opt-in via WhatsApp `YES` replies and owner-initiated invite templates instead.
  - **Stage 2 scope (explicit deferral):** Meta template registration (`openbook_flash_sale_v1` + `openbook_opt_in_request_v1`), real WhatsApp send pipeline with 500 ms throttle + 250-recipient cap (Tier 1 BIM limit), webhook `YES` / `STOP` reply detection wiring opt-in flips + unsubscribes, owner-initiated opt-in-request template send, queue processing for `status='queued'` rows.
- 2026-04-23: **Phase 4 PR 4.2 Messages Stage 2 — AI reply suggestions.** Adds `POST /api/ai/suggest-reply` (OpenAI `gpt-4o-mini`, 7 s timeout, JSON-object response_format) and `<AISuggestionChips />` mounting above the Composer textarea. Endpoint validates business-ownership BEFORE the OpenAI call. Module-level `Map` cache keyed by `(conversation_id, last_inbound_message_id)` with 60 s TTL, plus a separate 2 s per-conversation cooldown to survive bad client loops. Chip count: 3 default, 2 for threads with fewer than 3 inbound messages. Chips render only when the last message is inbound AND the last inbound arrived within the last 24 hours. Mid-compose (draft non-empty) preserves existing chips — a new inbound while typing does not replace them. Click-to-pick prefills the textarea and focuses it with caret at end; no click-to-send. Any failure (timeout, malformed JSON, OpenAI error, 404) → chips hide silently + `console.error({ tag, cache_label, error })` server-side. Prompt includes business name + category, a compact hours summary (`Mon-Fri 9:00-18:00, Sat 10:00-16:00, Sun closed`), services list (€ only, not durations), today's date in IE format, and the owner's tone (from `businesses.description` if set). No booking slots, no customer PII, no booking history — keeps the prompt lean and privacy-defensible. 200–300 ms opacity fade-in so chips feel thought-up rather than pop-in.
  - **Known limitations documented:** (a) per-instance Map cache — Vercel Fluid Compute reuses instances well but a redeploy clears it; revisit with Redis/KV only if OpenAI costs become material; (b) the cache + cooldown Maps in `lib/ai/suggest-reply-cache.ts` are **unbounded** — entries self-expire at 60 s and Fluid Compute instances are short-lived, so realistic risk is low, but a proper LRU or periodic sweep would be nicer; revisit alongside (a); (c) no cross-tenant rate limit — revisit post-100-businesses with per-business caps; (d) tone is entirely prompted, not fine-tuned — post-launch, collect owner-edited-vs-sent pairs as training data if tone improvement becomes valuable.
- 2026-04-23: **Phase 4 PR 4.2 Messages Stage 1.** Schema migration (additive) adds `ai_queries` table with owner-scoped RLS, `whatsapp_conversations.last_read_at`, `whatsapp_messages.source` (loose text enum: `bot | manual | automation`). WhatsApp webhook now stamps `source: 'bot'` on outbound auto-reply inserts; dashboard-originated sends stamp `'manual'` and `status: 'sent' | 'failed'` so the UI can render a red-tick for Meta API failures. `sendWhatsAppMessage` changed signature: `Promise<void> → Promise<SendResult>`. 3-pane inbox polls via `router.refresh()` every 5 s, paused on `document.visibilityState !== 'visible'`. Sidebar unread counter wired via `countUnreadMessages()` in `app/(dashboard)/layout.tsx`. **Stage 2** (suggest-reply via OpenAI `gpt-4o-mini` + intent chips + 60 s in-memory cache) follows as a separate PR.
  - **`displayCustomerName` is now the canonical name resolver** for the whole dashboard: `full_name || name || formatPhoneForDisplay(phone) || 'Guest'`. All Messages callers use this; any future customer-adjacent surface (bookings, calendar, customers) should too. Phone fallback matters because a conversation can exist before any `customers` row does.
  - **Flagged for polish (non-blocking):** (a) `meta_message_id` type drift — `lib/database.types.ts` shows `whatsapp_messages.twilio_sid` but the webhook writes `meta_message_id`; re-run `supabase gen types typescript` and fix the column drift; (b) 24-hour customer-initiated session window not enforced on manual sends — Meta rejects outbound-outside-window, we catch the failure, next polish PR disables the composer proactively; (c) Customers `?open=<id>` deep-link and Calendar `?bookingId=<id>` deep-link don't exist yet — Messages context pane's "Open customer" / "Open in Calendar" fall back to `?q=<name-or-phone>` and date-anchored week respectively; (d) Full-text search on the inbox is linear in-memory filter — fine under 500 conversations per business, revisit post-100-businesses for `pg_trgm` + indexed FTS.

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
- **OpenAI (GPT-4o)** for internal AI — WhatsApp bot brain (`lib/whatsapp-brain.ts`), reply suggestions, and insight generation. Env var: `OPENAI_API_KEY`. The consumer `/api/assistant` route is still on Anthropic as of 2026-04-22 and is flagged for migration. The MCP-era USP ("queryable on ChatGPT / Claude / Gemini") is **independent of the internal provider** — that's about being bookable FROM external AI assistants via the MCP server at `mcp.openbook.ie`, not about what model runs inside OpenBook.
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
    - AI-suggested replies: a Next.js route handler that hits the **OpenAI API (GPT-4o)** with the thread context
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
8. **AI suggestion chips in Messages.** These need a real endpoint. Build `POST /api/ai/suggest-reply` that takes the thread and returns 2–3 suggestions via **OpenAI GPT-4o** (same provider as the WhatsApp brain in `lib/whatsapp-brain.ts`). Cache for 60s per thread to avoid hammering the API.
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

### Public-webhook security requirements (2026-04-23)

Every public HTTP endpoint exposed to third-party providers (Meta/WhatsApp, Stripe, future MCP inbound, anything on the public internet hitting `/api/*`) **must**:

1. **Verify a cryptographic signature on every request.** HMAC-SHA256 (Meta, Stripe) or provider-specified equivalent. Compute against the *raw* request body, not the parsed JSON, and compare with `crypto.timingSafeEqual` (guarded for length mismatch).
2. **Fail closed** — if the signing secret env var is missing, if the signature header is absent, or if the digest doesn't match, respond 403 and log the rejection. Never fall through to the business logic "just in case".
3. **Never route by fallback heuristics.** If the provider-supplied identifier (phone_number_id, account_id, source_id) doesn't resolve to a known row, log and 200 — don't pick "the first live business" or similar. A second onboarded tenant turns that into a cross-tenant data corruption bug the moment it fires.
4. **Return 2xx only after signature verification passes**, so retries from the provider only re-trigger legitimate traffic.

These rules apply retroactively — PRs that touch an existing public webhook must bring it up to spec before merging, even if the original code predated the rule.

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
- **Multi-business ownership — `owners.current_business_id` + workspace switcher.** `requireCurrentBusiness` currently calls `.maybeSingle()` on a `businesses` query filtered by `owner_id` + `is_live=true`. When an owner has **multiple** live businesses (which happens in the OpenHouse AI portfolio-businesses model), `maybeSingle()` throws on multiple-row responses, the thrown error gets swallowed by the helper, and the redirect path lands on `/onboard/flow` — creating an **infinite redirect loop** because `/onboard/flow` bounces back to `/dashboard` when `onboarding_completed=true`. Temp workaround documented in 2026-04-23 dogfooding notes: set all but one of an owner's businesses to `is_live=false` via Studio. Real fix: add `owners.current_business_id uuid` nullable FK (defaults to first live business on first login), migrate `requireCurrentBusiness` to read that column, and add a workspace-switcher dropdown in the Sidebar workspace-header area (same spot the business name + slug render today). Separate PR — touches migrations + the authentication hot path, not polish.
- **`owners`-row auto-creation trigger.** Manual Studio insert documented in `docs/auth-setup.md` §1. Long-term fix is a Postgres trigger on `auth.users` INSERT that auto-creates the matching `owners` row with `onboarding_completed = false` and routes the user through `/onboard/flow`. Deliberately deferred because it interacts with the onboarding wizard's own row creation — needs a considered pass to decide which path owns the write.
- **Flash Sales zero-target publish UX.** `publishFlashSaleDryRunAction` marks a sale `scheduled` when the target audience is empty but materialises zero `flash_sale_notifications` rows. An owner publishing to "All customers" with an empty customer list sees a sale that looks live but has no ledger to inspect. Stage-2 polish: insert a single `flash_sale_notifications` row with `status='blocked' + block_reason='no_target_audience'` so "publish happened, audience was empty" is auditable.
- **Quiet-window heuristic hardcoding.** `loadQuietSuggestions` assumes Sundays closed + 13:00–17:00 as the quiet window. Fine for typical IE service businesses, wrong for e.g. a Sunday-only yoga studio. Post-launch polish: read `business_hours` to derive the actual quiet window for this specific business before ranking.
- **Consumer Booking Flow v2 — architectural, not polish (Phase 5 priority).** The live consumer booking flow (`app/(consumer)/booking/[serviceId]/SlotPicker.tsx` + `POST /api/booking`) is cookie-only guest mode: it creates `customers` rows with `full_name: 'Guest'` and `phone: null`, no `customer_businesses` pivot insert, and collects zero contact info at booking time. This BLOCKS every post-Phase-4 feature that needs to reach a customer: Flash Sales Stage 2 delivery, Marketing broadcasts, SMS/WhatsApp reminders, no-show tracking, and the promo-opt-in checkbox we deliberately dropped from Flash Sales Stage 1. A proper v2 flow needs: (1) name + phone + optional email collection, (2) phone validation + returning-customer lookup by phone, (3) guest→account merge when a returning guest logs in, (4) cancelled-at-checkout state handling, (5) probably SMS/WhatsApp verification for phone ownership, (6) `customer_businesses` pivot insert on first booking with a business, (7) the opt-in checkbox wiring. Not polish — every customer-facing messaging feature we ship from now depends on this.
- **Customer name normalisation** — the `customers` table currently carries both `full_name` and `first_name`/`last_name`, and different code paths read/write each inconsistently. Separate cleanup PR after Phase 4. Canonical suggestion: `full_name` derived server-side from a trigger or application logic; the split columns either go away or become the canonical source of truth, but not both.
- **Multi-staff bookings.** `bookings.staff_id` is a single column — the schema assumes **one booking = one staff member**. If a multi-staff business signs up (combined massage+facial where two therapists attend the same appointment, or relay-style class coaching), the model needs a `booking_staff` pivot table, UI to attach multiple staff to a booking, and revenue-share logic for staff utilisation metrics. Out of scope for this migration; flag as a data-model change when the first multi-staff business asks.
- **Staff authentication / self-login.** In v1, staff are owner-managed entities without their own dashboard access — created, edited, and deactivated by the business owner from the Team page. Staff-facing surfaces (their own calendar, their own customers, their own hours) are a separate project. When that lands, `staff.user_id` (new column) will link to an auth account and the existing hardcoded roles become enforceable.
- **In-app refund issuance.** Phase 4 Finance v1 reads refunds from the Stripe API and displays them in the transactions table + P&L, but **owners issue refunds via Stripe Dashboard** — there's no in-app refund button. A proper in-app flow needs refund-reason tracking (free-text vs enum), customer notification design (email / WhatsApp template), partial-refund UX, and a `bookings.refunded_cents` column (or a `refunds` table) for the bookkeeper CSV. Deferred to a follow-up PR once the shape of the refund UX is decided.
- **Full-text search on `/api/assistant`.** The consumer AI concierge uses a hand-curated synonym map in `app/api/assistant/route.ts` to bridge user-query vocabulary (e.g. "personal trainer") to DB category values (e.g. "Personal Training"). Each new business category needs an entry or novel queries silently miss. **Post-50-businesses**, migrate to Postgres `pg_trgm` (trigram similarity) or full-text search (`tsvector` + `tsquery`) to eliminate the list entirely. Same spirit as the Intelligence benchmark hardcoding — acceptable at current scale, explicit about when to replace.

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
