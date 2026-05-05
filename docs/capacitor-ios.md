# Capacitor iOS

Wraps the Next.js app in a native iOS binary for App Store submission.

## Layout

- `capacitor.config.ts` — Capacitor config (appId `ie.openbook.app`, appName `OpenBook`, webDir `out`).
- `ios/` — generated native Xcode project. Open `ios/App/App.xcworkspace` in Xcode.
- `next.config.js` — gates `output: 'export'` behind `CAPACITOR_BUILD=true` so Vercel deploys are unaffected.

## Build

```
npm run build:ios
```

Runs `CAPACITOR_BUILD=true next build` then `npx cap sync ios`. Open the workspace in Xcode to archive and submit.

## Server URL

`capacitor.config.ts` sets `server.url = https://app.openbook.ie` outside production (`NODE_ENV !== 'production'`) for live reload during development. Production builds drop `server.url` and load the bundled `out/` assets.

## Info.plist policy

`ios/App/App/Info.plist` intentionally omits the following keys. Add them only when a feature actually needs the permission, otherwise App Review will flag unused entitlements.

- `NSCameraUsageDescription` — add only if the app captures photos/video.
- `NSLocationWhenInUseUsageDescription` — not used; do not add.
- `UIBackgroundModes` — none required.

## Notes

The current app uses `force-dynamic` API routes and Server Actions which are incompatible with `output: 'export'`. The Capacitor build pipeline is wired up per spec, but `next build` under `CAPACITOR_BUILD=true` will surface those incompatibilities until the consumer-facing pages are refactored to be statically renderable (or hosted via `server.url`). The native `ios/` project itself is ready to open in Xcode regardless.
