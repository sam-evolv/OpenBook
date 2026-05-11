# Auth setup — operational notes

This doc captures the manual steps that sit **around** the code — things that Vercel / Supabase / DNS need to be configured for before the signed-in experience works end-to-end. Useful on a fresh machine, after a project fork, or when something breaks and the code isn't the culprit.

## 1. `owners` row seeding for new auth users

**Problem.** A signed-in user needs an `owners` row keyed to their `auth.users.id` for the dashboard to load. Without it, `requireCurrentBusiness` silently redirects them to `/onboard` on every page, because `getCurrentOwner()` returns `null`.

**Current code path.** `app/auth/callback/route.ts` now upserts the owner row after OAuth code exchange, using the Supabase user id, email, display name, and avatar metadata. This prevents Google OAuth from bouncing a valid user back to the login screen just because the owner record was missing.

**Manual recovery fix.** If a legacy user was created before the callback upsert existed, insert their owner row via Studio → SQL Editor:

```sql
INSERT INTO owners (id, email, onboarding_completed, onboarding_step)
VALUES (
  '<auth.users.id>',        -- copy from Authentication → Users
  '<email>',
  true,                     -- skip onboarding for internal seeding
  7                         -- last onboarding step; irrelevant when completed=true
);
```

Replace `<auth.users.id>` with the user's UUID from **Authentication → Users** and `<email>` with their address. Setting `onboarding_completed = true` lets them bypass the `/onboard/flow` wizard — only appropriate for internal seeding (Sam's own account, test accounts). Real customers walk through `/onboard/flow` which writes the row for them on completion.

**Optional database hardening.** A Postgres trigger on `auth.users` INSERT can also auto-create the matching `owners` row with `onboarding_completed = false` and route the user through `/onboard/flow`. Trigger sketch:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.owners (id, email, onboarding_completed, onboarding_step)
  VALUES (NEW.id, NEW.email, false, 0)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
```

Not required for launch because the callback upsert covers OAuth sign-in, but still useful as defense-in-depth later.

## 2. Vercel Deployment Protection on preview deployments

**Problem.** Vercel Deployment Protection SSO gates preview URLs behind a Vercel login even after the user authenticates via Supabase. This stacks two auth layers and blocks clean preview review — the reviewer can't reach the app because the SSO gate fires before the app's own auth flow.

**Fix (manual, one-time).** Vercel dashboard → **open-book** project → **Settings → Deployment Protection → Preview deployments** → set to **None**. Supabase magic-link auth remains the real gate — the Vercel SSO layer on preview is redundant.

Production stays protected by its own auth code path; this change only affects `*.vercel.app` preview URLs.

## 3. Supabase redirect URL allowlist

For magic links to work on preview subdomains, add the preview wildcard to **Authentication → URL Configuration → Redirect URLs**:

```
https://app.openbook.ie/auth/callback
https://dash.openbook.ie/auth/callback
https://*.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

Already documented in the root README — listed here because it's the other half of fixing preview-access friction, and people will look for it in one place.

## 4. Host-based routing landmarks (code reference)

- `middleware.ts` — Supabase session cookie refresh + host routing (`dash.openbook.ie` → dashboard destinations, `app.openbook.ie` / `localhost` → consumer `/home`).
- `app/page.tsx` — fallback root handler for hosts the middleware doesn't catch (Vercel preview subdomains, unmapped hosts). Sniffs the `Host` header and redirects to `/dashboard` or `/home`.
- `app/(dashboard)/dashboard/page.tsx` — bare `/dashboard` handler; redirects to `/dashboard/overview`. Exists so `dash.openbook.ie/` (middleware redirects to `/dashboard`) doesn't land on a 404.
- `app/(dashboard)/layout.tsx` — calls `requireCurrentBusiness`, which is the auth gate for every `/dashboard/*` page. Unauth → `/onboard`, authed but no business → `/onboard/flow`.
