# OpenBook v5a — Netlify Kill + 15-Minute Onboarding Flow

This is the biggest architectural shift in the project so far. It:

1. **Kills Netlify entirely** — standardises on Vercel with proper domain routing
2. **Adds host-based middleware** so one repo serves both `app.openbook.ie` (consumer) and `dash.openbook.ie` (business dashboard)
3. **Ships the world-class 8-step onboarding flow** with live phone-frame preview
4. **Wires Supabase Auth** (Google + Apple OAuth + email magic link)
5. **Wires Stripe Connect** for optional payment onboarding
6. **Uses the v4 logo pipeline** — the drag-drop inside Step 3 calls the existing `/api/upload-logo`

## New files

```
middleware.ts                                                    NEW  (host routing)
vercel.json                                                      NEW  (Vercel config)

lib/supabase-server.ts                                           NEW  (SSR auth)
lib/supabase-browser.ts                                          NEW  (browser auth)

app/auth/callback/route.ts                                       NEW  (OAuth callback)
app/api/auth/signout/route.ts                                    NEW

app/(onboarding)/onboard/page.tsx                                NEW  (welcome / sign-in)
app/(onboarding)/onboard/WelcomeScreen.tsx                       NEW
app/(onboarding)/onboard/flow/page.tsx                           NEW  (flow root)
app/(onboarding)/onboard/flow/OnboardingFlow.tsx                 NEW
app/(onboarding)/onboard/flow/LivePreview.tsx                    NEW  (phone frame)
app/(onboarding)/onboard/flow/steps/shared.tsx                   NEW  (primitives)
app/(onboarding)/onboard/flow/steps/Step1Basics.tsx              NEW
app/(onboarding)/onboard/flow/steps/Step2Colours.tsx             NEW
app/(onboarding)/onboard/flow/steps/Step3Logo.tsx                NEW
app/(onboarding)/onboard/flow/steps/Step4Story.tsx               NEW
app/(onboarding)/onboard/flow/steps/Step5Services.tsx            NEW
app/(onboarding)/onboard/flow/steps/Step6Hours.tsx               NEW
app/(onboarding)/onboard/flow/steps/Step7Payments.tsx            NEW
app/(onboarding)/onboard/flow/steps/Step8Launch.tsx              NEW

app/api/onboarding/save/route.ts                                 NEW  (save draft)
app/api/onboarding/stripe-link/route.ts                          NEW  (Stripe Connect)
app/api/onboarding/complete/route.ts                             NEW  (publish business)

app/(dashboard)/dashboard/page.tsx                               NEW  (placeholder, v5b replaces)

migrations/004_onboarding.sql                                    NEW  (owners, RLS, socials)
```

## Files to DELETE from the repo

```
netlify.toml                   DELETE (Netlify is dead)
```

## Dependencies to install

```bash
npm install @supabase/ssr stripe
```

The `@supabase/ssr` package replaces the old `@supabase/auth-helpers-nextjs` (now deprecated). Stripe is for the Connect account flow.

## Environment variables (Vercel → Project → Settings → Environment Variables)

Existing ones still used:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=sk-...
```

Add these for v5a:
```
STRIPE_SECRET_KEY=sk_test_...          # from dashboard.stripe.com
STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_SITE_URL=https://app.openbook.ie
```

## Supabase Auth providers — one-time setup

Go to **https://supabase.com/dashboard/project/nrntaowmmemhjfxjqjch/auth/providers**

### Google
1. Toggle Google ON
2. You'll need to create a Google OAuth app at https://console.cloud.google.com/apis/credentials
3. Authorised redirect URI: `https://nrntaowmmemhjfxjqjch.supabase.co/auth/v1/callback`
4. Paste the Client ID + Client Secret into Supabase

### Apple
1. Toggle Apple ON
2. Needs an Apple Developer account ($99/year) — if you don't have one yet, skip Apple for now and users can use Google or email
3. Create a Services ID in https://developer.apple.com/account/resources/identifiers
4. Redirect URI: `https://nrntaowmmemhjfxjqjch.supabase.co/auth/v1/callback`

### Email (already on by default)
Nothing to configure. Magic link emails flow through Supabase's built-in SMTP.

### Redirect URLs
In **Auth → URL Configuration**, add these to **Redirect URLs** (allowlist):
```
https://app.openbook.ie/auth/callback
https://dash.openbook.ie/auth/callback
https://*.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

Set **Site URL** to `https://app.openbook.ie`.

## Vercel domain setup

1. **Vercel Dashboard → OpenBook project → Settings → Domains**
2. Add `app.openbook.ie` and `dash.openbook.ie`
3. Vercel will show DNS instructions. Both need CNAME records pointing at `cname.vercel-dns.com` (the exact target Vercel shows).
4. Add those records in your DNS provider (wherever openbook.ie is registered).
5. DNS propagation: 1–60 minutes.

## Database migration

Run `migrations/004_onboarding.sql` in the Supabase SQL editor. This:
- Creates the `owners` table (keyed to `auth.users.id`)
- Adds an auto-trigger that inserts an `owners` row when a new auth user signs up
- Adds `owner_id`, `founder_name`, `secondary_colour`, `socials`, Stripe fields to `businesses`
- Creates `instagram_posts` table (for when we turn on the Meta API)
- Sets up Row Level Security so owners only see their own businesses

## Stripe Connect setup

1. Create a Stripe account at https://dashboard.stripe.com/register (or sign in to your existing one)
2. Enable Connect → Platform: **https://dashboard.stripe.com/settings/connect/platform-profile**
3. Activate **Express accounts**
4. Add your platform branding under **Settings → Connect settings → Branding**

## Claude Code prompt

Paste this:

> Extract ~/Downloads/openbook-v5a.zip into the repo. Then:
>
> 1. Read README.md first.
> 2. Copy all files preserving paths. Overwrite existing files.
> 3. Delete `netlify.toml` from the repo root.
> 4. Install dependencies: `npm install @supabase/ssr stripe`.
> 5. Confirm migrations/004_onboarding.sql needs to be run manually — tell me to run it in Supabase SQL editor.
> 6. Remind me to add `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL` to Vercel env vars.
> 7. Remind me to configure Google + email auth providers in Supabase dashboard (Apple later if no dev account).
> 8. Remind me to add `app.openbook.ie` and `dash.openbook.ie` as domains in Vercel and update DNS.
> 9. Run `npm run build` and fix any type errors.
> 10. Commit "feat: 15-min onboarding + Netlify kill + host routing + Supabase auth + Stripe Connect" and push.

After Claude Code commits:

- Run the SQL migration
- Add Vercel env vars + domains
- Configure Supabase auth providers
- DNS records for subdomains
- Test: visit `https://app.openbook.ie/onboard` — sign in with Google or email, go through all 8 steps

## What v5b will add (next drop)

- Overview dashboard (bookings today, revenue, insights)
- Calendar + bookings management
- Services editor (full CRUD with drag-reorder)
- Hours + closures editor
- Customers list
- Settings (re-edit anything from onboarding)
- Stripe dashboard link-out
- Instagram connect flow + post display

## What's intentionally NOT in v5a

- The actual Meta/Instagram OAuth — we stored the schema, we'll add the OAuth flow when the Meta app is approved
- Apple OAuth (if you don't have a dev account yet)
- Password auth — we use magic link instead, simpler and no password management
- The business dashboard proper (comes in v5b)
