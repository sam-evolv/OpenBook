# Capacitor iOS

Wraps the Next.js app in a native iOS binary for App Store submission.

## Layout

- `capacitor.config.ts` — Capacitor config (appId `ie.openbook.app`, appName `OpenBook`, webDir `ios-web`).
- `ios-web/` — bundled offline fallback copied into the native app. The live product still loads from the hosted OpenBook app.
- `ios/` — generated native Xcode project. Open `ios/App/App.xcodeproj` in Xcode. This repo uses Capacitor's Swift Package Manager integration, so there is no top-level CocoaPods `App.xcworkspace`.
- `ios/App/App/PrivacyInfo.xcprivacy` — starter Apple privacy manifest. Keep this aligned with App Store Connect privacy answers before submission.

## Build

```
npm run build:ios
```

Runs `next build` then `npx cap sync ios`. Open the Xcode project to archive and submit.

For the full launch gate, run:

```
npm run verify:launch
npm run build:ios
```

## Native Preflight

If the command line tools are selected instead of full Xcode, point the command at the full Xcode app:

```bash
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
  xcodebuild -project ios/App/App.xcodeproj \
  -scheme App \
  -configuration Release \
  -destination generic/platform=iOS \
  CODE_SIGNING_ALLOWED=NO \
  build
```

To prove the archive structure without requiring Apple signing credentials:

```bash
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
  xcodebuild -project ios/App/App.xcodeproj \
  -scheme App \
  -configuration Release \
  -destination generic/platform=iOS \
  -archivePath /private/tmp/OpenBook-App.xcarchive \
  CODE_SIGNING_ALLOWED=NO \
  archive
```

These commands verify native compilation and archive packaging only. The App Store upload still needs a signed archive from Xcode with the correct Apple Developer team and provisioning profile.

## Server URL

The iOS shell intentionally loads the hosted OpenBook app through `server.url`.

By default this points at `https://app.openbook.ie`. Set `NEXT_PUBLIC_APP_URL` when you need a different release target, for example a staging domain. This is the supported release path because OpenBook depends on dynamic Next.js routes, auth, server actions, payments, and Supabase-backed data. Static export is not a dependable build target for the current product.

The `ios-web/` bundle is a minimal fallback screen for offline or unreachable states. It is not the production app experience.

## Device Scope

The launch binary is intentionally iPhone-first:

- Xcode `TARGETED_DEVICE_FAMILY` is `1`.
- iPhone orientations are portrait-only.
- iPad orientations remain present in `Info.plist` as a harmless plist key, but the app is not submitted as a universal iPad app.

Do not switch back to universal (`1,2`) until the iPad dashboard, customer app, onboarding, screenshots, and TestFlight pass are deliberately designed and QAed.

## Info.plist Policy

`ios/App/App/Info.plist` intentionally omits the following keys. Add them only when a feature actually needs the permission, otherwise App Review will flag unused entitlements.

- `NSCameraUsageDescription` — add only if the app captures photos/video.
- `NSLocationWhenInUseUsageDescription` — not used; do not add.
- `ITSAppUsesNonExemptEncryption` is `false` because the current app only uses standard HTTPS/TLS encryption.

`UIBackgroundModes` is set to `remote-notification` so APNs can wake the
app silently when a push includes `content-available: 1`. Required by
PR 4a (push notifications).

## Push Notifications (PR 4a)

The app uses `@capacitor/push-notifications` to acquire APNs tokens and
relays them to the server via `POST /api/notifications/register-device`.
The server uses `firebase-admin` to send through FCM, which forwards to
APNs.

### Required local files (NOT committed)

- `ios/App/App/GoogleService-Info.plist` — download from Firebase
  Console → Project Settings → General → Your apps → iOS app →
  `GoogleService-Info.plist`. Drag the file into the `App` group in
  Xcode (check "Copy items if needed" and add to the `App` target) so
  Xcode adds it to the build's Copy Bundle Resources phase. The file
  is git-ignored.

### Entitlements

`ios/App/App/App.entitlements` declares `aps-environment = development`.
For TestFlight and App Store builds, change to `production` (or use a
separate `App.Release.entitlements` and wire it via the Release build
configuration's `CODE_SIGN_ENTITLEMENTS` setting). The current single-
entitlement-file setup is sufficient for first-device verification;
revisit before the first TestFlight upload.

The Push Notifications capability must also be enabled on the App ID
in the Apple Developer Portal (Identifiers → `ie.openbook.app` →
Capabilities → Push Notifications).

### Firebase Cloud Messaging (server-side)

The server needs `FIREBASE_SERVICE_ACCOUNT` (the entire service-account
JSON as a single-line string) in Vercel and `.env.local`. Generate via
Firebase Console → Project Settings → Service accounts → Generate new
private key. See `.env.local.example` for the required variable names.

### APNs Auth Key in Firebase

The APNs Auth Key (`.p8`) must be uploaded to Firebase Console →
Project Settings → Cloud Messaging → Apple app configuration →
APNs Authentication Key, along with the Key ID and Apple Team ID
(`FZXRCW547P`). Without this, FCM cannot deliver to APNs.

## Notes

Before archiving for App Store review:

- Confirm the production web app is deployed at the same URL used by the native shell.
- Confirm Google and Apple sign-in redirects work on the production domain and in the iOS app.
- Confirm Stripe/payment flows use production-safe keys and have a reviewer-friendly test path.
- Resolve any local Xcode provisioning profile warnings before the signed archive if Xcode reports malformed or missing profile metadata.
- Reconcile `PrivacyInfo.xcprivacy` with App Store Connect privacy labels, the privacy policy, and the live data collection behavior.
- Run a real-device TestFlight pass across onboarding, booking, profile editing, business dashboard, and payment cancellation/success states.
- Follow `docs/app-store-submission-runbook.md` for the final drill.
