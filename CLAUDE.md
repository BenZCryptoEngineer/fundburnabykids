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
infrastructure/                 Supabase SQL migration + workflow docs
netlify/functions/              Netlify Functions: on-signature, confirm-signature
platform/                       Astro 5 site (TypeScript, content collections)
  src/components/               Astro islands
  src/data/                     Static data files imported at build time
  src/pages/                    en + /zh routes
  src/lib/i18n.ts               t() helper, Lang type, localizedUrl()
samples/                        Design-exploration prototypes (kept as reference)
docs/                           Bootstrap + ops docs
```

## Build, dev, deploy

| What | Command |
|---|---|
| Dev server (port 4321 or 4322) | `cd platform && npm run dev` |
| Type check + production build | `cd platform && npm run build` |
| Astro check only | `cd platform && npx astro check` |
| Supabase migration (live) | apply via Management API w/ `SUPABASE_PAT` |
| Production deploy | `git push origin HEAD:main` (Netlify auto-builds) |

`credentials.env` at repo root (gitignored) has every key — `source credentials.env` before any script that needs Supabase / Resend / Netlify / Turnstile / Cloudflare / Buttondown access.

## Key architectural notes

- **Astro 5 content collections** are configured in `platform/src/content.config.ts`. The collection is named `campaign` and loads `*.yaml` from `../campaigns/fund-burnaby-kids/`. Look up entries via `getEntry('campaign', '<filename-without-extension>')`. The `meta.yaml` file uses `slug: fund-burnaby-kids` as its entry id (overrides filename).
- **Bilingual strings** follow `{ en: '...', zh: '...' }` pattern. Render via `<I18nText en="..." zh="..." lang={lang} />` or `t({ en, zh }, lang)`.
- **Signatures** flow: form post → `on-signature.ts` → DB insert (`pending_*` columns) → Resend confirmation email → user clicks link → `confirm-signature.ts` flips `confirmed=TRUE`, NULLs `pending_email`. Email never persists past confirmation.
- **Riding map** joins on `riding_id` (Elections BC `ED_ABBREVIATION`: BNC/BNE/BNN/BNO/BNS). The `RIDING_BY_FSA` table in `netlify/functions/_shared.ts` derives `riding_id` from postal code at submission.
- **Vite native imports** for static assets (`import x from '~/data/foo.json'`) — do NOT use `fs.readFileSync(import.meta.url + ...)` because it breaks in production where the bundled component sits in `dist/chunks/`.

## Pending work

Active TODOs live in `TODO.md` at repo root. Each item is written to be cold-pickup-able by a future session — don't ask the user to re-explain.

## When committing

- Single coherent feature per commit, message body explains *why* and links to evidence (URLs, file paths, decisions).
- Co-author trailer: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
- This worktree branch (`claude/<random>`) is configured to push to `origin/main` directly. Use `git push origin HEAD:main`.
