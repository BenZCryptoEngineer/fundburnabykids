# HANDOFF — current state snapshot

For an incoming session that wants to be productive in five minutes. Updated **2026-04-28** at the end of the v0.3 work pass.

## What's working in production right now

`https://fundburnabykids.ca` is live. `https://burnabykidsfirst-platform.netlify.app` 301s to the canonical domain. Counter is 0 (DB was wiped at the end of testing — see "Test-data hygiene" below). Campaign launch date is 2026-05-01; budget adoption deadline is 2026-05-27.

The full signer journey is end-to-end functional:

1. **Sign** — homepage form POSTs to `/api/submit` (Netlify Function). Honeypot + Turnstile + email-hash dedup runs server-side. New signer → row inserted, confirmation email sent. Same email signing again while pending → token re-issued on the same row, fresh email. Same email signing after confirming → silent no-op (defense vs. enumeration).
2. **Confirm** — signer clicks the link in the email. `confirm-signature.ts` flips `confirmed=TRUE`, generates `letter_token`, sends a second "Your signature is in — here are your links" email with the public letter URL + the withdraw URL.
3. **Public surfaces** — confirmed signature appears in the homepage counter, in the recent-signatories card marquee, in the riding-map tally, and at `/letters/<token>/`. Per-MLA aggregate at `/mla/<id>/`.
4. **Withdraw** — `/withdraw/<token>/` two-step confirmation page → DELETE row + Buttondown unsubscribe → `/withdrawn/`. Link surfaced on `/confirmed/`, in the post-confirm email, and on `/letters/<token>/`.
5. **Recovery** — signer who lost the email can recover at `/find-my-signature/`. Form posts email → `/api/recover` looks up `email_hash` → re-sends "Your links" email. Identical 303 response whether or not the email matched (no enumeration leak).

## What you can do without re-asking the user

- Read `TODO.md` — it lists the work shipped in v0.2 + v0.3 + the smaller follow-ups (A through H).
- Read `CLAUDE.md` — architecture state, ops playbooks, the Astro scoped-CSS + JS innerHTML gotcha, and the test-data hygiene rule (manual purge only — do NOT add a `pg_cron` schedule).
- Read `infrastructure/HAND_DELIVERY_PLAYBOOK.md` if the user mentions the 500-signature milestone.
- Read `infrastructure/PAC_OUTREACH_TEMPLATES.md` if the user mentions PAC outreach.

## How to run things locally

```bash
# Fastest iteration, frontend only:
cd platform && npm run dev      # http://localhost:4321 — Astro dev, no Functions

# Full Netlify simulation (Functions + redirects + SSR):
npx netlify dev --port 8888     # http://localhost:8888

# Run smoke tests against prod:
tests/smoke-test.sh https://fundburnabykids.ca
source credentials.env && tests/smoke-db.sh

# Apply Supabase migration:
source credentials.env && scripts/apply-supabase-migration.sh

# Purge test data (interactive — dry-run by default):
source credentials.env && scripts/purge-test-signatures.sh
# or via GH Actions: Repo → Actions → "Purge test signatures" → mode + apply inputs
```

## Credentials

`credentials.env` at repo root (gitignored) has every key. `source credentials.env` before any script that needs Supabase / Resend / Netlify / Turnstile / Cloudflare / Buttondown access. GH Actions secrets `SUPABASE_URL` + `SUPABASE_PAT` are configured for the apply-migration + smoke-db workflows.

## Known constraints / contracts

- **Branch contract** — push directly to `main` is fine for this repo (single maintainer). Netlify auto-builds on push. `apply-migration.yml` fires on push when SQL changes; `smoke-test-prod.yml` fires on push to main + every 6 hours.
- **Always `astro check && astro build` before push.** CI gates this but local feedback is faster.
- **Reply in Chinese** to the user (Simplified or Traditional, mirror them). Repo files stay English.
- **No personal-domain leakage** — Burnaby Kids First repo only. Don't reference Ben's personal projects, writing, or other frameworks here.
- **Test-data hygiene** is manual on purpose. Don't add scheduled DELETE jobs for sentinel patterns unless explicitly asked.

## Outstanding follow-ups (none blocking the campaign)

See `TODO.md § Smaller follow-ups`:
- A: PNG fallback for OG card (only if WeChat / Facebook share previews matter)
- B: `letter.yaml` public-letter template tokens (currently inline in `LetterRender.astro`)
- C: IP anonymization `pg_cron` schedule (manual UPDATE documented; not yet automated)
- E: ZH translation of the new EN founder bio
- F: Verify two medium-confidence school neighbourhood corrections (Confederation Park, Alpha)
- G: Playwright e2e for the PAC modal
- H: PAC verify shortcut script

## When you finish a task

- Update `TODO.md` with what shipped, including commit hash + file paths
- If you added or changed a workflow / process, cross-link it from `CLAUDE.md`
- If you added a campaign-day artifact (cover letter / press release / PAC outreach), put it under `infrastructure/` and mention it in `CLAUDE.md § Ops playbooks`
- Reply to the user in Chinese with what changed, what was tested, and what (if anything) needs their action
