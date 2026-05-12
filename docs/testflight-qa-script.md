# TestFlight QA Script

Run this on the exact signed TestFlight build intended for App Review. Use a physical iPhone, not a browser preview.

## Setup

- Install the TestFlight build on a clean iPhone.
- Confirm the app points at the production app URL used in `capacitor.config.ts`.
- Prepare a reviewer-safe customer account.
- Prepare one live demo business with at least one free or in-person service.
- Keep App Store Connect, Supabase, Stripe, and Vercel logs open while testing.

## Customer App Pass

1. Cold launch with network on.
2. Cold launch with network off, then back on.
3. Home: confirm the app tiles align, long business names remain legible, and missing logos fall back cleanly.
4. Explore: change city, category, and date filters. Empty Open Spots states should offer a useful next action.
5. Business profile: open a polished business, a weak-image business, and a long-name business.
6. Business profile: confirm hero image, logo, gallery, services, about text, and sticky booking controls do not overlap.
7. Assistant: send a local-services query, confirm the input is not blocked by the bottom nav, then start a booking.
8. Bookings: confirm empty, upcoming, past, detail, and cancellation states.
9. Wallet: confirm empty and populated states if credits/packages exist.
10. Me: sign in, edit profile, open privacy/support links, sign out, sign in again.
11. Account deletion: use a disposable account and confirm deletion completes without a dead end.

## Notification Pass

1. Fresh install: grant notification permission when prompted and confirm the device registers without an error.
2. Foreground: trigger a reviewer-safe booking notification and confirm it does not interrupt the current flow.
3. Background: lock the phone or background the app, send a booking notification, then tap it and confirm OpenBook opens to a useful signed-in state.
4. Permission denied: reinstall or reset notification permission, deny the prompt, and confirm booking still works without a dead end.
5. Sign out and sign in again, then confirm the same device does not create duplicate customer-facing alerts.

## Booking Pass

1. Book the reviewer-safe free or in-person service.
2. Confirm success page copy, customer booking detail, dashboard booking row, and customer email behavior.
3. Cancel the booking from the customer side.
4. Confirm dashboard status updates and the cancelled booking does not appear as upcoming.
5. Start a paid booking with Stripe test credentials only if the review path requires it.
6. Test Stripe cancel/failure behavior; the user should land in a recoverable state.

## Business Dashboard Pass

1. Sign in as the demo business owner.
2. My App: edit app title, city, one-line promise, story, app colour, logo treatment, and hero/gallery assets.
3. Confirm the preview matches the real customer app closely enough to trust.
4. Catalog: create, edit, hide, and re-show a service.
5. Calendar/hours: confirm unavailable times do not appear in booking.
6. Bookings: search, filter, open booking detail, and cancel/update status if supported.
7. Messages: confirm empty state, unread state, selected thread, and refresh behavior.
8. Finance/settings/team: confirm empty states and permission boundaries do not dead-end.

## Stop-Ship Bugs

- OAuth returns to login after provider selection.
- Reviewer cannot complete a booking without paying real money.
- Any customer-uploaded image breaks the storefront layout.
- Long business names overlap controls or become illegible.
- The bottom nav blocks chat or booking controls.
- Account deletion fails or leaves the user signed in.
- App Store privacy answers differ from `PrivacyInfo.xcprivacy`.
- Push notification permission, registration, or tapped-notification recovery breaks the booking path.
- Production points at a Vercel preview URL.

## Evidence To Keep

- TestFlight build number.
- Device model and iOS version.
- Screenshots for App Store Connect from the TestFlight build.
- Demo business slug and reviewer account email.
- Any failed steps, with timestamp and logs.
