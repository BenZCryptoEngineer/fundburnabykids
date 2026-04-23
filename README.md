# Burnaby Kids First — Coalition Platform

**Repo:** infrastructure for parent-led advocacy campaigns in Burnaby, BC.
**Founder:** Ben Zhou.
**First campaign:** [Fund Burnaby Kids](https://fundburnabykids.ca) — pressure BC Province to fully fund the $9.4M SD41 arbitration liability before 27 May 2026 budget adoption.

---

## What this is

An **agent-first coalition infrastructure platform**. Not a one-off website. Every recurring operation is achievable by an AI agent (Claude Code or Claude Desktop) reading the markdown playbooks in `agent-instructions/` and calling MCP tools — no web-UI-only steps.

The platform is four layers:

| Layer | What | Who builds it | Who operates it |
|---|---|---|---|
| 0 — Foundation | Accounts, API keys, PO Box, domains | Ben (manual, one-time) | — |
| 1 — Infrastructure | Supabase / Netlify / Buttondown / Porkbun, provisioned via MCP | Claude Code | Claude Code (changes), Claude Desktop (reads) |
| 2 — Instructions | `agent-instructions/` + `policies/` markdown | Claude Code | Any future agent |
| 3 — Campaigns | `campaigns/*.yaml` + Astro frontend | Claude Code | Ben + Claude Desktop |

---

## Directory map

```
docs/                  — Source briefing documents (PRD, bootstrap, foundation setup, ops guide)
policies/              — VOICE, COMPLIANCE, VISUAL_DESIGN (generated Phase 3)
agent-instructions/    — 9 operational playbooks for AI agents (generated Phase 3)
campaigns/             — Campaign content as YAML (one file per campaign)
platform/              — Astro frontend (generic, multi-campaign)
infrastructure/        — Supabase migrations, Netlify function source, IaC
netlify/functions/     — Deployed copies of Netlify Functions
scripts/               — Agent-runnable utilities (check-dns, verify-compliance, mail-tester)
updates-log/           — Append-only record of sent fortnightly updates
.claude/               — Claude Code MCP config (settings.json)
```

---

## Getting started

### If you're Ben (or a successor)

1. Read [`docs/FOUNDATION_SETUP.md`](docs/FOUNDATION_SETUP.md) — one-time manual work (accounts, keys, PO Box).
2. Copy `credentials.env.example` → `credentials.env`, fill in real secrets. (`credentials.env` is gitignored.)
3. Fill in `<<FILL_FROM_CREDENTIALS_ENV>>` placeholders in `.claude/settings.json` with the same values, then restart Claude Code.
4. In Claude Code: *"Continue bootstrap from the state in this git repo. Read `AGENT_ONBOARDING.md` first."*

### If you're an AI agent

Read [`AGENT_ONBOARDING.md`](AGENT_ONBOARDING.md) before anything else.

### If you're running the frontend locally

```bash
cd platform
npm install
npm run dev
```

---

## Architecture in one sentence

**Umbrella** (Burnaby Kids First, permanent) → **Campaign** (Fund Burnaby Kids, sharp + time-bound) → **Coalition endorsers** (PACs, ad-hoc legitimacy layer). Full discussion in `agent-instructions/ARCHITECTURE.md` (Phase 3).

---

## Operating rhythm

Once live, expected Ben-time: ~55 min/week. Breakdown in [`docs/CLAUDE_DESKTOP_OPERATIONS_GUIDE.md`](docs/CLAUDE_DESKTOP_OPERATIONS_GUIDE.md).

---

## License

Content: CC BY-SA 4.0. Code: MIT. See `LICENSE` (added before first public release).
