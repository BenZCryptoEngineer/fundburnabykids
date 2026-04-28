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
netlify/functions/              Netlify Functions: on-signature, confirm-signature, withdraw
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

`credentials.env` at repo root (gitignored) has every key — `source credentials.env` before any script that needs Supabase / Resend / Netlify / Turnstile / Cloudflare / Buttondown access.

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
`first_name`, `last_initial`, `school`, `grade`, `neighbourhood`, `riding_id`, `confirmed`, `confirm_token` (cleared on confirm), `confirm_token_expires`, `signed_at`, `validated_at`, `pending_email` (NULLed at confirm), `pending_consent_updates` (NULLed at confirm), `pending_locale` (NULLed at confirm), `locale` (long-lived, copied from pending_locale at confirm), `letter_token` (long-lived, generated at confirm), `ip_address`, `validated_ip`, `anonymized_at`. The full postal code is **never** stored — `on-signature.ts` derives `neighbourhood` from school name (via `SCHOOL_NEIGHBOURHOODS` in `_shared.ts`) and `riding_id` from postal FSA, then drops the postal.

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
- **Signatures** flow: form post → Netlify Forms detection → `on-signature.ts` → DB insert (`pending_*` columns + `locale` copy) → Resend confirmation email → user clicks link → `confirm-signature.ts` flips `confirmed=TRUE`, NULLs `pending_email`, copies `pending_locale` → `locale`, generates `letter_token`. Email never persists past confirmation.
- **Riding map** joins on `riding_id` (Elections BC `ED_ABBREVIATION`: BNC/BNE/BNN/BNO/BNS). The `RIDING_BY_FSA` table in `netlify/functions/_shared.ts` derives `riding_id` from postal code at submission.
- **Vite native imports** for static assets (`import x from '~/data/foo.json'`, or `import.meta.glob('?raw')` for `src/data/visuals/*.svg`) — do NOT use `fs.readFileSync(import.meta.url + ...)` because it breaks once components are bundled into the SSR worker.
- **SSR function authentication for `/withdraw/`**: the `letter_token` itself is the credential. It's a 32-byte CSPRNG only ever shown to the signer. Don't add a second auth layer.
- **TS literal-narrowing trap on SSR pages**: `const lang = 'en'` narrows to literal `'en'`; comparing `lang === 'zh'` errors out under `astro check`. If a single-locale SSR page ever needs to branch on locale, use locale-specific text directly per file (no comparison) — see the withdraw pages.

## Pending work

Active TODOs live in `TODO.md` at repo root. Each item is written to be cold-pickup-able by a future session — don't ask the user to re-explain.

## When committing

- Single coherent feature per commit, message body explains *why* and links to evidence (URLs, file paths, decisions).
- Co-author trailer: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
- This worktree branch (`claude/<random>`) is configured to push to `origin/main` directly. Use `git push origin HEAD:main`.
- **Always `astro check && astro build` locally before pushing** — Netlify runs the same and a type error gets caught silently in this sandbox without the check step. CI now also enforces this.
