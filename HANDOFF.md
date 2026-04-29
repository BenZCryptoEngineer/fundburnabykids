# HANDOFF — end of v0.3 work pass (2026-04-28)

**For the next session.** This file describes what was just done, what's awaiting user action, and what to pick up if the user has no immediate ask. For stable architecture reference + onboarding, read `CLAUDE.md`. For the catalogue of shipped work + open follow-ups, read `TODO.md`.

---

## What this session shipped (high-level)

35 commits between `19a5764` and `bdc2611` on `main`. Detailed list in `TODO.md § Done in v0.3 (this work pass — 2026-04-28)`. Major themes:

- **Form rebuild** — POSTs no longer go through Netlify Forms; everything routes through `/api/submit` (custom Netlify Function). End-to-end tested.
- **Recovery flow** — post-confirm "Your links" email + `/find-my-signature/` page so signers don't lose their letter / withdraw URLs.
- **Email-hash dedup** — same person can't double-count.
- **Signatories cards UX** — replaced broken pill marquee with white-card row + relative time. Fixed an Astro scoped-CSS gotcha en route (see `CLAUDE.md`).
- **Schools roster + sources** — added 4 missing SD41 elementary; sources block in the help dialog.
- **Letter URL surfaced** — every mailto-to-MLA includes `https://fundburnabykids.ca`; every outbound email's footer is now a clickable link.
- **Ops playbooks** — `infrastructure/HAND_DELIVERY_PLAYBOOK.md` (500-milestone) and `infrastructure/PAC_OUTREACH_TEMPLATES.md` (5 email variants).
- **Domain canonicalization** — netlify.app subdomain 301s to fundburnabykids.ca; SITE_URL env scoped per deploy context.
- **DB-level smoke** + **manual purge tooling** + workflow_dispatch entry point.

CI green on the latest commit. Smoke (HTTP + DB) green on prod. Migration applied cleanly.

---

## Pending user action (in priority order)

These are decisions or content the user owes; agent shouldn't proceed on them without input.

### 1. Verify two medium-confidence school neighbourhood corrections — TODO § F
- **Confederation Park** moved from `Capitol Hill` → `Burnaby Heights`
- **Alpha Secondary** moved from `Capitol Hill` → `Willingdon Heights`

Both schools sit at boundary zones where catchment + colloquial usage diverge. The audit cited Heritage Burnaby + Wikipedia for both, but a Burnaby parent / PAC chair familiar with the area should confirm before launch. If wrong, edit `campaigns/fund-burnaby-kids/schools.yaml` AND mirror to `netlify/functions/_shared.ts:SCHOOL_NEIGHBOURHOODS`.

### 2. ZH translation of new EN founder bio — TODO § E
`meta.yaml:founder.bio.en` was rewritten this session for the parent/MLA audience. `founder.bio.zh` and `founder.role.zh` still hold the old AI-alignment / cognitive-systems framing — they no longer match. Needs a Chinese-fluent translator pass (probably user, possibly a coalition member).

### 3. Decide on the medium-confidence neighbourhood calls visible BEFORE launch
Campaign launches `2026-05-01` (per `meta.yaml`). #1 + #2 should land before that to avoid a public name showing on the wrong neighbourhood / school card.

---

## Pending Netlify-side actions (out-of-repo, user has to do)

The repo can't fix these — they require Netlify dashboard access:

- **Netlify Starter site-pause incident this session** is resolved (user upgraded / unpaused). Smoke cron was throttled from `*/30 * * * *` to `0 */6 * * *` to reduce future quota burn. If signups spike at launch, watch the Functions invocations + bandwidth tab in the Netlify dashboard daily for the first week.
- **SITE_URL env vars**: Production = `https://fundburnabykids.ca`, the four non-prod contexts = unset (so deploy previews self-link via Netlify's `URL`). Confirmed working at end of session.
- **Primary domain**: `fundburnabykids.ca` is set as primary in Netlify dashboard. ✓

---

## What to pick up if the user has no immediate ask

Sorted by leverage. Each is self-contained — no chain of prerequisites.

1. **TODO § G — Playwright e2e for PAC modal**. Symmetric to the existing signature-form e2e. Modal trigger + dialog open + form fill + submit + assert `/confirm-thanks/?form=pac` copy swap. Useful before any real PAC submits because PAC chairs are the highest-trust source we'd lose if the flow silently broke.
2. **TODO § H — `scripts/verify-pac-endorsement.sh`** that wraps the manual UPDATE SQL. Low effort; the friction Ben described feels real once PAC volume picks up.
3. **TODO § C — IP anonymization `pg_cron`** — defense for 90 days post-campaign. Currently a manual UPDATE in the migration comment. Adding the cron is ~5 lines of SQL.
4. **TODO § A — PNG fallback for OG cards** — only if WeChat / Facebook share previews matter. If user mentions WeChat distribution, do this.

If user opens with a NEW issue (something broke, a stakeholder asked for X), prioritize that over the above.

---

## Conventions to follow

- **Reply in Chinese** to the user (Simplified or Traditional, mirror them). Repo files stay English.
- **No personal-domain leakage** — Burnaby Kids First repo only.
- `astro check && astro build` before push. CI gates this but local feedback is faster.
- Commit messages: explain *why*, link evidence (commit hashes, file paths, decisions). Co-author trailer:
  ```
  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  ```
- When the user says "clean prod DB" or similar: use `scripts/purge-test-signatures.sh` (or the workflow_dispatch). Do NOT add a `pg_cron` schedule — see `CLAUDE.md § Test-data hygiene` for why we explicitly reverted that path.
- When you finish a task, update `TODO.md` (commit hash + file paths) and overwrite this `HANDOFF.md` with a fresh summary of the session you just completed. Don't accumulate — handoff is meant to be one session deep.
