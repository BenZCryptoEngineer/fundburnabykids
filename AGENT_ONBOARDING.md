# Agent Onboarding

**You are an AI agent about to operate the Burnaby Kids First coalition platform. Read this file end-to-end before taking any action.**

---

## 1. What this repo is

A coalition infrastructure platform. See [`README.md`](README.md) for the high-level shape and [`docs/PRD.md`](docs/PRD.md) for the first campaign's spec.

You are likely here because Ben Zhou asked you to do one of:

- Deploy or modify infrastructure (Claude Code)
- Verify a PAC endorsement (Claude Desktop)
- Update the MLA scorecard (Claude Desktop)
- Draft a fortnightly update (Claude Desktop)
- Respond to an inquiry (Claude Desktop)
- Investigate something broken (either)

---

## 2. Before any substantive action, read the matching playbook

| If Ben asks you to…                         | Read first                                                  |
|---------------------------------------------|-------------------------------------------------------------|
| Verify a pending PAC endorsement            | `agent-instructions/VERIFY_PAC.md`                           |
| Update the MLA scorecard                    | `agent-instructions/UPDATE_SCORECARD.md`                     |
| Draft this week's update                    | `agent-instructions/SEND_UPDATE.md` + `policies/VOICE.md`    |
| Check platform health                       | `agent-instructions/MONITOR_HEALTH.md`                       |
| Reply to a media / parent / policy email    | `agent-instructions/RESPOND_TO_INQUIRY.md` + `policies/VOICE.md` |
| Create a new campaign                       | `agent-instructions/CREATE_CAMPAIGN.md` + `agent-instructions/ARCHITECTURE.md` |
| Deploy a new campaign                       | `agent-instructions/DEPLOY_CAMPAIGN.md`                      |
| Diagnose a failure                          | `agent-instructions/EMERGENCY.md`                            |

(These modules are generated in Phase 3. If they don't exist yet, read `docs/AGENT_INSTRUCTIONS_CORE.md` for the template and say so to Ben.)

---

## 3. Always read the policies before acting

- [`policies/VOICE.md`](policies/VOICE.md) — Ben's writing DNA. Read before generating any content (emails, replies, updates, copy).
- [`policies/COMPLIANCE.md`](policies/COMPLIANCE.md) — CASL, PIPA, non-partisan rules. Read before any data or email action.
- [`policies/VISUAL_DESIGN.md`](policies/VISUAL_DESIGN.md) — design tokens, color semantics, EN/ZH SVG separation rule.

Policies override preferences. If a request conflicts with a policy, flag the conflict and refuse until Ben resolves it.

---

## 4. Never do these things autonomously

- **Modify production Supabase** — always show the query/diff and wait for explicit approval on the specific operation.
- **Send real email to real subscribers** — always draft → show Ben → wait → send.
- **Push to `main`** — always PR.
- **Merge EN and ZH SVG variants** — they are intentionally separated. See `policies/VISUAL_DESIGN.md`.
- **Decide an MLA scorecard status category** (awaiting / acknowledged / committed / opposed) — that's Ben's call. You propose based on evidence.
- **Verify a PAC endorsement** — you draft the verification email; Ben sends and judges the reply.
- **Respond to a media inquiry directly** — always draft → show → wait.
- **Rotate or issue credentials** — Ben does foundation work manually.

---

## 5. Credentials

All live in `credentials.env` at the repo root. This file is **gitignored**. Template: [`credentials.env.example`](credentials.env.example).

Rules:

- Read `credentials.env` directly via filesystem; do not echo secrets back into conversation.
- Never commit real values. Never paste them into chat visibly.
- If a secret appears to be leaked (in logs, commits, browser history), stop and alert Ben; see `agent-instructions/EMERGENCY.md` Level 4.
- MCP server config in `.claude/settings.json` uses the same values via placeholders — update both files together if a key rotates.

---

## 6. When uncertain, ask

Ben prefers **20 questions over 20 wrong assumptions**. If the PRD is ambiguous, if a policy is silent, if the playbook doesn't cover your case — stop and ask. Don't improvise core operations.

---

## 7. When the playbook is missing

If a task doesn't match any existing instruction module:

1. Say so to Ben.
2. Propose that this become a new instruction module.
3. Draft the procedure conversationally with Ben.
4. Once confirmed, Claude Code writes the new module using the universal structure in `docs/AGENT_INSTRUCTIONS_CORE.md`.

This is how the institutional memory grows.

---

## 8. Logging

- Sent updates: append to `updates-log/YYYY-MM-DD-slug.md`.
- Significant infrastructure changes: commit with a clear message; leave notes in PR body.
- PAC verification outcomes: written into `pac_endorsements.notes` column in Supabase.
- No separate audit log — git history + Supabase + Buttondown are the audit trail.

---

## 9. Tone with Ben

- Brief. Lead with the answer.
- Honest pushback is welcomed. If a request is ill-conceived, say so.
- "I don't know" + a proposed path to find out > fake certainty.
- If Ben writes in Chinese, reply in Chinese. If English, English. Don't translate unprompted.
