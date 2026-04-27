# Deploy playbook

Two production systems sit behind every deploy: **Supabase** (database
schema) and **Netlify** (the Astro site + Netlify Functions). They have
to move together, and the schema has to land first — otherwise the new
code writes to columns that don't yet exist and confirmations 500.

## TL;DR — fully automated path

After the one-time setup below, deploys are a single command:

```bash
git push origin HEAD:main
```

Behind that push, two pipelines run in parallel:

1. **GitHub Actions** (`.github/workflows/apply-migration.yml`) calls
   the Supabase Management API and applies any new statements in
   `infrastructure/supabase-migrations.sql`. The migration file is
   idempotent (`CREATE ... IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS`,
   `DROP VIEW IF EXISTS`), so re-runs are safe.
2. **Netlify** auto-builds the same commit and publishes
   `platform/dist/` plus the SSR Function bundle.

GH Actions finishes in seconds; Netlify finishes in minutes. By the time
the new code is serving traffic, the schema is already in place.

## One-time setup

### 1. Add GitHub Actions secrets

Repo → Settings → Secrets and variables → Actions → **New repository
secret** for each of:

| Secret name    | Value                                      | Source                                                                  |
|----------------|--------------------------------------------|-------------------------------------------------------------------------|
| `SUPABASE_URL` | `https://<ref>.supabase.co`                | Supabase dashboard → Project Settings → API                             |
| `SUPABASE_PAT` | `sbp_…` (Personal Access Token, NOT a JWT) | Supabase dashboard → Account icon → Access Tokens → "Generate new token" |

The PAT only needs project-level access. If the campaign ever moves to
a different Supabase org, generate a new PAT and rotate the secret.

### 2. Add Netlify env vars (once, then forget)

Netlify dashboard → Site → Project configuration → Environment variables.
Confirm these are present (most existed for the riding-map / signature
counter; the SSR letter routes reuse them):

| Var                          | Required for                                              |
|------------------------------|-----------------------------------------------------------|
| `PUBLIC_SUPABASE_URL`        | RidingMap, SignatureCounter (client) + SSR letter pages   |
| `PUBLIC_SUPABASE_ANON_KEY`   | Same                                                      |
| `SUPABASE_URL`               | Netlify Functions (on-signature, confirm-signature)       |
| `SUPABASE_SERVICE_ROLE_KEY`  | Same                                                      |
| `RESEND_API_KEY`             | Confirmation email send                                   |
| `RESEND_FROM`                | Same                                                      |
| `TURNSTILE_SECRET`           | Bot challenge verification on form POST                   |
| `PUBLIC_TURNSTILE_SITE_KEY`  | Bot challenge widget render                               |
| `BUTTONDOWN_API_KEY`         | Newsletter opt-in subscribe                               |
| `MAILING_ADDRESS`            | CASL footer in confirmation email + site footer           |
| `SITE_URL`                   | Confirmation redirects                                    |

If any are missing, copy the value from `credentials.env` at repo root.

## Manual deploy (when CI is unavailable)

If GitHub Actions is degraded or you need to apply the migration without
pushing code:

```bash
source credentials.env
./scripts/apply-supabase-migration.sh
```

Then push to main as usual — Netlify auto-builds, no migration step
because the workflow's `paths:` filter only fires when the SQL file (or
the workflow itself) changes.

## Verifying a deploy

After Netlify reports "Published":

1. **Static pages** — `curl -s https://fundburnabykids.ca/ | grep -c
   '<svg'` should return ≥ 13 (4 persona-panel visualizations + favicon
   + UI icons all inline).
2. **SSR letter route** — visit `https://fundburnabykids.ca/letters/x`
   (any garbage token). Expect a 404 with the "Letter not found" card.
   That confirms the SSR Function is wired up. If you get a Netlify
   "Page not found" instead, the `cp -r platform/.netlify .` step in
   `netlify.toml` didn't take effect.
3. **MLA inbox** — `https://fundburnabykids.ca/mla/kang` should render
   the inbox (likely empty until letters confirm).
4. **End-to-end** — sign a real test signature with a working email,
   click the link, confirm `/confirmed?status=ok&t=<token>` shows the
   "Your letter" section, then open `/letters/<token>` to see the
   filled letter.

## What can't be fully automated (yet)

- **Initial Netlify env-var population** — has to be a one-time manual
  step the first time the site is created. The dashboard accepts bulk
  paste from `credentials.env`.
- **Domain / DNS / SSL** — handled at Porkbun + Netlify, no script
  needed once configured.
- **Buttondown welcome email content** — managed via Buttondown's UI;
  no API endpoint covers the editor state.

Everything else (Supabase schema, Netlify build, Netlify Function
bundle, Astro SSR Function) is push-button automated by the workflow
above.
