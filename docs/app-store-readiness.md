# OpenBook App Store Readiness

This is the working launch checklist for getting OpenBook from preview-ready to App Store-ready.

## Current Status

OpenBook now has a working Capacitor iOS build path. The native shell loads the hosted production app and includes a bundled offline fallback, which fits the current dynamic Next.js architecture.

## Gates For 100/100

### 1. Build And Native Packaging

- `npm run build` must pass.
- `npm run build:ios` must pass.
- `ios/App/App/Info.plist` must lint successfully.
- `ios/App/App/PrivacyInfo.xcprivacy` must lint successfully.
- Xcode archive must complete without warnings that affect App Review.
- TestFlight build must install on a physical iPhone.

### 2. Auth

- Google sign-in must complete on the production domain.
- Apple sign-in must complete on the production domain.
- Google sign-in must complete inside the Capacitor iOS shell.
- Apple sign-in must complete inside the Capacitor iOS shell.
- `/login` must never dead-end users; it should route into the supported onboarding/sign-in entry.
- Sign-out must clear the session on both `app.openbook.ie` and `dash.openbook.ie`.

### 3. Booking And Payments

- Customer booking flow must complete from business profile to confirmation.
- Stripe checkout must support success, cancel, and failure paths.
- App Review must have a reviewer-safe route to test booking/payment behavior.
- Booking confirmation email must send to the customer.
- Business notification email must send to the business.
- Booking cancellation must work from the customer booking detail page.

### 4. Privacy And Compliance

- App Store Connect privacy labels must match actual collection and use.
- `PrivacyInfo.xcprivacy` must match App Store Connect privacy labels.
- Privacy policy and terms links must be live.
- Account deletion must be available and tested.
- Data collected through business uploads, customer bookings, AI assistant messages, payment metadata, and support links must be reflected in privacy answers.

### 5. Security

- `npm audit --audit-level=moderate` should pass, or the remaining advisories need a documented release risk decision.
- Production responses should include launch-safe security headers.
- Supabase service-role access must stay server-only.
- Stripe webhook secrets and production keys must never be exposed to the client.
- OAuth redirect allowlists must only include trusted production and approved preview URLs.

### 6. Product Quality

- Home, Explore, Assistant, Bookings, Wallet, Me, business profile, and dashboard flows must be tested on mobile widths.
- Business profile pages must stay legible with long names, weak images, missing logos, and sparse content.
- Dashboard app preview must match the real customer-facing app closely enough that a business can trust it.
- Empty, loading, error, and offline states must feel intentional.
- The native app must feel like OpenBook, not a thin broken web wrapper.

## Known Remaining Blockers

- Dependency audit currently reports Next/PostCSS advisories. The automatic npm fix requires a breaking Next upgrade, so this should be handled as a dedicated migration and regression pass.
- The privacy manifest is a starter manifest. It must be reconciled against the final App Store Connect answers before submission.
- The current iOS shell depends on the hosted app URL. Production uptime and network/offline behavior must be reviewed before App Review.
- Xcode archive and TestFlight validation still need to happen outside the web build.

