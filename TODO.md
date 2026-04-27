# TODO — Fund Burnaby Kids

Active deferred work. Each item is self-contained — a fresh session can pick any one up without re-asking the user.

---

## ✅ Done (this branch)

- **Image lightbox for persona panels** — `SvgVisual.astro` now wraps each
  inline SVG in a `<button>` and emits a sibling `<dialog>` at 90vw / 90vh.
  Tap (mobile) or click (desktop) opens; Esc / × / backdrop-click closes.
  Bilingual hint text. Verified across EN + ZH.
- **Per-signer letter system (mode A + C)** — schema, function, and UI all
  shipped. See files referenced in the v0.2 commit chain
  (`feat(signatures)…`, `feat(letters)…`).

---

## Outstanding follow-ups for the letter system

### 1. Apply the v0.2 Supabase migration to production

`infrastructure/supabase-migrations.sql` adds the new `locale` and
`letter_token` columns + the `public_letters` view, all with idempotent
DROP-then-ADD for constraints. **Until applied, every confirmation will
fail** because `confirm-signature.ts` writes to columns that don't yet
exist.

Apply via Supabase Management API with `SUPABASE_PAT` (per CLAUDE.md
"Build, dev, deploy" table):

```bash
source credentials.env
# Apply only the v0.2 ALTER block + the new public_letters view, OR just
# re-run the whole file (idempotent). Re-running is safe.
```

### 2. PNG fallback for the OG card (only if WeChat / Facebook previews matter)

Static SVG OG cards now ship at `public/og/letter.{en,zh}.svg` (1200×630,
brand colour) and the letter pages set `ogImage` to the absolute URL.
`CampaignLayout` emits `og:image:width/height/type` + `twitter:card:
summary_large_image`, so LinkedIn / Twitter / Slack / Discord / iMessage
all preview correctly.

**Open question**: WeChat and Facebook are stricter about SVG `og:image`
and may show no thumbnail. If WeChat previews are mission-critical for
the Chinese-language share path, export each SVG to PNG via
`rsvg-convert` or any vector editor and replace the `.svg` URL in
`platform/src/pages/{letters,zh/letters}/[token].astro` with the `.png`.
The card design itself is intentionally signer-agnostic so one PNG per
locale serves every letter.

### 3. `letter.yaml` template tokens for the public-letter page

The body in `LetterRender.astro` is currently hardcoded inline (rather
than templated from `letter.yaml`'s `body_template_en/zh`) because the
yaml's body addresses the **Minister** (the outbound email destination)
while the public letter addresses the signer's **MLA**.

Either (a) add a separate `public_template_en/zh` field to `letter.yaml`
with the MLA-addressed body and `{FIRST_INITIAL}`/`{NEIGHBOURHOOD}`
placeholders, or (b) keep the inline JSX and accept the small
duplication. (b) is fine for one campaign; revisit if a second campaign
spins up.

### 4. Verify `cp -r platform/.netlify .` works in Netlify CI

`netlify.toml`'s build command appends a copy step so the adapter's
`platform/.netlify/v1/functions/ssr/` lands at the repo-root
`.netlify/v1/functions/ssr/` Netlify expects. Verified locally with
`astro build` but NOT in a real Netlify deploy. First deploy after the
adapter commit should be smoke-tested:

- Visit `/letters/<some-confirmed-token>` — expect rendered letter card.
- Visit `/mla/kang` — expect inbox or empty-state.
- Visit `/` (static) — expect home page unchanged.

If the SSR function isn't picked up, see Astro's @astrojs/netlify v6
docs for the alternative invocation path or check whether the deploy
log mentions the v1 function bundle.

---

## Reference for new sessions

- The riding-map work is the most recent integration; see commit history
  `git log --oneline | head` and `platform/src/components/RidingMap.astro`
  for the pattern (Vite-native JSON import, d3-geo planar identity
  projection, Supabase polling, source attribution footer).
- Civic-data-viz precedents researched and documented: choropleth dominates
  over 3D bars for 1D quantities (Wilke / Axis Maps / UK Parliament
  petition map). Apply same logic to any new visual.
- Repo follows civic-credibility tone — every public claim links to a
  citation. Match that tone in any new copy.
