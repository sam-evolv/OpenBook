# Production Launch Preflight

These checks sit between "the code builds" and "we should submit to Apple."

## Repo Gates

```bash
npm run verify:launch
npm run build:ios
```

## Environment Gate

Run this against the environment that will power the signed iOS build:

```bash
npm run verify:launch-env
```

Use the network probe when you want to verify public URLs are reachable:

```bash
node scripts/verify-launch-env.mjs --strict --production --network
```

The script checks Supabase, Stripe, OpenAI, MCP token signing, cron, app URL, App Review public links, and partial WhatsApp configuration.

## Demo Business Gate

Set `DEMO_BUSINESS_SLUG` or pass a slug directly:

```bash
npm run verify:demo -- --slug=evolv-performance
```

The script checks that App Review has a live business with a logo/hero/gallery baseline, active services, and ideally a free reviewer-safe booking path.

## Apple-Only Gate

These still happen outside the repo:

- Signed Xcode archive with the correct Apple Developer team.
- Upload to App Store Connect.
- TestFlight install on a physical iPhone.
- Screenshots captured from the TestFlight build.
- App Privacy answers reconciled against `docs/app-privacy-labels.md` and `ios/App/App/PrivacyInfo.xcprivacy`.
