# Claude Code Bootstrap Prompt — Agent-First Infrastructure

**Purpose:** This prompt is what you paste into Claude Code as your *first message* in a new empty directory (e.g. `~/projects/burnabykidsfirst-coalition/`). It instructs Claude Code to build not just a website, but the complete agent-operable infrastructure platform.

**Prerequisites:**
- `FOUNDATION_SETUP.md` fully completed (all 12 verification items green)
- `~/.coalition/credentials.env` exists and populated
- These files available to drag into the session:
  - `PRD.md`
  - `fundburnabykids_index.html`
  - `AGENT_INSTRUCTIONS_CORE.md` (from this package)
  - `FOUNDATION_SETUP.md` (for context)

**Claude Code MCP setup before starting (add to `~/.claude/settings.json`):**

```json
{
  "mcpServers": {
    "porkbun": {
      "command": "uvx",
      "args": ["porkbun-mcp", "--get-muddy"],
      "env": {
        "PORKBUN_API_KEY": "pk1_...",
        "PORKBUN_SECRET_KEY": "sk1_..."
      }
    },
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase@latest", "--access-token", "sbp_..."]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "github_pat_..."
      }
    }
  }
}
```

---

## The prompt

```
I'm Ben Zhou, a Burnaby parent. I'm building infrastructure for a parent-led
advocacy coalition called Burnaby Kids First. Its first campaign — Fund 
Burnaby Kids — is time-sensitive; the BC Province needs to fund a $9.4M 
arbitration liability before May 27, 2026.

But this task is bigger than deploying one campaign. You are building a 
COALITION INFRASTRUCTURE PLATFORM that:
  (a) deploys the Fund Burnaby Kids campaign as its first output
  (b) supports future campaigns under the Burnaby Kids First umbrella
  (c) is designed to be operated by AI agents (you for deployment; Claude 
      Desktop for day-to-day operations)
  (d) requires minimal manual human intervention after setup

Attached:
  - PRD.md  — website spec (authoritative for UI/content)
  - fundburnabykids_index.html       — existing frontend (~178KB, 95% complete)
  - AGENT_INSTRUCTIONS_CORE.md       — template for agent instruction modules
  - FOUNDATION_SETUP.md              — what I've already done manually

Credentials are in ~/.coalition/credentials.env (you can read this file).
MCP servers for Porkbun, Supabase, and GitHub are already configured for 
your session.

## Your task

Build a production-ready coalition infrastructure platform. The architecture 
is four layers:

  Layer 0: Foundation — already done by me (accounts, API keys, PO Box)
  Layer 1: Agent-operable infrastructure — what YOU build via MCP
  Layer 2: Agent instruction library — documents that tell future agents 
           how to operate the platform
  Layer 3: Campaigns — the Fund Burnaby Kids campaign as the first deployable

You are building Layers 1, 2, and deploying the first campaign.

## Guiding principles

1. **Agent-first design.** Every infrastructure operation must be achievable 
   by an agent reading agent-instructions/ and calling MCP tools. If 
   something can only be done via a web UI, it's a design failure — find 
   an API path.

2. **Declarative, not imperative.** Campaign content is structured data 
   (YAML in campaigns/). Agent instructions are markdown. Code is for 
   orchestration only.

3. **Safety through separation.** Credentials in ~/.coalition/. Secrets 
   in Netlify env vars. Public display data in Supabase (RLS-protected). 
   PII in Buttondown. Never mix these layers.

4. **Human judgment stays human.** PAC endorsement verification, MLA 
   scorecard updates, content review — these require judgment. Agents 
   flag these to me via email or Slack; they don't autonomously decide.

5. **Reversibility.** Every infrastructure action should be undoable. Track 
   changes in git. Keep migrations idempotent. Don't delete — archive.

6. **Preserve the existing HTML.** The frontend encodes months of strategic 
   decisions (three-layer brand, persona cards, pure-language SVG variants, 
   PAC Endorsement Kit modal). Only make the changes called out in PRD 
   section 9. In particular: do NOT merge the _EN and _ZH SVG constants 
   back together; they are intentionally separate.

## Phased execution plan

Follow in order. Each phase ends with an approval gate.

### Phase 1 — Summarize and confirm (before any code)

Read all 4 attached files end to end. Read ~/.coalition/credentials.env. 
Then produce:

1. A 5-sentence summary of what you understand the platform to be
2. A list of ambiguities or missing information you need from me
3. Your proposed repository structure (folder tree only, no contents)
4. Your identification of which Layer 2 instruction documents need to exist

STOP. Wait for my approval before Phase 2.

### Phase 2 — Repository skeleton

Create the full directory structure for burnabykidsfirst-coalition/. This 
includes:

  ├── agent-instructions/     # Layer 2 — how agents operate the platform
  ├── campaigns/              # Campaign content as YAML (fund-burnaby-kids.yaml)
  ├── infrastructure/         # IaC: Supabase migrations, Netlify config
  ├── platform/               # The website template + shared components
  ├── policies/               # VOICE.md, COMPLIANCE.md, VISUAL_DESIGN.md
  ├── scripts/                # Utility scripts (check-dns, verify-compliance)
  ├── .github/                # GitHub Actions if any
  ├── DOMAINS.md              # Registered domains + DNS state
  ├── README.md               # Entry point for humans
  ├── AGENT_ONBOARDING.md     # Entry point for AI agents joining the repo
  └── .gitignore              # Rigorous: never commit credentials.env or .env

Write initial content for:
  - README.md (1 page — what this is, how to use)
  - AGENT_ONBOARDING.md (what any agent should read before operating)
  - .gitignore (comprehensive)
  - DOMAINS.md (reflecting domains I registered in FOUNDATION_SETUP.md)

Show me file tree + diffs. STOP. Wait for approval.

### Phase 3 — Layer 2: Agent instructions

Using AGENT_INSTRUCTIONS_CORE.md as template, generate the full set of 
instruction modules. These are markdown files that future agents read 
before performing operations. Produce:

  policies/
    - VOICE.md                # My writing DNA (I'll augment after you draft)
    - COMPLIANCE.md           # CASL, PIPA, non-partisan requirements  
    - VISUAL_DESIGN.md        # Design tokens, color meaning, SVG rules

  agent-instructions/
    - ARCHITECTURE.md         # Three-layer brand philosophy (umbrella/campaign/coalition)
    - DEPLOY_CAMPAIGN.md      # Deploy new campaign to a subdomain
    - UPDATE_SCORECARD.md     # Update MLA status based on public responses
    - SEND_UPDATE.md          # Fortnightly Buttondown update protocol
    - CREATE_CAMPAIGN.md      # Master Prompt: create new campaign YAML from natural-language brief
    - VERIFY_PAC.md           # PAC endorsement verification workflow
    - RESPOND_TO_INQUIRY.md   # Incoming media / parent email protocol
    - MONITOR_HEALTH.md       # Weekly platform health checks
    - EMERGENCY.md            # Diagnostic tree when things break

For each module, write the full content based on the context from PRD + 
HTML + my CORE template. Make them genuinely useful operational docs, 
not placeholders. 

Show me each module as you write it. STOP for approval at 3, 6, and 9.

### Phase 4 — Layer 1: Infrastructure provisioning

Using MCP servers, provision infrastructure:

  a. Via Supabase MCP:
     - Create tables: signatures, pac_endorsements (per PRD §7)
     - Create view: public_pac_endorsements
     - Configure RLS policies
     - Run acceptance test (insert, verify anon can read, verify anon cannot write)
     - Report results to me

  b. Via GitHub MCP:
     - Create repo: burnabykidsfirst-coalition (private initially)
     - Push current repo state
     - Set up branch protection on main

  c. Via Netlify REST API (fetch tool):
     - Create site: burnabykidsfirst-platform
     - Link to GitHub repo
     - Configure environment variables (pull from credentials.env)
     - Set up Forms
     - Configure outgoing webhook to our on-signature function

  d. Via Porkbun MCP:
     - Add DNS records for fundburnabykids.ca pointing to Netlify
     - Add DKIM/SPF/DMARC records (from credentials.env Buttondown values)
     - Add ImprovMX MX records
     - Set up burnabykidsfirst.ca as 302 redirect to fundburnabykids.ca

  e. Via Buttondown REST API (fetch tool):
     - Configure welcome email template
     - Enable double opt-in
     - Verify sender domain

Show me verification at each step. STOP between (a), (b), and (c-d-e).

### Phase 5 — First campaign: Fund Burnaby Kids

Deploy the existing HTML as the first campaign:

  a. Copy fundburnabykids_index.html → platform/campaigns/fund-burnaby-kids/index.html
  b. Create campaigns/fund-burnaby-kids.yaml with all campaign metadata 
     extracted from the HTML (headline, deadlines, MLAs, facts, visuals)
  c. Make the frontend modifications in PRD §9:
     - Add Netlify form attributes
     - Replace localStorage with Supabase REST calls
     - Replace {{MAILING_ADDRESS}} with real PO Box
     - Create privacy.html with real address
  d. Deploy to Netlify
  e. Run the full launch checklist from PRD §13 — every item
  f. Report results to me

Show me each diff. STOP for approval before deploying.

### Phase 6 — Operations handoff documentation

Generate:

  - OPERATIONS.md — what I do weekly (see `agent-instructions/MONITOR_HEALTH.md`,
    `SEND_UPDATE.md`, `VERIFY_PAC.md` as the authoritative sources; 
    OPERATIONS.md is a human-friendly index)
  - AGENT_OPERATIONS_MANUAL.md — how Claude Desktop uses this platform 
    for day-to-day tasks, with example prompts
  - DEPLOY_NEXT_CAMPAIGN.md — step-by-step for when I want to launch the 
    second campaign (e.g. school safety, class sizes)
  - DISASTER_RECOVERY.md — how to rebuild if Supabase/Netlify/Buttondown 
    goes down

Commit everything. Push to GitHub. Notify me the platform is live.

## What you must NOT do

- Do not skip Phase 1 "summarize and confirm". If you propose starting 
  with code, I will reject.
- Do not change existing HTML copy, persona content, SVG visualizations, 
  or design tokens without asking
- Do not merge _EN and _ZH SVG variants — they are separated on purpose
- Do not build out-of-scope features: anything not explicitly in PRD §§3-13, 
  including analytics beyond Netlify native, user accounts, admin UI, 
  automated email sending, CMS systems. If unsure, ask.
- Do not commit credentials.env, .env, or any file with secrets
- Do not push to a public repo until I say so
- Do not send real emails to real subscribers until DKIM/SPF/DMARC pass 
  mail-tester.com ≥9/10
- Do not assume anything. If PRD or agent instructions are ambiguous, 
  ask me. I'd rather answer 20 questions than fix 20 wrong assumptions.

## Your first response

Your first response to this message must be exactly:
1. A 5-sentence summary of what you understand the platform to be
2. A list of ambiguities or missing information (be honest — say if 
   something's unclear)
3. Your proposed repository structure (folder tree only)
4. Your identification of Layer 2 instruction documents that should exist
5. Three questions for me to answer before you begin Phase 2

Nothing else. No code yet. Go.
```

---

## Post-prompt notes for Ben

### What Claude Code will produce

Total output across all phases:
- ~15-20 markdown files (agent instructions, policies, READMEs)
- ~5-8 YAML/SQL/TS files (campaign data, migrations, Netlify function)
- Deployed live site at `fundburnabykids.ca`
- Supabase tables with verified RLS
- Buttondown configured and verified
- GitHub repo with all of the above

### Estimated time investment

| Who | Time |
|---|---|
| You (Foundation, you already did) | 2-3 hrs |
| Claude Code (Phase 1-6) | 4-6 hrs of actual work, stretched over multiple sessions |
| You (reviewing, answering questions) | 1-2 hrs across the sessions |
| **Total to first launch** | ~8-10 hrs |

### How to handle Claude Code getting stuck

**If it proposes going out of scope:**
> "Re-read PRD §§3-13 and the 'must NOT do' list in the bootstrap prompt. 
> Stay on the critical path."

**If it's unsure about copy/design:**
> "Don't change it. The HTML is spec, not suggestion. Ask me if in doubt."

**If a deployment step errors:**
> "Show me the full error, propose 3 possible causes, and a minimal test 
> for each. Don't 'try things.'"

**If it wants to 'improve' the architecture:**
> "The architecture is fixed. Layer 0 is done. You are building Layer 1 
> and 2 exactly as scoped. Propose improvements as notes for Phase 2 
> work, not as changes to current scope."

### Session management

Don't do Phase 1-6 in one session. Suggested breaks:

- **Session 1**: Phase 1-2 (planning + skeleton). End with git initialized.
- **Session 2**: Phase 3 (agent instructions). The meaty docs. End when 
  9 instruction files exist.
- **Session 3**: Phase 4 (infrastructure). Supabase + Netlify + DNS. 
  End when acceptance tests all green.
- **Session 4**: Phase 5-6 (campaign + handoff). End when site is live 
  and you've smoke-tested with 5 friends.

Between sessions, Claude Code persists context via git. Starting a new 
session, just say: `"Continue bootstrap from the state in this git repo. 
Read AGENT_ONBOARDING.md first."`

### After deployment: switching to Claude Desktop

Once the platform is live, day-to-day operations move to Claude Desktop 
(see `CLAUDE_DESKTOP_OPERATIONS_GUIDE.md`). Claude Code returns only when 
you need to:
- Deploy a new campaign (3rd+ campaign, once architecture is proven)
- Refactor the platform
- Fix a bug that can't be resolved via operation
- Add a new MCP server

Claude Desktop handles:
- Verifying PAC endorsements
- Updating MLA scorecard
- Drafting fortnightly updates
- Monitoring Supabase for anomalies
- Responding to parent inquiries

This division preserves each tool's strengths: Claude Code has filesystem 
and deep code context; Claude Desktop is great for judgment-heavy 
conversational operations.

Good luck. Build something that outlives any single campaign.
