# CLAUDE.md — guidance for Claude Code sessions in this repo

## Conversation conventions

- **Reply in Chinese** (Simplified or Traditional, mirror the user). The user is bilingual EN/ZH but prefers Chinese for conversation.
- **Repo files stay English**. Astro components, YAML campaign data, SQL, TypeScript, and commit messages — all English. Bilingual UI strings live inside `{ en, zh }` objects in YAML / `<I18nText>` components.
- **No personal-domain leakage**. This is the Burnaby Kids First coalition repo. Do not reference Ben's personal writing, side projects, or other frameworks here — not even as exclusions.

## Project layout

```
campaigns/fund-burnaby-kids/    YAML content collections (meta, mlas, journey,
                                personas, facts, faq, schools, thresholds,
                                pac-kit, letter)
infrastructure/                 Supabase SQL migration + workflow + privacy docs
netlify/functions/              Netlify Functions: submit, confirm-signature, withdraw
platform/                       Astro 5 site (TypeScript, content collections)
  src/components/               Astro islands
  src/data/                     Static data files imported at build time (incl. visuals/)
  src/lib/                      Helpers (i18n, supabase anon-client for SSR)
  src/pages/                    en + /zh routes (static + SSR)
  src/lib/i18n.ts               t() helper, Lang type, localizedUrl() w/ trailing slash
samples/                        Design-exploration prototypes (kept as reference)
docs/                           Bootstrap + DEPLOY playbook
scripts/                        apply-supabase-migration.sh
tests/                          smoke-test.sh (pre-deploy + post-deploy)
.github/workflows/              CI + apply-migration + smoke-test-prod
```

## Build, dev, deploy

| What | Command |
|---|---|
| Dev server (port 4321 or 4322) | `cd platform && npm run dev` |
| Type check + production build | `cd platform && npm run build` (= `astro check && astro build`) |
| Astro check only | `cd platform && npx astro check` |
| Local end-to-end production simulation | `npx netlify dev --port 8888` (needs network for Edge Functions runtime) |
| Smoke test against local server | `tests/smoke-test.sh http://localhost:8888` |
| Smoke test against production | `tests/smoke-test.sh https://fundburnabykids.ca` |
| Apply Supabase migration | `source credentials.env && scripts/apply-supabase-migration.sh` |
| Type-check Functions | `npm run typecheck:functions` (root) |
| Production deploy | `git push origin HEAD:main` (Netlify auto-builds; GH Actions runs migration if SQL changed) |
| **Purge test signatures from prod** | `source credentials.env && scripts/purge-test-signatures.sh` (dry-run) → re-run with `--apply` |
| Database smoke (schema + dedup) | `source credentials.env && tests/smoke-db.sh` (also runs in smoke-test-prod) |

`credentials.env` at repo root (gitignored) has every key — `source credentials.env` before any script that needs Supabase / Resend / Netlify / Turnstile / Cloudflare / Buttondown access.

## Architecture state (post-v0.3)

v0.3 work pass (2026-04-28) rebuilt the form submission off Netlify Forms and added cross-session dedup, recovery, and durable post-confirm links. The v0.2 description below still applies; this section is what's NEW since v0.2.

### Form submission via custom Function (replaces Netlify Forms)
- All forms POST to `/api/submit` → `netlify/functions/submit.ts`. The Function dispatches by `form-name` (signature | pac-endorsement), validates, runs Turnstile + honeypot, writes Supabase, sends Resend email, returns 303. No more Netlify Forms detection magic to debug.
- `netlify/functions/recover-signature.ts` (`/api/recover`) handles the recovery flow — POST email → look up `email_hash` → re-send the "Your links" email.
- `_shared.ts` exports `getSiteUrl()` (precedence: SITE_URL env → Netlify-injected URL → hardcoded prod) so deploy-preview / branch deploys self-link to themselves without env tweaking, and `sendLinksEmail()` / `emailHashHex()` shared between submit + confirm + recover.

### Email-hash dedup
- `signatures.email_hash` (SHA-256 of normalized lowercase email, long-lived, NOT cleared at confirm).
- Partial UNIQUE index `signatures_email_hash_confirmed_unique ON (email_hash, petition_slug) WHERE confirmed=TRUE`. DB-level backstop.
- submit.ts dedup logic: confirmed-row found → silent no-op (defense vs. enumeration); pending-row in 48h window → UPDATE same row with fresh token + re-send email; nothing → INSERT.

### Three outbound emails
1. **Confirmation** (signer → "click to confirm" link) — `submit.ts:sendConfirmationEmail`. Sent on every fresh INSERT or pending re-issue.
2. **Post-confirm "Your links"** — `confirm-signature.ts` calls `_shared.ts:sendLinksEmail({mode: 'post_confirm'})` immediately after flipping `confirmed=TRUE`. Carries the letter URL + withdraw URL so the signer has them in their inbox forever, not just on the one-shot /confirmed/ page.
3. **Recovery "Your links"** — same template (`mode: 'recovery'`), triggered from `/find-my-signature/` form via `/api/recover`.

### `/find-my-signature/` page
Static page (en + zh) with email-input form. Two panels (form + sent confirmation), toggled client-side from `?sent=1` query (page is static-prerendered so SSR can't read query). Defense vs. enumeration: identical 303 → `?sent=1` whether or not the email matched.

### Withdraw URL surfaced on `/confirmed/`
Full block matching the letter-URL block (heading + URL display + Open + Copy buttons), not just a footer link. Same `letter_token` doubles as the withdraw credential.

### Letter preview before signing
ActionForm (above the form fields) has a `<details>` block titled "Read the letter you're co-signing →" that renders the actual mailto body with `{FIRST}` etc. replaced by `[Your first name]` placeholders. Surfaces what the signer is attaching their name to without them having to submit first.

### Recent-signers feed redesigned
`SignatoriesFeed.astro` switched from blue pill chips to white cards (1px border, 8px radius, shadow-sm). Marquee at ~40 px/s; hover/focus-within pauses; sparse-state floor at <6 items renders static; mobile becomes vertical stack of 5. Relative time via `Intl.RelativeTimeFormat` ("just now / 2h ago / Apr 25"). **See "Astro scoped-CSS + JS innerHTML" gotcha below — this component documents the workaround.**

### Domain canonicalization
- Netlify primary domain set to `fundburnabykids.ca` (not the netlify.app default alias).
- netlify.toml has a host-level 301 from `https://burnabykidsfirst-platform.netlify.app/*` → `https://fundburnabykids.ca/:splat` as in-repo defense.
- SITE_URL env set to `https://fundburnabykids.ca` only on Production context; unset on Deploy Preview / Branch deploys / Preview Server / Local CLI so `getSiteUrl()` falls back to Netlify-injected `URL` per deploy.

### Migration ordering rule
`infrastructure/supabase-migrations.sql` runs ALL `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` blocks BEFORE any `CREATE INDEX` that filters on those columns. CREATE TABLE IF NOT EXISTS is a no-op on existing DBs, so the in-table column declarations don't take effect there — partial indexes referencing columns added "later" in the file will fail with `42703 column does not exist` and abort the whole migration. v0.3 fixed this regression (`77e3d4c`) and ends the file with `NOTIFY pgrst, 'reload schema';` for self-healing PostgREST cache after any apply.

### DB-level smoke + manual purge
- `tests/smoke-db.sh` runs alongside HTTP smoke (every push + every 6h via cron). Schema check + dedup-constraint check + happy-path INSERT/UPDATE/SELECT. Uses existing `SUPABASE_PAT` GH secret.
- `scripts/purge-test-signatures.sh` with `--list / --apply / --wipe-all` modes. Workflow_dispatch entry: GH Actions → "Purge test signatures" → mode + apply inputs.
- Auto-purge cron is INTENTIONALLY DISABLED. See "Test-data hygiene" below — when user says "clean prod DB", use the script, do NOT add a schedule.

## Astro scoped-CSS + JS innerHTML — gotcha

When a component has BOTH a `<style>` block AND a JavaScript handler that rebuilds its DOM via `innerHTML = templateString`, the JS-rendered elements **silently lose all the component's CSS** after the first render.

**Why**: Astro auto-scopes `<style>` blocks by appending a per-build `data-astro-cid-XXXX` attribute to every selector AND to every element emitted by the component template. The HTML you build via `innerHTML` from a string has no way to inject that attribute (the CID changes per build, and even if you pin it, it's brittle). After the first JS render, the rebuilt elements no longer match `.foo[data-astro-cid-XXXX]` rules.

**Symptom**: components look correct on initial SSR, then visually degrade after JS hydration. Pills lose backgrounds. Cards collapse to plain text. Spacing vanishes. The browser dev tools show "no matching CSS rule" on the freshly-rendered elements.

**Fix**: use `<style is:global>` and prefix every class name with the component's name (e.g. `signatories-`, `sig-card-`) to avoid collisions. The styles are now real global rules that match BOTH the SSR markup AND any innerHTML-built DOM.

**Reference implementation**: `platform/src/components/SignatoriesFeed.astro` (`6c6b7b1`). Read the comment at the top of its `<style is:global>` block when you next need to add a polling component.

## Architecture state (post-v0.2)

This repo passed through a major v0.2 work pass that added the per-signer letter system and the privacy hardening. Current shape:

### Static + SSR hybrid
- `astro.config.mjs` has `output: 'static'` + `adapter: netlify()` + `trailingSlash: 'always'`.
- Most pages pre-render statically; routes that depend on a per-request token (`/letters/[token]`, `/mla/[id]`, `/withdraw/[token]`) set `export const prerender = false` and run as Netlify Functions via the `@astrojs/netlify` v6 adapter.
- The adapter writes its bundle to `platform/.netlify/v1/`; `netlify.toml`'s build command copies it to the repo-root `.netlify/v1/` because Netlify Build only auto-discovers there.

### Trailing-slash invariant
- **All static page URLs ship with a trailing slash** (`/confirm-thanks/`, `/privacy/`, etc.).
- `netlify.toml` has explicit `[[redirects]]` 301s for the unslashed form (`/confirm-thanks` → `/confirm-thanks/`). Without these, the SSR function's `path: '/*'` matcher claims the unslashed URL and 404s (it has no route for those paths).
- `localizedUrl()` in `platform/src/lib/i18n.ts` auto-appends a slash for non-anchor, non-query paths.

### Per-signer letter system (TODO.md item 2 — shipped)
- `signatures.letter_token` (32-byte base64url, generated at confirmation) keys the public letter URL.
- `signatures.locale` (long-lived, copied from `pending_locale` at confirmation) drives the letter page language.
- `public_letters` view exposes confirmed, non-anonymized rows with letter_token. Email is never projected.
- SSR pages: `/letters/[token]/`, `/mla/[id]/`, `/withdraw/[token]/`, EN + ZH each.
- Self-serve withdrawal flow at `/withdraw/<token>` → `/api/withdraw` → DELETE + Buttondown unsubscribe → `/withdrawn/`.
- Static OG card at `public/og/letter.{en,zh}.svg` (1200×630).

### Schema (signatures table)
`first_name`, `last_initial`, `school`, `grade`, `neighbourhood`, `riding_id`, `confirmed`, `confirm_token` (cleared on confirm), `confirm_token_expires`, `signed_at`, `validated_at`, `pending_email` (NULLed at confirm), `pending_consent_updates` (NULLed at confirm), `pending_locale` (NULLed at confirm), `locale` (long-lived, copied from pending_locale at confirm), `letter_token` (long-lived, generated at confirm), `ip_address`, `validated_ip`, `anonymized_at`. The full postal code is **never** stored — `submit.ts` derives `neighbourhood` from school name (via `SCHOOL_NEIGHBOURHOODS` in `_shared.ts`) and `riding_id` from postal FSA, then drops the postal.

### School → neighbourhood (transparency)
`schools.yaml` is `{ name, neighbourhood }` per row. `ActionForm.astro` shows the derived neighbourhood inline after school selection + a "?" help icon opens a `<dialog>` with the full mapping table. Mirrored in `_shared.ts:SCHOOL_NEIGHBOURHOODS` for server-side derivation (don't trust client). **Keep the YAML and the TS map in sync.**

## Deploy automation (post-v0.2)

Three GH Actions:
1. **`.github/workflows/ci.yml`** — runs on every push: `astro check && astro build`, asserts 18 expected static HTML files emitted, asserts SSR function bundle present. Catches type errors, missing routes, build regressions before they reach main.
2. **`.github/workflows/apply-migration.yml`** — fires on push to main when `infrastructure/supabase-migrations.sql` (or the script / workflow) changes. Calls Supabase Management API with `SUPABASE_PAT` GH secret. Idempotent.
3. **`.github/workflows/smoke-test-prod.yml`** — fires on push to main (4-min sleep then run), every 30 min via cron, and via workflow_dispatch. Runs `tests/smoke-test.sh` against `https://fundburnabykids.ca`. Catches deploy-time regressions even when nobody is pushing.

The smoke test script (`tests/smoke-test.sh BASE_URL`) walks ~35 URL/expected-status/expected-body-marker triples covering every static page, every SSR route with garbage-token expectations, and every static page's unslashed → slashed redirect.

## Running with full network access (sandbox vs local note)

The previous Claude Code session that built v0.2 ran in **claude.ai web's sandbox** with an outbound network allowlist that blocked `api.supabase.com`, `api.netlify.com`, `*.netlify.app`, `fundburnabykids.ca`, and Cloudflare DoH endpoints. Many tests had to be done manually by the user via curl.

A **Claude Code Local** session has no such allowlist — the same code can run smoke tests against production, run `netlify dev` for full local production simulation, run Playwright e2e, hit Supabase / Buttondown / Resend APIs directly. If you're a fresh local session picking up a debugging task, you can probably reproduce things end-to-end here that the previous session could only describe theoretically.

## Key architectural notes

- **Astro 5 content collections** are configured in `platform/src/content.config.ts`. The collection is named `campaign` and loads `*.yaml` from `../campaigns/fund-burnaby-kids/`. Look up entries via `getEntry('campaign', '<filename-without-extension>')`. The `meta.yaml` file uses `slug: fund-burnaby-kids` as its entry id (overrides filename).
- **Bilingual strings** follow `{ en: '...', zh: '...' }` pattern. Render via `<I18nText en="..." zh="..." lang={lang} />` or `t({ en, zh }, lang)`.
- **Signatures** flow: form POST `/api/submit` → `submit.ts` parses URL-encoded body → DB insert (`pending_*` columns + `locale` copy) → Resend confirmation email → 303 to `/confirm-thanks/` → user clicks link → `confirm-signature.ts` flips `confirmed=TRUE`, NULLs `pending_email`, copies `pending_locale` → `locale`, generates `letter_token`. Email never persists past confirmation. We deliberately bypassed Netlify Forms (it interacts badly with the SSR adapter's `path: '/*'` catch-all — POSTs fall through to the SSR function and 404). Trade-off: submissions don't appear in the Netlify Forms dashboard; Supabase is the source of truth.
- **Riding map** joins on `riding_id` (Elections BC `ED_ABBREVIATION`: BNC/BNE/BNN/BNO/BNS). The `RIDING_BY_FSA` table in `netlify/functions/_shared.ts` derives `riding_id` from postal code at submission.
- **Vite native imports** for static assets (`import x from '~/data/foo.json'`, or `import.meta.glob('?raw')` for `src/data/visuals/*.svg`) — do NOT use `fs.readFileSync(import.meta.url + ...)` because it breaks once components are bundled into the SSR worker.
- **SSR function authentication for `/withdraw/`**: the `letter_token` itself is the credential. It's a 32-byte CSPRNG only ever shown to the signer. Don't add a second auth layer.
- **TS literal-narrowing trap on SSR pages**: `const lang = 'en'` narrows to literal `'en'`; comparing `lang === 'zh'` errors out under `astro check`. If a single-locale SSR page ever needs to branch on locale, use locale-specific text directly per file (no comparison) — see the withdraw pages.

## Test-data hygiene

Test rows can land in the production `signatures` table from three sources: smoke-db.sh sentinels, manual end-to-end debugging, and submissions to RFC-2606 reserved test domains. The cleanup story is **deliberately manual**, not scheduled.

- **`scripts/purge-test-signatures.sh`** — local entry point. Three modes:
  - default: dry-run preview of pattern-matched test rows; pass `--apply` to actually DELETE
  - `--list`: dump every row with non-PII columns only (id, first_name, last_initial, school, signed_at, confirmed). Use to reconcile what's actually in the table when sentinel patterns don't match expected test data.
  - `--wipe-all`: nuclear DELETE of every row. Only safe pre-launch. Pair with `--apply` to execute.
  Patterns matched: `first_name ~ '^_smoke_'`, `email_hash ~ '^smoke_'`, `pending_email` LIKE `%@example.invalid` / `%@example.com` / `%@example.org`, and `(first_name IN ('ClaudeTest','PlaywrightTest') AND last_initial='X')`. Conservative — a real signer named "Test" with a real email won't be caught.
- **`.github/workflows/purge-test-signatures.yml`** — workflow_dispatch entry running the same script. Inputs: `mode` (list / sentinels / wipe-all) + `apply` (boolean). Use this when you don't have credentials.env locally; it consumes the same SUPABASE_PAT GH secret apply-migration uses.
- **`tests/smoke-db.sh` cleanup trap** — runs DELETE on `_smoke_*` rows on every exit (success or fail). Only auto-cleanup; per-run, not periodic, only catches its own sentinels.
- **What's NOT scheduled** — there is no `pg_cron` job for test-data purging. We tried `purge-test-signatures` on `*/10 * * * *` for one push (`097f307`) and reverted: automatic deletion of test rows is too eager (a developer might be inspecting a deliberate debug row when the job fires). Re-enabling needs an explicit user request and a code change.

When the user says "clean up the prod DB" or similar, the right move is `scripts/purge-test-signatures.sh` (or the workflow_dispatch) — first dry-run to show what would go, then `--apply` once they confirm. Do NOT add a cron schedule unless asked.

## Ops playbooks (campaign-day operations)

- **`infrastructure/HAND_DELIVERY_PLAYBOOK.md`** — what to execute when the homepage counter hits 500 confirmed signatures. T-7 days through T+1 day checklist + per-MLA cover letter template + 500-milestone press release template + tone constraints (no party attribution, no future-cut speculation, no signer PII in releases).
- **`infrastructure/PAC_OUTREACH_TEMPLATES.md`** — 5 PAC outreach email templates (Ben-direct, parent-forward, follow-up, decline-graceful, endorsed thank-you) + variables table + 14-day order-of-operations for working a list of ~30 PACs.
- **`infrastructure/MLA_REPLY_WORKFLOW.md`** — how MLA replies get curated onto the public scorecard (v1 manual; v2 inbound parsing trigger criteria documented).
- **`infrastructure/PRIVACY_DELETION_RUNBOOK.md`** — manual deletion fallback when a signer lost their letter URL and self-serve withdraw isn't accessible.

When the user mentions a milestone or a delivery date, check whether one of these playbooks already covers it before designing from scratch.

## Pending work

Active TODOs live in `TODO.md` at repo root. Each item is written to be cold-pickup-able by a future session — don't ask the user to re-explain.

## When committing

- Single coherent feature per commit, message body explains *why* and links to evidence (URLs, file paths, decisions).
- Co-author trailer: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
- This worktree branch (`claude/<random>`) is configured to push to `origin/main` directly. Use `git push origin HEAD:main`.
- **Always `astro check && astro build` locally before pushing** — Netlify runs the same and a type error gets caught silently in this sandbox without the check step. CI now also enforces this.
