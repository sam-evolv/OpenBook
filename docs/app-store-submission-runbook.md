# App Store Submission Runbook

Use this as the final release drill before submitting OpenBook to App Review.

## 1. Code Gates

Run these from the repo root before opening Xcode:

```bash
npm run verify:launch
npm run build:ios
```

Expected result:

- Tests pass.
- Production Next build passes.
- `npm audit --audit-level=moderate` reports `0 vulnerabilities`.
- iOS plist/privacy verification passes.
- Capacitor sync finishes without errors.

## 2. Xcode Archive

Open `ios/App/App.xcodeproj`.

This Capacitor project uses Swift Package Manager rather than a top-level CocoaPods workspace. If `xcode-select` points at Command Line Tools, use full Xcode in the terminal with `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer` or switch the active developer directory before archiving.

Release settings:

- Scheme: `App`
- Destination: `Any iOS Device`
- Bundle ID: `ie.openbook.app`
- Version: `1.0`
- Build: increment for each upload
- Target device family: iPhone
- Signing: Apple Developer team for OpenBook

Archive flow:

1. Product > Archive.
2. Validate App.
3. Distribute App > App Store Connect > Upload.
4. Confirm there are no privacy, signing, entitlement, or ITMS warnings.

Optional native CLI preflight before signed archive:

```bash
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
  xcodebuild -project ios/App/App.xcodeproj \
  -scheme App \
  -configuration Release \
  -destination generic/platform=iOS \
  CODE_SIGNING_ALLOWED=NO \
  build

DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
  xcodebuild -project ios/App/App.xcodeproj \
  -scheme App \
  -configuration Release \
  -destination generic/platform=iOS \
  -archivePath /private/tmp/OpenBook-App.xcarchive \
  CODE_SIGNING_ALLOWED=NO \
  archive
```

These unsigned commands should succeed before upload, but they do not replace the signed Xcode archive required for App Store Connect.

## 3. TestFlight Pass

Install the TestFlight build on a physical iPhone and run:

- Cold launch with good network.
- Cold launch with no network, confirming the offline fallback is intentional.
- Home screen, Explore, Assistant, Bookings, Wallet, and Me.
- Business profile with long name, weak/missing logo, weak/missing hero image, sparse gallery, and no services.
- Business profile with excellent photos and full content.
- Booking success path for a free or in-person service.
- Booking cancellation from customer booking detail.
- Google sign-in inside the iOS shell.
- Apple sign-in inside the iOS shell.
- Sign-out and sign-in again.
- Account deletion.

## 4. App Review Demo Path

Provide App Review with:

- A reviewer account that can sign in without extra support.
- A live demo business with at least one free or in-person service.
- Instructions to book, cancel, edit profile details, and delete the account.
- A note that OpenBook is a phone-first app giving local businesses their own app-like storefront inside OpenBook.

Do not rely on a paid Stripe card flow as the only App Review path.

## 5. Required App Store Connect Answers

Before submission, reconcile:

- App Privacy answers with `ios/App/App/PrivacyInfo.xcprivacy`.
- Support URL.
- Privacy Policy URL.
- Terms URL.
- App category.
- Review notes.
- Screenshots taken from the TestFlight build, not from a browser preview.

## 6. Stop-Ship Conditions

Do not submit if any of these are true:

- OAuth bounces back to login in the iOS shell.
- The app only works on Vercel preview but not `app.openbook.ie`.
- The reviewer cannot complete a booking without making a real payment.
- Account deletion fails.
- Long business names overlap or hide booking controls.
- A missing/poor business image breaks the profile layout.
- App Store Connect privacy labels differ from the privacy manifest.
