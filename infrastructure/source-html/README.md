# Source HTML — Pre-Rewrite Reference

**Status:** Archival. Do not edit.

This directory holds the original single-file HTML source for the Fund Burnaby Kids campaign as it existed before the Phase 5 Astro rewrite. The files are kept under version control to preserve:

- Strategic content decisions encoded in the markup (persona system, three facts, four SVG visualizations, MLA scorecard, PAC kit, dual-language structure)
- Pre-rewrite design tokens, copy, and bilingual parity
- An auditable reference if a future maintainer wants to compare the rewrite to the original intent

## Files

| File | Size | Purpose |
|---|---|---|
| `fundburnabykids_index.html` | ~178 KB | Main campaign landing page. Single self-contained file with inline CSS, inline SVGs, inline JS, and bilingual EN/ZH content. Source for the Astro rewrite in `platform/`. |
| `PAC_Endorsement_Kit_Printable.html` | ~25 KB | Printable PAC endorsement kit. Two-page Letter format with print-specific CSS. Source for the printable version of the PAC kit modal. |

## Policy

1. **Do not edit these files.** Once Phase 5 has consumed them into Astro components and `campaigns/fund-burnaby-kids/*.yaml` data files, all content changes happen in the rewrite layer.

2. **Do not link to these files at runtime.** They are not part of the deployed site. They exist for git history and human reference only.

3. **Do not delete them.** The git commit message and history reference these as the canonical pre-rewrite source. Removing them later would break that audit trail.

4. **If the campaign content changes substantively** (new fact, new MLA, revised visualization), update the YAML in `campaigns/fund-burnaby-kids/` and the corresponding Astro component in `platform/src/`. These HTML files stay frozen.

## Phase 5 extraction map

When Phase 5 builds the Astro frontend, the following content is extracted from `fundburnabykids_index.html`:

| HTML location | Phase 5 destination |
|---|---|
| `:root` CSS variables | `platform/src/styles/tokens.css` |
| `SERVICES` JS constant (10 services × 13 grades) | `campaigns/fund-burnaby-kids/journey.yaml` |
| `PERSONAS` JS constant | `campaigns/fund-burnaby-kids/personas.yaml` |
| `MLA_EMAILS` + `TO_EMAIL` arrays | `campaigns/fund-burnaby-kids/letter.yaml` (recipients section) |
| Mailto body builder (`buildEmail`) | `campaigns/fund-burnaby-kids/letter.yaml` (template section) |
| MLA scorecard rows (HTML hardcoded) | `campaigns/fund-burnaby-kids/mlas.yaml` |
| Three facts (inline HTML) | `campaigns/fund-burnaby-kids/facts.yaml` |
| FAQ (`<details>` blocks) | `campaigns/fund-burnaby-kids/faq.yaml` |
| School `<select>` options | `campaigns/fund-burnaby-kids/schools.yaml` |
| `POSTAL_NEIGHBOURHOODS` map | `netlify/functions/_shared.ts` (already extracted in Phase 4A) |
| Four SVG visualization constants (`SVG_*_EN`, `SVG_*_ZH`) | `platform/public/visuals/{key}.{en,zh}.svg` |
| PAC kit modal content | `campaigns/fund-burnaby-kids/pac-kit.yaml` (drives both modal and printable page) |

The PAC printable kit (`PAC_Endorsement_Kit_Printable.html`) becomes a single Astro page (`platform/src/pages/pac-kit/index.astro`) that renders from the same `pac-kit.yaml`. The modal and the printable page share their content source.

## Why preserve as a single archive

The original HTML works. It contains months of strategic decisions baked into the markup. If at any point the Astro rewrite drifts from the strategic intent, this file is the source of truth to resolve the disagreement. It is the closest thing the project has to a design document beyond the PRD.
