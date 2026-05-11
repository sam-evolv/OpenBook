## seed-open-spots.ts

Seeds realistic flash sales for the Open Spots consumer surface.
Idempotent — safe to re-run; previous seeds are cleared before
inserting fresh.

```bash
# Preview what would be seeded (no writes)
npx tsx scripts/seed-open-spots.ts --dry

# Seed (clears previous seeded rows first)
npx tsx scripts/seed-open-spots.ts

# Clear all seeded flash sales without inserting new ones
npx tsx scripts/seed-open-spots.ts --clear
```

Each run produces ~8 flash sales spanning:
- "Just opened" tier (cancellation_fill source, within 4h)
- "Limited" tier (planned source, within 24h, includes group capacity at
  Saltwater Sauna and "Last spot" at Yoga Flow)
- No-badge tier (planned source, 24h+ ahead)

Seeded rows are tagged in their `message` column with `seed:open-spots-v1`
for easy cleanup.

## verify-launch-env.mjs

Checks production launch configuration before App Store submission.

```bash
npm run verify:launch-env
node scripts/verify-launch-env.mjs --strict --production --network
```

## verify-demo-readiness.mjs

Checks the App Review demo business has a live storefront and a bookable service.

```bash
npm run verify:demo -- --slug=evolv-performance
```
