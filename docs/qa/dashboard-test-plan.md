# Dashboard QA Test Plan

The reusable, surface-by-surface checklist for the OpenBook dashboard at
`dash.openbook.ie`. Run this before every App Store submission and
before any major release. It complements `docs/testflight-qa-script.md`
(consumer app) — that one tests the iOS shell; this one tests the
owner-facing web dashboard.

## How to run

- This is a **manual checklist** — work through it top to bottom on a
  clean session.
- Use a real demo business with a handful of seeded bookings,
  customers, and services. The empty-state cases at the bottom of this
  doc cover what owners see on day one.
- For parts that benefit from automation (visual rendering of every
  sidebar entry, link verification, screen-recording the Website tab),
  run Claude in Chrome alongside this list — it can drive the browser
  while you verify state in Supabase.
- Tick `[x]` when verified. File any failing item as a follow-up issue
  before submission; do not mark this list "complete" with unchecked
  boxes.
- Re-run the entire pass on each of: desktop (≥1280px), tablet
  (≥768px), and mobile (390px iPhone viewport). Owners check the
  dashboard from phones too.

## Setup

- [ ] Logged out, hit `https://dash.openbook.ie` — redirects to the
      welcome / login screen.
- [ ] No console errors on first paint.
- [ ] Theme cookie default is dark; explicit light/dark toggle in the
      sidebar bottom-left changes immediately and persists across a
      hard refresh.

## 1. Authentication — magic-link login

- [ ] From the welcome screen, click "Continue with email" and submit
      a real address.
- [ ] "Check your inbox" confirmation renders with the entered email
      echoed back.
- [ ] Magic-link email arrives within 30 seconds.
- [ ] Tapping the link in the email lands you on the dashboard
      overview signed in (not the consumer side).
- [ ] After sign-in, the URL is `dash.openbook.ie/dashboard/overview`
      (or wherever the post-auth redirect points).
- [ ] Refreshing the page keeps you signed in.
- [ ] Sign out (sidebar avatar / settings) returns you to the welcome
      screen and clears the session cookie.
- [ ] Cross-subdomain: after Prompt 1's PR merges, signing in on
      `dash.openbook.ie` should also sign you in on
      `openbook.ie` (consumer side). Verify by opening both in the
      same browser session.

## 2. Sidebar navigation — every entry loads

Click each of the 14 sidebar entries in order, top to bottom. Every
page must:

- Render without a thrown error / blank screen.
- Show the correct active state (gold left-rail + gold icon).
- Match its sidebar label in the `<TopBar>` title.

- [ ] **Overview** — `/dashboard/overview`
- [ ] **My App** — `/dashboard/my-app`
- [ ] **Calendar** — `/dashboard/calendar`
- [ ] **Bookings** — `/dashboard/bookings`
- [ ] **Customers** — `/dashboard/customers`
- [ ] **Catalog** — `/dashboard/catalog`
- [ ] **Messages** — `/dashboard/messages`
- [ ] **Flash Sales** — `/dashboard/flash-sales`
- [ ] **Intelligence** — `/dashboard/intelligence`
- [ ] **Finance** — `/dashboard/finance`
- [ ] **Team** — `/dashboard/team`
- [ ] **Hours** — `/dashboard/hours`
- [ ] **Website** — `/dashboard/website`
- [ ] **Settings** — `/dashboard/settings` (Settings sub-route: Billing
      at `/dashboard/settings/billing`)

## 3. Overview

- [ ] Greeting is sentence case ("Good afternoon, Sam") — not title
      case, not all caps.
- [ ] Greeting respects the local time (morning/afternoon/evening/up
      late).
- [ ] **Stat cards never show a red "-100%"**. With a brand-new
      business that has no bookings today, the Bookings Today card
      must read "No bookings yet today" in neutral grey, not "-100% vs
      yesterday" in red. Same rule for Revenue Today, This Week, and
      Active Customers cards.
- [ ] When current has real activity, the delta renders normally
      (green for positive, red for negative — but only when the
      delta isn't 0 → previous).
- [ ] Sparklines render for each card with real signal.
- [ ] Goal card: if no goal is set, "Set a monthly revenue goal" CTA;
      after setting, pace indicator (Ahead / On pace / Behind) updates.
- [ ] Flash sales shortcut card links to `/dashboard/flash-sales`.
- [ ] Intelligence grid renders top insights; empty state if none.
- [ ] Waitlist card shows pending waitlist entries.
- [ ] Copy-link button on top-right copies `<slug>.openbook.ie` to the
      clipboard ("Copied" feedback for ~1.8s).

## 4. Calendar

- [ ] Existing bookings appear on their correct date and time slot.
- [ ] Time-zone is Europe/Dublin (or business locale).
- [ ] Click a booking → detail drawer opens with customer, service,
      price, status.
- [ ] Cancelled bookings render differently from confirmed.

## 5. Bookings

- [ ] List renders with status, customer, service, time, price.
- [ ] Filter chips (upcoming / past / all) filter correctly.
- [ ] Sort order is sensible (upcoming ascending, past descending).
- [ ] Clicking a row opens the BookingDetailDrawer with the right data.
- [ ] No console errors when toggling between filters.

## 6. Customers

- [ ] List renders with name, first/last booking, total spent.
- [ ] Search by name works.
- [ ] Click a customer → detail view with booking history.
- [ ] No PII leaks (no other businesses' customers visible — verify by
      switching businesses if you have two demo accounts).

## 7. Catalog (services + packages)

- [ ] Existing services appear with name, duration, price, active state.
- [ ] Click "Add service" → drawer opens with all fields.
- [ ] Create a new service → it appears in the list after save.
- [ ] Edit an existing service → changes persist after save.
- [ ] Hide / show toggle works.
- [ ] If packages are supported, they appear in the same list or a
      sibling section.

## 8. Messages

- [ ] Inbox renders WhatsApp conversations sorted by most-recent.
- [ ] Sidebar badge count matches the number of conversations whose
      `last_message_at > last_read_at`.
- [ ] Click a conversation → message thread loads with full history.
- [ ] Replying sends through to WhatsApp (verify with the test number
      if available).
- [ ] AI tab (if shipped) toggles in.

## 9. Flash Sales

- [ ] Existing sales render with title, % off, audience.
- [ ] Quiet-window suggestions card renders.
- [ ] "Create flash sale" drawer opens, saves, and the new sale
      appears in the list.

## 10. Intelligence

- [ ] Booking-source donut renders.
- [ ] Other intelligence cards render without console errors.

## 11. Finance

- [ ] Headline metrics: Next payout, Available balance, Gross this
      month, Stripe fees. Each shows "Stripe not connected" if Stripe
      isn't connected; numeric values once connected.
- [ ] "Connect Stripe" CTA appears when not connected.
- [ ] Once connected, payouts table + transactions table populate.
- [ ] Monthly P&L renders.
- [ ] VAT tracker shows the right rate.

## 12. Team

- [ ] Staff list renders with name, role, colour swatch.
- [ ] Add staff drawer opens, saves, appears in list.
- [ ] Roles & permissions section renders.

## 13. Hours

- [ ] Day-of-week rows render Mon→Sun (or Sun→Sat depending on locale).
- [ ] Toggling "Closed" greys out the time inputs.
- [ ] Editing a time range and clicking Save persists across a hard
      refresh.
- [ ] Closed days reflect on the marketing site (`<slug>.openbook.ie`).

## 14. Website tab

This is the most-recent feature surface (PR #177). Test every field
end-to-end.

### Publish toggle

- [ ] On a never-published business, the toggle is off and the
      celebratory banner is hidden.
- [ ] Flip on → click Save → "Your website is live at
      `<slug>.openbook.ie`" banner appears with a copy-link button.
- [ ] Copy-link button copies the URL to clipboard, shows "Copied" for
      ~1.5s, then reverts.
- [ ] Hit `<slug>.openbook.ie` in a fresh tab → site renders.
- [ ] Toggle off → Save → `<slug>.openbook.ie` returns the 404 page.

### Hero photo

- [ ] Drop a JPG over the dotted upload area → uploads, preview
      renders.
- [ ] Drop a file under 1200px wide → rejected before upload starts
      with "Image must be at least 1200px wide."
- [ ] Drop a file over 5MB → rejected with "File too large. Max 5MB."
- [ ] Drop a non-image file → rejected.
- [ ] On error, the inline "Try again" button reopens the file picker.
- [ ] Replace button reopens the file picker.
- [ ] Remove button (X in the corner) removes the image, immediately
      saves the deletion, and the dotted upload area reappears.
- [ ] Hard refresh → uploaded hero persists.

### Headline

- [ ] Type up to 80 chars; counter ticks down, becomes red at over-80
      (input is also hard-capped at 80).
- [ ] Click Save → value persists across hard refresh.
- [ ] Hero on `<slug>.openbook.ie` reflects the headline (falls back
      to business name if empty).

### Tagline

- [ ] Type up to 140 chars; counter behaves correctly.
- [ ] Save → persists across hard refresh.
- [ ] Tagline appears on `<slug>.openbook.ie` below the headline.

### About

- [ ] Type a few markdown paragraphs (**bold**, _italic_, lists,
      links).
- [ ] Click Preview → markdown renders, the textarea is replaced with
      the rendered output.
- [ ] Click Edit → returns to the textarea, with content intact.
- [ ] Save → persists across hard refresh.
- [ ] About content appears on `<slug>.openbook.ie/#about` rendered
      with the same markdown styling.

### Gallery

- [ ] Add up to 8 photos via the + tile (multi-select works).
- [ ] Each photo gets cropped to 1:1, processed, and uploaded.
- [ ] On the 9th photo, no more slot — at-limit text "Up to 8 photos"
      appears.
- [ ] Drag a photo to a new position → order updates client-side.
- [ ] Click Save → reorder persists across hard refresh.
- [ ] Remove a photo via the X → it disappears.
- [ ] Save after removing → the photo is gone after a hard refresh.
- [ ] Photos appear in the same order on `<slug>.openbook.ie`.

### Testimonials

- [ ] Add testimonial → blank row appears.
- [ ] Add up to 6; the "Add testimonial" button disappears at 6.
- [ ] Fill quote + author (role optional); empty quote or author
      rows are dropped server-side on Save.
- [ ] Save → values persist across hard refresh.
- [ ] Each testimonial appears on `<slug>.openbook.ie` with quote,
      author, optional role.

### Preview button

- [ ] "Preview website" link opens `<slug>.openbook.ie?preview=true`
      in a new tab.
- [ ] When website is **unpublished**, the `?preview=true` route
      renders for the signed-in business owner (not 404).
- [ ] When website is **unpublished**, the route 404s for a different
      user / signed-out browser.
- [ ] When the site is published, no preview banner shows.
- [ ] When previewing an unpublished site, a gold "Preview · not yet
      published" pill appears at the top.

### Save behaviour

- [ ] Editing any field flips the "Save changes" button to enabled.
- [ ] Saving without changes is impossible (button disabled).
- [ ] After save, the button reads "Saved" with a check icon for a
      moment before reverting.
- [ ] Save error (e.g. network drop) → red error message at the
      bottom of the form.
- [ ] Reset button (only visible when dirty) restores the form to
      its last-saved values.

## 15. Settings

- [ ] Profile section (business name, tagline, founder, phone,
      address) renders and saves.
- [ ] Primary colour swatch picker updates correctly; preview updates
      on save.
- [ ] Logo uploader works.
- [ ] Socials block — Instagram, Facebook, TikTok handles save.
- [ ] Automations switches (auto reviews, waitlist fill, reminders,
      win-back offers, smart rescheduling, low-stock alerts,
      membership renewals, class-fill) toggle and persist.

## 16. Billing — Settings → Billing

- [ ] `/dashboard/settings/billing` loads without error.
- [ ] Free plan: Upgrade button + plan comparison render.
- [ ] Pro / Complete plan: current plan + billing portal link render.

## 17. Stripe Connect (Finance + onboard flow)

- [ ] Not-connected state: clear CTA to connect.
- [ ] Click Connect → redirects to Stripe Express onboarding.
- [ ] After completing Stripe onboarding, returning to OpenBook shows
      a connected state.
- [ ] Disconnect (if supported) returns to the not-connected state.

## 18. Empty states (run with a brand-new business that has nothing)

- [ ] Overview metrics show the "Your first booking is where these
      charts start" empty card.
- [ ] Calendar shows "No bookings yet" or similar.
- [ ] Bookings list is empty without rendering broken rows.
- [ ] Customers list is empty.
- [ ] Catalog shows the "Add your first service" CTA.
- [ ] Messages inbox is empty.
- [ ] Flash sales shows empty + quiet-window suggestions.
- [ ] Intelligence empty state OK.
- [ ] Finance shows "Connect Stripe" CTA.
- [ ] Team shows "Add your first staff member".
- [ ] Hours shows defaults.
- [ ] Website tab shows the publish toggle off + empty form fields.
- [ ] No "OpenBook AI" strings anywhere in product UI — only
      "OpenBook" (legal/footer contexts may say "OpenHouse AI Limited
      trading as OpenBook").

## 19. Mobile viewport (390px iPhone)

Open Chrome DevTools → iPhone 12/13 (390px). For every entry below:

- [ ] No horizontal scrolling on any page.
- [ ] Sidebar collapses into the mobile horizontal pill nav at the top.
- [ ] All form fields are reachable and tappable.
- [ ] Drawers open full-height and are dismissable.
- [ ] The Website tab markdown editor doesn't overflow the page width.
- [ ] The Website tab gallery shows 2–3 photos per row, not one
      cramped column.
- [ ] Save / Reset buttons in TopBar wrap or stack rather than
      overflowing.

## 20. Cross-subdomain auth (after Prompt 1's PR merges)

- [ ] Sign in on `dash.openbook.ie`.
- [ ] In the same browser session, open `openbook.ie` — you should be
      recognised as signed in.
- [ ] Sign out from either → both sessions are cleared.
- [ ] The cookie should be set with `Domain=.openbook.ie` (verify in
      DevTools → Application → Cookies).

## 21. Theme

- [ ] Dark mode is default.
- [ ] Toggle to light → page restyles instantly.
- [ ] Hard refresh in light mode → still light.
- [ ] Onboard / welcome screen stays dark regardless of theme cookie
      (this is intentional — marketing-style hero).

## 22. Console / network hygiene

- [ ] No 4xx or 5xx on initial page loads of any sidebar entry.
- [ ] No unhandled promise rejections in the console.
- [ ] No CORS errors.
- [ ] No mixed-content warnings.
