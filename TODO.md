# TODO — Fund Burnaby Kids

Active deferred work. Each item is self-contained — a fresh session can pick any one up without re-asking the user.

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

### D. Netlify Forms detection on a hybrid (static + SSR adapter) Astro deploy

The active bug above might point at a deeper compatibility issue between the `@astrojs/netlify` v6 adapter and Netlify Forms detection. If yes, the medium-term fix is either:
- Move the form to a `prerender = true` page that the SSR adapter doesn't touch (it already is — index is static, but verify),
- Or migrate signature submission to a custom Netlify Function bypassing Forms entirely (we'd lose the dashboard view of submissions but gain control over the routing).

---

## Reference for new sessions

- The riding-map work was the first major Astro integration; see commit history `git log --oneline | head` and `platform/src/components/RidingMap.astro` for the pattern (Vite-native JSON import, d3-geo planar identity projection, Supabase polling, source attribution footer).
- Civic-data-viz precedents researched and documented: choropleth dominates over 3D bars for 1D quantities (Wilke / Axis Maps / UK Parliament petition map). Apply same logic to any new visual.
- Repo follows civic-credibility tone — every public claim links to a citation. Match that tone in any new copy.
- **Always run `astro check && astro build` before push.** CI gates this now (`.github/workflows/ci.yml`), but local feedback is faster than waiting on GH Actions.
