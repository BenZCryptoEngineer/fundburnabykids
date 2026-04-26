# Agent Instructions Core — Template Package

**Purpose:** This file is a template package that Claude Code reads to understand how to generate the full set of Layer 2 agent instruction modules. Think of it as "documentation about how to write documentation."

**Who reads this:** Claude Code during Phase 3 of the bootstrap prompt.

**Not to be confused with:** The actual agent instructions, which Claude Code will generate in `agent-instructions/` and `policies/` folders in your repo.

---

## What agent instructions are, conceptually

Layer 2 instruction modules are **operational playbooks** written for future AI agents (primarily Claude Desktop with MCP tools) to execute coalition operations correctly.

They are markdown documents that:

- Describe a specific recurring task (verify a PAC, update scorecard, etc.)
- Tell the agent exactly what to read first (context)
- Tell the agent exactly what tools to use (Supabase MCP, fetch, filesystem)
- Give step-by-step procedure
- Show example inputs and expected outputs
- Flag where human judgment is required
- Specify safety constraints and compliance requirements

**They are not:**
- Tutorials for humans (those go in `README.md` or `OPERATIONS.md`)
- Code documentation
- Campaign content
- Design specs

---

## Universal structure for every instruction module

Every module in `agent-instructions/` must have this structure:

```markdown
# [TITLE] — Instruction Module

**For:** AI agents (Claude Desktop, future operators) performing [task] on behalf of Burnaby Kids First coalition operations.

**Trigger:** When Ben says [example phrasings]

**Reads first:**
- `policies/VOICE.md` (if task involves writing)
- `policies/COMPLIANCE.md` (if task involves data or email)
- [Other specific modules if task chains to them]

**Tools used:**
- [MCP server or API]
- [Another if needed]

---

## Pre-action checklist

Before taking any action, verify:
- [ ] [Specific precondition 1]
- [ ] [Specific precondition 2]
- [ ] [Specific precondition 3]

If any fails, stop and flag to Ben.

---

## Procedure

Step 1: [Read-state step, usually]
  [Specific MCP query or file to read]

Step 2: [Analysis step]
  [What the agent evaluates]

Step 3: [Draft step]
  [What the agent produces]

Step 4: [Approval gate]
  [What the agent shows Ben]

Step 5: [Action step, after approval]
  [What the agent actually executes]

Step 6: [Verification step]
  [What the agent confirms happened]

---

## Human judgment required

The following decisions in this task are NEVER made autonomously by the agent:

- [Specific decision 1]
- [Specific decision 2]

The agent drafts, flags, or proposes — Ben approves.

---

## Compliance notes

[Any CASL, PIPA, non-partisan requirements specific to this task]

---

## Common failure modes

- [Failure case 1 + how to respond]
- [Failure case 2 + how to respond]

---

## Example session

[A concrete conversation between Ben and the agent doing this task, 
from trigger to completion]
```

---

## The three policy documents (under `policies/`)

These are cross-cutting. Every instruction module references at least one of them.

### `policies/VOICE.md`

Contains Ben's writing DNA. Agents read this before generating any content (emails, updates, replies).

Should include:

- Core principles (diagnostic > metaphysical, adversarial courtesy, structural isomorphism, restraint at peak, end with reader's work unfinished)
- 止觀寫作技法 principles for Chinese content (止 as paragraph breaks, 觀內呼吸 as micro-breaths, 不確定性三門 as 菩薩方便門, 斷言密度 ≤ 1.0/kw, 指月不說法)
- Anti-patterns: what NOT to sound like (generic AI register, "I'd be happy to help", em-dash overuse, positive-framing padding, false confidence)
- Concrete rewrites: "good faith" → "Genuinely"; "I hear" → "I get"; "positing" → "putting"
- Six-expert review gate for high-stakes content (behavioural scientist, social psychologist, comms scholar, X marketing lead, X algorithm specialist, Mahayana Buddhist master) — 9.0/10 threshold

**Ben's note to Claude Code:** Draft this based on context clues from PRD and existing HTML (Ben's byline, FAQ answers, etc.). Ben will augment with his own pre-written docs after your draft.

### `policies/COMPLIANCE.md`

CASL + PIPA + non-partisan requirements. Agents read this before any data or email action.

Should include:

- CASL: physical address + unsubscribe link required in every marketing email; implied vs express consent
- PIPA: what PII can be collected, where it can be stored (Canadian region), deletion rights, 7-day response
- Non-partisan rule: never name political parties, never attribute intent, only verifiable facts, MLAs referenced by riding regardless of party
- Storage separation principles (public display → Supabase; PII → Buttondown; audit → Netlify 30-day)
- Never-do list (sell data, share with parties, retain beyond need)

### `policies/VISUAL_DESIGN.md`

Design tokens, color meanings, SVG rules. Agents read this when generating or modifying visualizations or layouts.

Should include:

- Design tokens (CSS variables, fonts, spacing)
- Color semantics (blue = neutral/structural; orange = problem/urgency; grey = confirmed/past)
- Bilingual rule: separate _EN and _ZH SVG variants always; never merge
- Low-decoding-budget principle (3 seconds per visual)
- Persona-visual mapping (Parent = Cascade + Scale; PAC = Scale + Responsibility; Trustee = Money + Responsibility)
- Three-layer brand: campaign sharp, umbrella peripheral, coalition ad-hoc

---

## The nine instruction modules (under `agent-instructions/`)

Claude Code generates these during Phase 3. Below are the skeleton + key guidance for each.

### 1. `ARCHITECTURE.md`

Explains the three-layer brand model and when agents should use which name. Critical for any agent writing public-facing content.

**Must include:**
- Umbrella (Burnaby Kids First) → permanent background entity, always present in footer/about
- Campaign (Fund Burnaby Kids) → sharp current fight, primary header brand
- Coalition partners (PAC endorsers) → ad-hoc legitimacy layer
- When to use which voice: umbrella for long-term welcome emails, campaign for urgent CTAs, coalition for PAC-facing
- Don't: conflate them; let umbrella dominate; promote campaign after it ends

### 2. `DEPLOY_CAMPAIGN.md`

How to deploy a new campaign under Burnaby Kids First umbrella. This is Claude Code's job, not Claude Desktop's.

**Must include:**
- Precondition: umbrella platform already deployed
- Generate new campaign YAML via `CREATE_CAMPAIGN.md` first
- Create new subdomain (e.g. `crosswalks.burnabykidsfirst.ca`)
- Copy platform template, inject campaign content
- Provision Netlify site, configure DNS via Porkbun MCP
- Run acceptance tests
- Announce to existing subscribers via Buttondown segment

### 3. `UPDATE_SCORECARD.md`

Update the MLA scorecard on the website based on MLA responses.

**Must include:**
- Triggers: Ben reports an MLA action (email, public statement, meeting)
- Four status categories with clear definitions:
  - `awaiting`: no response yet
  - `acknowledged`: confirmed receipt, no position
  - `committed`: public position supporting the ask
  - `opposed`: public position opposing
- Judgment call: status category is Ben's, not agent's — agent proposes, Ben approves
- Implementation: edit `platform/campaigns/[campaign]/scorecard.yaml`, commit, Netlify auto-deploys
- Never modify without Ben's explicit status assignment

### 4. `SEND_UPDATE.md`

Draft and send the fortnightly Buttondown update.

**Must include:**
- Read `VOICE.md` first
- Standard structure: hero paragraph (biggest signal) → quieter progress → one specific ask
- Length: 100-180 words
- Subject line: diagnostic, not hype (`Week 4 — Anne Kang took a position`, not `🎉 BREAKING NEWS`)
- Draft → show Ben → edit → Ben approves → POST to Buttondown API
- Never auto-send; approval gate is mandatory
- Track in `updates-log/` in repo

### 5. `CREATE_CAMPAIGN.md` — The Master Prompt

This is the most important Layer 2 document. It's the document that makes future campaigns possible for a non-developer successor.

**Must include:**
- Input format: Ben describes a situation in natural language ("We need to push for safer school crosswalks because...")
- Process: agent reads `ARCHITECTURE.md`, `VOICE.md`, existing campaign YAML for reference
- Output: complete campaign YAML file matching the schema used by platform template
- YAML schema includes: hero headline (EN + ZH), three facts, grade impact data, mailto recipients, MLA scorecard, FAQ
- Required strategic moves in campaign generation:
  - Find the "BCPSEA admission" equivalent — what's the rhetorically decisive single fact?
  - Find the "Contingencies Vote" equivalent — what makes this solvable without new money?
  - Find the "cascade" — how does today's inaction compound into 5-10 year harm?
  - Find the "2.2×" — what's the specific concrete contrast?
- Campaign is a DRAFT until Ben reviews and approves each section
- Under no circumstance does the agent deploy the campaign live without explicit approval

**Ben's note to Claude Code:** This module is the intellectual heart of the platform. It's where the coalition's strategic DNA lives. Spend extra effort on it. Give concrete examples from the Fund Burnaby Kids campaign as few-shot learning.

### 6. `VERIFY_PAC.md`

PAC endorsement verification workflow.

**Must include:**
- Trigger: pending endorsement in Supabase `pac_endorsements` where status='pending'
- Pre-check: domain legitimacy (does chair's email match school's usual domain?)
- Draft verification email (template provided)
- Ben sends (or approves agent to send via Buttondown as ben@)
- Wait for reply; agent watches inbox via IMAP (future) or Ben forwards reply
- On positive reply: update status to 'verified', write verified_at timestamp
- On negative reply or no reply in 7 days: status → 'rejected' with notes
- Red flags: unusual email domains, mismatched school email, chair name not matching school PAC records
- Escalation: if red flag, draft email via *official* channels (school website, burnabyschools.ca directory) instead

### 7. `RESPOND_TO_INQUIRY.md`

Handle incoming emails to `hello@`, `ben@`, `privacy@`.

**Must include:**
- Read `VOICE.md` first
- Triage categories:
  - Parent asking how to help → point to sign + send; invite to share with one other parent
  - Media / journalist → draft respectful, factual reply; escalate to Ben before sending
  - Politician / political operative → flag to Ben, do not respond autonomously
  - PIPA data access / deletion request → follow `COMPLIANCE.md` procedure, respond within 7 days
  - Hostile / troll → do not engage, flag to Ben
  - Policy wonks / researchers asking specific questions → draft substantive answer with sources
- Draft → show Ben → Ben approves → send
- Never send media quotes or legal-adjacent statements without Ben's approval

### 8. `MONITOR_HEALTH.md`

Weekly platform health check.

**Must include:**
- Signature metrics: count, 7-day trend, anomalies (sudden spikes, bot patterns)
- PAC metrics: verified count, pending count, time-in-pending distribution
- Deployment health: last deploy, build status, response time
- Email metrics: delivery rate, unsubscribe rate, bounce rate
- DNS health: DKIM/SPF/DMARC still passing; domain expiry dates
- Inbox health: unanswered messages in each address
- Output format: structured summary with flags for anything needing Ben's attention

### 9. `EMERGENCY.md`

Diagnostic tree when things break.

**Must include:**
- Level 0 (site down): check Netlify deploy status; rollback to previous commit via Claude Code
- Level 1 (form not submitting): check Netlify Function logs; verify Supabase RLS; verify webhook
- Level 2 (emails not sending): check Buttondown; verify DKIM/SPF/DMARC; check sender verification
- Level 3 (data appears wrong): query Supabase; check for bot insertion; consider temp read-only mode
- Level 4 (security incident): immediately rotate API keys; pause Netlify Function; contact Ben ASAP
- Each level has a playbook and an escalation path
- Reversal paths (how to restore from each fix)

---

## How Claude Code should generate these modules

When Claude Code executes Phase 3 of the bootstrap:

1. Read this CORE file
2. Read PRD (for domain context and compliance requirements)
3. Read existing HTML (for voice cues, campaign content structure, policy inferences)
4. Read Ben's user memory context via MCP (if accessible) — his writing DNA is richly described there
5. Generate each module following the universal structure
6. Show Ben each module as it's drafted, in batches of 3

**Do not skip the examples.** A good instruction module has at least one complete example session (like the ones in `CLAUDE_DESKTOP_OPERATIONS_GUIDE.md`). Agents learn by example.

**Do not over-engineer.** Each module is 500-1500 words, not 5000. Clear and actionable beats comprehensive. Modules can reference each other — don't repeat content.

**Use Ben's actual voice in examples.** Not "Hello, I am an AI assistant". In examples, show the agent speaking terse, diagnostic, useful.

**Critical**: Ben will iterate on these modules after deployment. Treat v1 as a starting point, not a final artifact. Ben's feedback on the first 2-3 real operations will reshape several modules.

---

## What success looks like

A future agent (Claude Desktop, months from now) receives a task and:

1. Matches it to an instruction module
2. Reads that module first
3. Executes the procedure correctly
4. Flags the right judgment calls to Ben
5. Logs what happened

No silent drift. No improvisation on core operations. No "forgot to include unsubscribe link" CASL violations. No accidentally verifying a fake PAC.

The instruction modules are the **coalition's institutional memory**. Ben has accumulated this knowledge over months. The modules externalize it so it survives him — so the coalition doesn't reset to zero every time a new person (or a new AI instance) picks it up.

This is the agent-first premise: **encoded expertise compounds; tribal knowledge evaporates**.

---

## Ben's note to Claude Code

When you're generating these modules, ask yourself: "If I were Ben's successor in 2 years, trying to run a new campaign from this repo without ever having talked to Ben, would this module tell me enough to do it right?"

If the answer is no, the module isn't done yet.
