# TODO — Fund Burnaby Kids

Active deferred work. Each item is self-contained — a fresh session can pick any one up without re-asking the user.

---

## Done in v0.3 (this work pass — 2026-04-28)

Long session, ~30 commits. Major themes:

### Form submission rebuilt off Netlify Forms (a5f1a55)
The `fill form → click Sign → 404` bug confirmed: SSR adapter's `path: '/*'` claimed POSTs before Netlify Forms detection. Fix is the v0.3 baseline — every form on the site now POSTs to `/api/submit` (`netlify/functions/submit.ts`), which writes Supabase + sends Resend email + 303s. Forms dashboard view is gone; Supabase is the source of truth. Same Function dispatches signature + pac-endorsement by `form-name`.

### v0.3 dedup (4641bbd)
`signatures.email_hash` (SHA-256 of normalized email, long-lived) + partial UNIQUE index `(email_hash, petition_slug) WHERE confirmed=TRUE`. submit.ts dedups in three branches before INSERT: confirmed-row exists → silent no-op (defense vs. enumeration); pending-row in 48h window → re-issue token on the SAME row, send fresh email; nothing → INSERT. DB-level UNIQUE is the backstop.

### Durable links — recovery flow (4b58e63)
A signer who closed the /confirmed/ tab a week ago now has two recovery surfaces: a post-confirm "Your signature is in" email sent immediately after `confirm-signature.ts` flips the row (carries letter URL + withdraw URL), and a `/find-my-signature/` page with email-input → `/api/recover` (new Function) that re-sends the same "Your links" email. Recovery responds identically whether or not the email matches a confirmed row (no enumeration leak).

### Migration + schema correctness (4152a77, 77e3d4c)
Two latent migration bugs surfaced when v0.3 confirms started running for real:
- `letter_token` column never actually got added on prod — `CREATE INDEX … WHERE letter_token IS NOT NULL` ran before the `ALTER TABLE … ADD COLUMN IF NOT EXISTS letter_token` (CREATE TABLE IF NOT EXISTS is a no-op on existing tables, so the in-table column declaration didn't take). Reordered: ALTER blocks now run before any partial index that references those columns.
- PostgREST schema cache stays stale ~1–2 min after a migration. Migration now ends with `NOTIFY pgrst, 'reload schema';` so each apply is self-healing.

### Database-level smoke (829c1c8, f4e0f54)
`tests/smoke-db.sh` runs alongside the HTTP smoke and exercises: schema check (v0.3 columns + partial UNIQUE index present), dedup constraint check (insert-conflicting-confirmed-row → expects 23505 unique violation), and an INSERT-pending → UPDATE-confirmed → SELECT-shape happy path. All test rows use `_smoke_*` first_name + sentinel email_hash; trap'd cleanup wipes them on every exit. Wired into `smoke-test-prod.yml` with the existing SUPABASE_PAT secret.

### Manual purge tooling (027ce15, 60b6411)
`scripts/purge-test-signatures.sh` with three modes: `--list` (audit), default sentinels (delete _smoke_* / RFC-2606 reserved test domains / ClaudeTest+last_initial='X'), `--wipe-all` (pre-launch nuke). Dry-run by default; `--apply` to execute. Also wired as `workflow_dispatch` GH Action with the same modes (mode + apply inputs) so cleanup runs without local creds.

We tried a `pg_cron` schedule for the same patterns at `*/10 * * * *` (097f307) and reverted (37cbe25): auto-deletion of test rows is too eager — a developer mid-debug could lose deliberate test data to the next tick. Manual entry only. CLAUDE.md "Test-data hygiene" section pins this rule for future sessions.

### Domain canonicalization (5200e4e, 1c3254f)
The Netlify default subdomain (`burnabykidsfirst-platform.netlify.app`) was serving the same site as `fundburnabykids.ca`, and the SITE_URL env was set to the alias on Production — so old confirmation emails linked to the alias and every relative link on the page sticky'd users to that domain. Fixed two ways:
- netlify.toml host-level 301 from `https://burnabykidsfirst-platform.netlify.app/*` → `https://fundburnabykids.ca/:splat` (in-repo defense).
- `getSiteUrl()` helper in `_shared.ts` with precedence `SITE_URL || URL || hardcoded prod`. Set Production SITE_URL to https://fundburnabykids.ca and unset on the four non-prod contexts so deploy-preview / branch deploys self-link via Netlify-injected `URL`.

### Schools roster audit (9496b12)
User reported Montecito Elementary missing. Cross-checked our list against SD41 official directory; added 4 missing elementary (Brentwood Park, Gilpin, Montecito, Rosser), corrected 5 neighbourhoods (Inman, Maywood, Burnaby North = high confidence; Confederation Park, Alpha = medium — see follow-up F below). Sources block (1d00468) now renders inside the "?" help dialog so signers can trace any row to SD41 / Heritage Burnaby.

### Letter + email URL surfacing (630b9bf, 665d472)
The mailto-to-MLA body now appends `https://fundburnabykids.ca` as a footer line — every signer's email reaches 7 MLA inboxes with a clickable link back to the campaign. Also hyperlinked the footer `fundburnabykids.ca` mention in all 4 confirmation/post-confirm email templates (en + zh × confirm/links) so older email clients that don't auto-link see a real anchor.

### Founder bio refresh + cards UX (6dbf6bb, 6c6b7b1)
Founder bio rewritten for parent/MLA audience, links Expeta Technologies. Bio renderer flipped from `<p>{p}</p>` to `<p set:html={p}>` so YAML can carry inline anchors. ZH translation flagged as follow-up E.

Recent-signers feed redesigned: "calm row of cards" per industry research (Change.org / GoFundMe / 38 Degrees scan). White cards with bold accent name + muted school + relative time ("just now / 2h ago / Apr 25"). Marquee at ~40 px/s, pause on hover/focus-within, sparse-floor below 6 items, mobile becomes vertical stack of 5. Uncovered + fixed an Astro gotcha en route — see CLAUDE.md "Scoped-CSS + JS innerHTML" note.

### Ops playbooks (1002382, f4fe45c)
- `infrastructure/HAND_DELIVERY_PLAYBOOK.md` — 500-milestone hand-delivery checklist + per-MLA cover letter template + 500-milestone press release template + tone constraints.
- `infrastructure/PAC_OUTREACH_TEMPLATES.md` — 5 email templates (Ben-direct cold, parent-forward warm, follow-up, decline-graceful, endorsed thank-you) + variables table + 30-PAC outreach order-of-operations.

### Smaller misc fixes
- Counter staleness: 4 polling components (SignatureCounter / SignatoriesFeed / ProgressBar / RidingMap) now call `poll()` immediately on hydration so `setInterval` doesn't leave a 30s window of stale data after page load. (4a4e25d)
- Empty-state ghost: SignatoriesFeed `poll()` early-returned on `sigs.length === 0`, leaving stale SSR-baked pills on a wiped DB. Fixed to render the empty-state pill in the legitimate-zero case. (905ecf3)
- MlaScorecard `[object Object]` under MLA names: `riding` is `{en, zh}` (bilingual) but the type was `string`. Wrapped with `t(m.riding, lang)`. (54689dc)
- /mla/<id>/ link gained trailing slash to skip the 301 hop. (54689dc)
- `tests/smoke-test.sh` /mla rows aligned with `trailingSlash: 'always'`. (4a5a0ae)
- Smoke cron throttled `*/30 * * * *` → `0 */6 * * *` after Netlify Starter site-pause incident. (54689dc)
- ActionForm gained letter preview `<details>` block above form so signers see the actual mailto body before they sign.

---

## ✅ RESOLVED — fill form → click Sign → "Page not found"

Fixed by routing the signature + pac-endorsement form POSTs through a custom Netlify Function (`/api/submit` → `netlify/functions/submit.ts`) instead of relying on Netlify Forms detection.

### Confirmed root cause
A live `curl -X POST https://fundburnabykids.ca/confirm-thanks/` against prod returned `404`, confirming hypothesis 1: Netlify Forms wasn't intercepting the POST. With the SSR adapter declaring `path: '/*'` + `preferStatic: true`, GET requests fall back to the static `/confirm-thanks/index.html`, but POSTs land on the SSR function — which has no route for `/confirm-thanks/` and returns Netlify's default 404 page. Whether Netlify's form-detection scan was failing entirely or losing the race against the SSR catch-all wasn't worth pinning down further; the fix removes the dependency.

### Fix shape
- `submit.ts` parses the URL-encoded body, dispatches by `form-name`, runs Turnstile + honeypot + validation, writes Supabase, sends the Resend confirmation email, and returns 303 to `/confirm-thanks/` (or `/zh/confirm-thanks/?form=pac` for PAC).
- `netlify.toml` adds `/api/submit` → `/.netlify/functions/submit` (force=true).
- Both forms in `ActionForm.astro` and `PacKitModal.astro` now have `action="/api/submit"` and no `data-netlify` / `netlify-honeypot` attributes.
- `confirm-thanks` (en + zh) reads `?form=pac` client-side and swaps copy from "Check your email" to "Endorsement received" so PAC submitters don't see misleading email copy.
- Bonus fix uncovered by the e2e: the postal `pattern` attribute was being emitted as `s?` (Astro stripped the source backslash); switched to expression-form `pattern={"^...\\s?...$"}` so the regex now accepts canonical "V5B 3X6" with a space.

### Regression coverage shipped alongside
- `tests/e2e/form-submit.spec.ts` (new) — Playwright fills the signature form with realistic data, asserts the submit lands on `/confirm-thanks/` showing "Check your email", and explicitly fails if Netlify's "Page not found" body leaks through. Auto-starts `netlify dev` via Playwright `webServer` config so a single `npm run test:e2e` runs the whole loop.
- `tests/smoke-test.sh` (extended) — added a POST `/api/submit` honeypot check that asserts 303 → `/confirm-thanks/`. Runs against prod every 30 min via `smoke-test-prod.yml`, so the regression cannot silently re-ship.

---

## Done in v0.2 (this work pass)

Tracked here so a future session knows what's already shipped, what's behind it, and where to find each piece. Commits are on `main` past `3f6b931`:

### Image lightbox for persona panels
`24c51f4` — `SvgVisual.astro` wraps each inline SVG in a `<button>` and emits a sibling `<dialog>` at 90vw / 90vh. Tap (mobile) or click (desktop) opens; Esc / × / backdrop-click closes. Bilingual hint text. Verified across EN + ZH.

### Per-signer letter system (mode A + C)
- Schema (`ca2ae80`) — `letter_token` + `locale` columns + `public_letters` view, idempotent. `confirm-signature.ts` generates `letter_token` and copies `pending_locale` → `locale` on confirmation.
- SSR `/letters/[token]/` (`1e850b1`) — `@astrojs/netlify` v6 adapter, fetch via anon Supabase client, `LetterRender.astro` component with print stylesheet for PDF.
- Mode C `/mla/[id]/` + confirmed.astro letter URL surface (`41ab450`) — `MlaInbox.astro`, `MlaScorecard` "View constituent letters →" link.
- OG card (`68312a5`) — static `public/og/letter.{en,zh}.svg` + `og:image:width/height/type` + Twitter summary_large_image meta in `CampaignLayout`.

### Deploy automation
- Migration script + GH Actions workflow + `docs/DEPLOY.md` (`fe9e874`) — `scripts/apply-supabase-migration.sh` calls Supabase Management API; workflow fires on push to main when SQL changes.
- CI workflow (`6acdf6c`) — `astro check && astro build`, asserts 18 static pages emitted + SSR bundle present. Runs on every push.
- Smoke-test script + post-deploy GH Actions workflow (`6acdf6c`) — `tests/smoke-test.sh BASE_URL` walks ~35 URLs (static + SSR with garbage-token 404 expectations + redirect chain). Workflow fires after Netlify deploys + every 30 min via cron.

### Privacy hardening
- School-derived neighbourhood + transparency popover (`ea51a02`) — `schools.yaml` restructured to `{ name, neighbourhood }`, `ActionForm` shows derived neighbourhood inline + "?" dialog with full mapping. Backend in `_shared.ts:SCHOOL_NEIGHBOURHOODS`. Replaces postal-code-FSA neighbourhood derivation (V5B alone covers Capitol Hill / Brentwood / Burnaby Heights).
- Self-serve withdrawal (`e9d016d`) — `/api/withdraw` Function, `/withdraw/[token]/` two-step confirmation SSR page, `/withdrawn/` confirmation, `/withdraw-failed/` errors, EN+ZH each. LetterRender link. Privacy Q6 rewritten to point at the self-serve flow first.
- Manual deletion runbook (`8364540`) — `infrastructure/PRIVACY_DELETION_RUNBOOK.md` for cases where the user lost their letter URL (5 steps + SQL + Buttondown curl + reply template).

### Routing fixes
- SvgVisual Vite raw glob (`907cdf7`) — moved SVGs from `public/visuals/` to `src/data/visuals/`, switched to `import.meta.glob('?raw')`. Without this the SSR worker bundles broke `import.meta.url` paths.
- Postal code lowercase + auto-uppercase (`4f596f1`) — pattern accepts both cases, JS normalizes on input, CSS shows uppercase.
- Mailto deferred to `/confirm-thanks/` (`70253fd`) — earlier `window.open(mailto:)` from submit handler hijacked the form POST in browsers without an email handler. Now stashed in sessionStorage, rendered as a real `<a href="mailto:">` button on the next page.
- Trailing slashes everywhere (`c16b2a9`, `b489d44`) — `localizedUrl` slash-appends, `astro.config.mjs` `trailingSlash: 'always'`, netlify.toml explicit 301s. **Did not fully fix the active bug above.**
- Journey clicked-column color preservation (`3dd746e`) — removed `background: var(--cream) !important` from the highlight rule that was wiping cell colors.
- Build literal-narrowing fix (`65f9753`) — withdraw page `lang === 'zh'` narrowing error broke `astro check`.

---

## Smaller follow-ups (none blocking)

### A. PNG fallback for OG card (only if WeChat / Facebook previews matter)

Static SVG OG cards ship at `public/og/letter.{en,zh}.svg`. WeChat and Facebook are stricter about SVG `og:image` and may show no thumbnail. Export each SVG to PNG (`rsvg-convert in.svg -o out.png` or any vector editor) and replace the `.svg` URL in `letters/[token].astro` with `.png` if Chinese-share preview becomes priority.

### B. `letter.yaml` template tokens for the public-letter page

`LetterRender.astro` body is currently inline JSX (rather than templated from `letter.yaml`'s `body_template_en/zh`) because the yaml's body addresses the **Minister** while the public letter addresses the signer's **MLA**. Either add a separate `public_template_en/zh` field to `letter.yaml`, or accept the duplication. Fine for one campaign.

### C. IP anonymization scheduled job

`infrastructure/supabase-migrations.sql` documents the manual `UPDATE … SET ip_address=NULL, anonymized_at=NOW()` to run 90 days after campaign close. Not yet a `pg_cron` schedule. Add one before campaign anniversary in case Ben forgets.

### ~~D. Netlify Forms detection on a hybrid Astro deploy~~ — RESOLVED in v0.3

Migration to a custom `/api/submit` Function shipped (`a5f1a55`); see "Done in v0.3" above. Forms dashboard view is gone; Supabase is the source of truth. Smoke test + DB smoke + e2e cover the regression.

### E. ZH translation of the new EN founder bio

`6dbf6bb` rewrote `meta.yaml` `founder.bio.en` for the parent/MLA audience and added an Expeta Technologies hyperlink. `founder.bio.zh` and `founder.role.zh` still hold the old AI-alignment / cognitive-systems framing — flagged in the PR description, deferred to a separate translation pass. Same for `founder.role.zh`.

### F. Verify the two medium-confidence school neighbourhood corrections

Schools audit (9496b12) made 5 neighbourhood fixes. Three are high-confidence factual fixes (Inman → Garden Village, Maywood → Maywood, Burnaby North → Sperling-Duthie). Two are address-zone judgment calls that the audit agent flagged for human verification:
- Confederation Park: Capitol Hill → Burnaby Heights
- Alpha Secondary: Capitol Hill → Willingdon Heights

Both schools sit at boundary zones where catchment + colloquial usage diverge. If a Burnaby parent or PAC chair flags either as wrong, edit `schools.yaml` + mirror to `_shared.ts:SCHOOL_NEIGHBOURHOODS`.

### G. PAC modal e2e test

`tests/e2e/form-submit.spec.ts` covers signature flow only. PAC modal submission is HTTP-smoke-tested (`POST /api/submit?form-name=pac-endorsement` honeypot) but not Playwright-tested end-to-end (modal open → form fill → submit → /confirm-thanks/?form=pac copy swap → success). Adding it requires modal trigger + Turnstile bypass + form fill — not blocking for current campaign volume but worth doing if PAC submissions become a real fraud surface.

### H. PAC verify shortcut script

PAC submissions land in `pac_endorsements` with `status='pending'`. The admin notification email Ben gets includes a hand-typed UPDATE SQL snippet for verification. A `scripts/verify-pac-endorsement.sh "Capitol Hill Elementary"` shortcut would remove the copy-paste step. Optional polish — only worth doing if PAC volume grows past ~10/week.

---

## Reference for new sessions

- The riding-map work was the first major Astro integration; see commit history `git log --oneline | head` and `platform/src/components/RidingMap.astro` for the pattern (Vite-native JSON import, d3-geo planar identity projection, Supabase polling, source attribution footer).
- Civic-data-viz precedents researched and documented: choropleth dominates over 3D bars for 1D quantities (Wilke / Axis Maps / UK Parliament petition map). Apply same logic to any new visual.
- Repo follows civic-credibility tone — every public claim links to a citation. Match that tone in any new copy.
- **Always run `astro check && astro build` before push.** CI gates this now (`.github/workflows/ci.yml`), but local feedback is faster than waiting on GH Actions.
