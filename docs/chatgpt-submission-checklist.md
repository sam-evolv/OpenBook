# ChatGPT App Directory — submission runbook

For when Sam opens platform.openai.com on a Monday morning and wants
one screen telling him what to click. Each step does one thing.

## Pre-submission (do these in order)

- [ ] All code changes from the submission-readiness PR merged to main and deployed to production
- [ ] `https://www.openbook.ie/privacy` resolves and shows the canonical privacy policy (the marketing deployment is the source of truth)
- [ ] `https://www.openbook.ie/terms` resolves and shows the canonical terms
- [ ] `https://openbook.ie/privacy` and `/terms` 307-redirect to the `www.` host and end up at 200 (this is the URL you'll paste into the OpenAI form)
- [ ] sam@openhouseai.ie inbox set up and forwarding to a real address you actually read
- [ ] Test: send a mail to sam@openhouseai.ie from a personal account, confirm it arrives
- [ ] `curl https://mcp.openbook.ie/mcp -X POST -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'` returns 8 tools, each with `annotations` populated and no `debug_*` names

## OpenAI Platform Dashboard steps

### Identity verification

- [ ] Go to https://platform.openai.com/settings/organization/general
- [ ] Verify your individual identity if not already done
- [ ] If you want OpenBook listed under EvolvAI rather than your name, add EvolvAI as a verified business affiliation. You will need a domain email (e.g. sam@evolv.ai) or a registration document
- [ ] Decide: publisher = "Sam <surname>" or "EvolvAI". The directory listing reflects this; pick before you submit. (Reminder: the marketing footer currently says "OpenHouse AI Limited. Trading as OpenBook." Make the publisher name on the directory match the trading entity in the footer or update one of them so they agree.)

### App draft

- [ ] Go to https://platform.openai.com/apps-manage
- [ ] Click "Create new app"
- [ ] Name: OpenBook
- [ ] Paste tagline, short description, long description from `docs/chatgpt-app-listing.md`
- [ ] Categories: Lifestyle (primary). Add "Local services" as secondary if the form allows
- [ ] Country availability: Ireland
- [ ] MCP server URL: `https://mcp.openbook.ie/mcp`
- [ ] Privacy policy URL: `https://openbook.ie/privacy`
- [ ] Terms of use URL: `https://openbook.ie/terms`
- [ ] Support email: `sam@openhouseai.ie`
- [ ] Upload screenshots (capture per the spec in `docs/chatgpt-app-listing.md`)
- [ ] Upload logo / app icon at the required size

### Domain verification

OpenAI will hand you a token and tell you the path to serve it at.
The MCP middleware only forwards `/.well-known/*` paths through to
their own handlers on `mcp.openbook.ie`. Anything outside `.well-known/`
gets rewritten to `/api/mcp`, so the verification path must be under
`.well-known/`. If OpenAI gives you a different path, push back and ask
them to use a `.well-known/...` path, or set up a temporary edge route
on Vercel before verifying.

- [ ] OpenAI surfaces the verification token in the dashboard
- [ ] Note the path OpenAI tells you to serve it at (should look like `/.well-known/openai-domain-verification.txt` or similar)
- [ ] In Vercel, set environment variables on the production deployment:
  - `OPENAI_DOMAIN_VERIFICATION_TOKEN` = the verbatim token string
  - `OPENAI_DOMAIN_VERIFICATION_PATH` = the path segment after `.well-known/` (e.g. `openai-domain-verification.txt`, no leading slash)
- [ ] Trigger a production redeploy so the new env vars are live (touch any file or click "Redeploy")
- [ ] Test from your terminal: `curl -i https://mcp.openbook.ie/.well-known/<path>` — should be `200 OK` with `Content-Type: text/plain` and the token as the body
- [ ] Test that other paths still 404 cleanly: `curl -i https://mcp.openbook.ie/.well-known/random-string-here` should be `404`
- [ ] Click "Verify" in the OpenAI dashboard
- [ ] Confirm the dashboard shows the domain as verified

### Submit

- [ ] Final review: walk every field in the dashboard once, slowly
- [ ] Click Submit for review
- [ ] Save the case ID OpenAI emails you. Filed somewhere you'll find it (1Password, Notion, sam@openhouseai.ie inbox)

## Post-submission

- [ ] Wait. There is no expedited review. Reviews typically take days, not weeks
- [ ] If approved: do not auto-publish. Read the approval email, then click Publish manually when you are ready (so launch timing matches anything else you are doing — social, email, etc.)
- [ ] If rejected: read the reason, fix, resubmit. There is no submission limit
- [ ] Once published: search "OpenBook" in chatgpt.com to confirm it is discoverable

## Pre-flight check against the most common rejection reasons

- [ ] MCP server reachable from a clean ChatGPT session with no extra config
- [ ] Demo flow works without MFA, email verification, or account creation
- [ ] Tool annotations match documented behaviour (audited in this PR)
- [ ] Privacy policy live and accurate
- [ ] No debug tools in the manifest
- [ ] No "any intent" / "best" / "official" / "preferred" language in tool descriptions
- [ ] Domain ownership verifiable
- [ ] Screenshots match actual app behaviour
- [ ] Country availability is set; do not leave it blank or worldwide

## What to do if rejected

A rejection email will list the reasons. Common shapes and the fix:

- Tool annotation issue → re-audit the manifest in `lib/mcp/manifest.ts`, push, resubmit
- Description too broad → tighten language, push, resubmit
- Privacy policy incomplete → add the missing section to `app/privacy/page.tsx`, push, resubmit
- Server unreachable → check `https://mcp.openbook.ie/mcp` is up, redeploy if needed, resubmit
- Screenshots out of date → recapture at the current required dimensions, re-upload, resubmit

There is no submission limit. Iterate until approved.
