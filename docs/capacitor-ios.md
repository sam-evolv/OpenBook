# Capacitor iOS

Wraps the Next.js app in a native iOS binary for App Store submission.

## Layout

- `capacitor.config.ts` — Capacitor config (appId `ie.openbook.app`, appName `OpenBook`, webDir `ios-web`).
- `ios-web/` — bundled offline fallback copied into the native app. The live product still loads from the hosted OpenBook app.
- `ios/` — generated native Xcode project. Open `ios/App/App.xcworkspace` in Xcode.
- `ios/App/App/PrivacyInfo.xcprivacy` — starter Apple privacy manifest. Keep this aligned with App Store Connect privacy answers before submission.

## Build

```
npm run build:ios
```

Runs `next build` then `npx cap sync ios`. Open the workspace in Xcode to archive and submit.

## Server URL

The iOS shell intentionally loads the hosted OpenBook app through `server.url`.

By default this points at `https://app.openbook.ie`. Set `NEXT_PUBLIC_APP_URL` when you need a different release target, for example a staging domain. This is the supported release path because OpenBook depends on dynamic Next.js routes, auth, server actions, payments, and Supabase-backed data. Static export is not a dependable build target for the current product.

The `ios-web/` bundle is a minimal fallback screen for offline or unreachable states. It is not the production app experience.

## Info.plist policy

`ios/App/App/Info.plist` intentionally omits the following keys. Add them only when a feature actually needs the permission, otherwise App Review will flag unused entitlements.

- `NSCameraUsageDescription` — add only if the app captures photos/video.
- `NSLocationWhenInUseUsageDescription` — not used; do not add.
- `UIBackgroundModes` — none required.

## Notes

Before archiving for App Store review:

- Confirm the production web app is deployed at the same URL used by the native shell.
- Confirm Google and Apple sign-in redirects work on the production domain and in the iOS app.
- Confirm Stripe/payment flows use production-safe keys and have a reviewer-friendly test path.
- Reconcile `PrivacyInfo.xcprivacy` with App Store Connect privacy labels, the privacy policy, and the live data collection behavior.
- Run a real-device TestFlight pass across onboarding, booking, profile editing, business dashboard, and payment cancellation/success states.
