# TODO — Fund Burnaby Kids

Active deferred work. Each item is self-contained — a fresh session can pick any one up without re-asking the user.

---

## 1. Image lightbox for persona panels (mobile)

**Problem.** The `PersonaSelector` cards open inline panels containing one or two SVG visualizations (Scale, Responsibility flow, Journey, etc., rendered via `SvgVisual.astro`). On desktop they're already small; on mobile they're unreadable.

**Goal.** Tap any visualization image → fullscreen modal at original SVG resolution with a close button.

**Implementation.**
- Reuse the native `<dialog>` pattern already used by `platform/src/components/PacKitModal.astro` (one `<dialog>` per page, JS toggles `showModal()` / `close()`).
- Wrap each `<SvgVisual>` invocation in a `<button class="visual-zoom">` with `data-visual-key="<key>"`.
- A single page-level `<dialog id="visual-lightbox">` holds the active SVG, swapped on open by reading the source SVG markup from a hidden cache or by re-importing.
- Close on: × button, click outside dialog, Escape (native dialog handles Esc).
- Backdrop: black 90% opacity. SVG max 90vw / 90vh, centered.
- Disable for `prefers-reduced-motion` only the open/close animation, not the feature itself.

**Files to touch.**
- `platform/src/components/SvgVisual.astro` — wrap output in clickable button (or add a sibling `<dialog>` template).
- `platform/src/components/PersonaSelector.astro` — already imports `SvgVisual`, no change needed if SvgVisual handles its own lightbox.
- New: a `<VisualLightbox>` component if you'd rather isolate the dialog logic.

**Acceptance.**
- Tap any visualization on desktop or mobile → opens lightbox.
- Image readable at native size (or at least 800px wide on a 375px viewport via CSS scaling).
- Verify on EN + ZH pages, in both desktop and mobile viewports.
- Verify with browser tooling (preview_screenshot or `mcp__Claude_in_Chrome`).

---

## 2. Per-signer letter system (mode A + C)

**Decision in conversation.** User confirmed "A+C" — each signer sees their own letter, and each MLA sees a feed of letters from their constituents. Email never displayed publicly (UK Parliament e-petition convention).

### Mode A — `/letters/[token]`

**Public URL per signer.** When `confirm-signature.ts` flips `confirmed=TRUE`, generate a `letter_token` (32-byte URL-safe random, distinct from `confirm_token`) and store it on the row.

The page renders:

```
[Verified ✓ badge]  Signed YYYY-MM-DD

Sarah C.
Westridge Elementary · Willingdon Heights · Burnaby Centre

Dear MLA Anne Kang,

[full letter template body, with first_name/last_initial/school/
 neighbourhood/riding/MLA-name interpolated]

— Sarah C., Westridge Elementary
   Constituent of Burnaby Centre
```

Shareable URL pattern: `https://fundburnabykids.ca/letters/<token>` (en) and `/zh/letters/<token>` (zh, locale chosen by signer at signup → `pending_locale` is already captured).

Add a "Share" button (copy link) and a generic OG-image / Twitter card so it previews on WeChat / WhatsApp / Twitter / Facebook.

After signing, `confirmed.astro` should display the user's letter URL with copy-to-clipboard (mode A's primary entry point).

### Mode C — `/mla/[mla-id]`

**Per-MLA letter inbox.** Browseable feed of confirmed-signature letters from that MLA's riding only. Joined via `signatures.riding_id = mlas.yaml entry's riding_id`.

```
MLA Anne Kang — Burnaby Centre

412 constituents from your riding have written:

  ▸ Sarah C., Westridge Elementary — 2026-04-27
    "My child attends Westridge Elementary in your riding..."
  ▸ Daniel L., Brentwood Elementary — 2026-04-27
    ...
```

Each entry links to the full `/letters/<token>` page. Paginate at 50/page. Sort newest-first.

This page is the artifact we hand-deliver to MLA constituency offices (PDF via browser print). The `MlaScorecard` cards on the homepage already exist; add a "View constituent letters →" link from each Burnaby MLA card to its `/mla/[id]` page.

### Schema additions

```sql
ALTER TABLE signatures
  ADD COLUMN IF NOT EXISTS letter_token TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_signatures_letter_token
  ON signatures (letter_token)
  WHERE letter_token IS NOT NULL;

DROP VIEW IF EXISTS public_letters;
CREATE VIEW public_letters AS
  SELECT
    letter_token,
    first_name,
    last_initial,
    school,
    neighbourhood,
    riding_id,
    signed_at,
    pending_locale -- preserved for letter rendering language
  FROM signatures
  WHERE confirmed = TRUE
    AND anonymized_at IS NULL
    AND letter_token IS NOT NULL
    AND petition_slug = 'fund-burnaby-kids'
  ORDER BY signed_at DESC;

GRANT SELECT ON public_letters TO anon, authenticated;
```

**Wait** — `pending_locale` is currently NULLed at confirmation (see `confirm-signature.ts`). Either:
1. Stop NULLing it, or
2. Move the locale to a non-pending column (`locale TEXT`).

Choose option 2 for clarity; `pending_*` is meant to be transient.

### Files to add / modify

- `platform/src/pages/letters/[token].astro` — dynamic route (SSR via Supabase fetch). Astro static-build + on-demand pre-render OR switch to hybrid mode for this route.
- `platform/src/pages/zh/letters/[token].astro` — same in Chinese.
- `platform/src/pages/mla/[id].astro` + `zh/mla/[id].astro` — per-MLA inbox.
- `platform/src/components/LetterCard.astro` — reusable letter renderer.
- `platform/src/pages/confirmed.astro` — surface the new letter URL on the post-confirm page.
- `netlify/functions/confirm-signature.ts` — generate `letter_token` (use `randomBytes(32).toString('base64url')`), persist; preserve locale as a long-lived column.
- `infrastructure/supabase-migrations.sql` — new column + view + index + GRANT.
- `campaigns/fund-burnaby-kids/letter.yaml` — already has the bilingual template body; ensure interpolation tokens (`{first_name}`, `{school}`, `{mla_name}`, etc.) cover everything the rendered letter shows.

### Privacy & integrity guardrails

- **Never display email** anywhere on `/letters/*` or `/mla/*`.
- The full surname stays private (only `last_initial` is public).
- `letter_token` is non-guessable but revocable: if a signer asks for removal, NULL the token (kept distinct from `anonymized_at` so the row stays counted in aggregates).
- The MLA page exposes only `confirmed = TRUE AND anonymized_at IS NULL` letters from `public_letters`.
- Add an `OG-image` rendering route or static placeholder to avoid an unverified link looking malicious in chat previews.

### Acceptance

- Sign a test signature → confirm → land on `/confirmed` → see your letter URL → open it → see your filled letter.
- Hand-deliverable: `/mla/kang` renders cleanly and prints to a 1-2 page PDF via browser print.
- 0 emails appear in the rendered HTML for either page (verify via `curl | grep @`).
- Cross-check both EN + ZH variants.
- Both pages SSR at build (or on-demand, with caching) — they should not depend on JS to render the letter content.

---

## Reference for new sessions

- The riding-map work is the most recent integration; see commit history `git log --oneline | head` and `platform/src/components/RidingMap.astro` for the pattern (Vite-native JSON import, d3-geo planar identity projection, Supabase polling, source attribution footer).
- Civic-data-viz precedents researched and documented: choropleth dominates over 3D bars for 1D quantities (Wilke / Axis Maps / UK Parliament petition map). Apply same logic to any new visual.
- Repo follows civic-credibility tone — every public claim links to a citation. Match that tone in any new copy.
