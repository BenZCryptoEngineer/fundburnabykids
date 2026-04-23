# PRD — Fund Burnaby Kids Campaign Deployment

**Version:** 4.0 (agent-first platform integration)
**Date:** 22 April 2026
**Scope:** First campaign under the Burnaby Kids First coalition platform
**Deadline:** 28 April 2026 (30 days before SD41 budget adoption on 27 May 2026)
**Where this lives:** `infrastructure/PRD.md` in the coalition repo
**Executor:** Claude Code during Phase 5 of `CLAUDE_CODE_BOOTSTRAP_PROMPT.md`

---

## 0. How this document fits into the larger platform

This PRD is **one artifact** in a multi-document agent-first coalition platform. Read in this order for full context:

1. **`FOUNDATION_SETUP.md`** — manual work Ben did before handoff (accounts, credentials, PO Box)
2. **`CLAUDE_CODE_BOOTSTRAP_PROMPT.md`** — the six-phase platform build plan
3. **`AGENT_INSTRUCTIONS_CORE.md`** — template for generating Layer 2 instruction modules
4. **This PRD** — spec for the first deployable campaign
5. **`CLAUDE_DESKTOP_OPERATIONS_GUIDE.md`** — day-to-day operations after deployment

This PRD's scope is **only** the Fund Burnaby Kids campaign deployment. Umbrella architecture, agent instructions, operations, disaster recovery — those live in their own documents.

---

## 1. Strategic context (brief)

Fund Burnaby Kids is a parent-led advocacy campaign pressuring the BC Province to fully fund a $9.4M arbitration liability affecting Burnaby School District 41 before its Board adopts the 2026-27 budget on May 27, 2026.

It is the **first campaign** under the **Burnaby Kids First** coalition umbrella. The header displays dual-layer branding: "Fund Burnaby Kids" primary, "A Burnaby Kids First campaign" as endorser-signature tagline.

**Founder:** Ben Zhou (Burnaby parent, founder of Expeta Technologies). Real name, public attribution.

Full strategic background and three-layer brand philosophy is in `agent-instructions/ARCHITECTURE.md`.

---

## 2. Domain registration

**Both domains registered at Porkbun during `FOUNDATION_SETUP.md` Step 1.** Claude Code configures DNS via Porkbun MCP.

| Domain | Purpose | Expected DNS |
|---|---|---|
| `fundburnabykids.ca` | Primary campaign URL | Netlify A/CNAME records |
| `burnabykidsfirst.ca` | Umbrella URL (future), redirects for now | 302 → fundburnabykids.ca |

**Email aliases** (via ImprovMX, configured in Foundation Step 7):
- `ben@fundburnabykids.ca` (founder public contact)
- `hello@fundburnabykids.ca` (general inquiries)
- `privacy@fundburnabykids.ca` (PIPA requests)
- `campaign@fundburnabykids.ca` (Buttondown sender, not inbox)

**DNS records needed** (Claude Code adds via Porkbun MCP):
- Netlify A/CNAME for root and www
- Buttondown DKIM/SPF/DMARC (values from Foundation Step 6)
- ImprovMX MX records: `mx1.improvmx.com`, `mx2.improvmx.com` (priority 10, 20)

---

## 3. Existing frontend (do NOT rebuild)

The file `fundburnabykids_index.html` (~178KB, single file) is ~95% complete and encodes strategic decisions. Copy it unchanged to `platform/campaigns/fund-burnaby-kids/index.html`. Only make the modifications in section 9.

### Sections (as built, in order)

1. **Hero** — headline, subheadline, CTAs, founder attribution
2. **Persona selector** — three cards (Parent / PAC / Trustee-Media) with in-page expand panels
3. **Three facts** — BCPSEA admission, prior cuts, Contingencies Vote
4. **Journey visualization** — 10 services × 13 grades interactive heatmap
5. **Dual-track action form** — petition sign + pre-filled mailto: email
6. **Public signatories strip**
7. **MLA scorecard** — 7 reps, 4 status categories
8. **Coalition section** — PAC endorsements + Endorsement Kit modal
9. **About / Founder**
10. **FAQ**
11. **Footer**

### Persona-tailored SVG visualizations

Four conceptual visualizations, each with **separate EN and ZH variants** (8 SVG constants total, selected at runtime by `pickSvg()` helper).

- **Responsibility flow**: Province → Arbitration → Students pay; BCPSEA admission callback
- **Money exists**: $5B Contingencies Vote with 0.19% ($9.4M) highlight
- **Scale (2.2×)**: 2025-26 vs 2026-27 shortfall bar comparison
- **Cascade**: K-3 → 4-7 → 10-12 timeline of compounding effects

Each persona gets 2 visuals:
- **Parent**: Cascade + Scale
- **PAC**: Scale + Responsibility
- **Trustee-Media**: Money + Responsibility

**Critical:** Pure-language SVG variants. `_EN` contains NO Chinese; `_ZH` contains NO English sentences (proper nouns like "BC Budget 2026" excepted). **Do not merge them back together.**

---

## 4. What is FAKE in the existing HTML (must be replaced)

| What | Currently | Replace with |
|---|---|---|
| Counter + signatures list | localStorage | Supabase REST (section 9.2) |
| Confirmation emails | UI promise, no service | Buttondown subscription via Netlify Function |
| Fortnightly updates | Not implemented | Manual send via Buttondown (`agent-instructions/SEND_UPDATE.md`) |
| PAC endorsement verification | localStorage demo | Supabase pending/verified workflow (section 7) |
| MLA scorecard | Hardcoded HTML | Hardcoded HTML (acceptable for MVP; updated via git commit per `agent-instructions/UPDATE_SCORECARD.md`) |
| Mailing address | Placeholder `{{MAILING_ADDRESS}}` | Real PO Box from credentials |
| Email addresses | Don't exist | Forwarded via ImprovMX (Foundation Step 7) |

---

## 5. Technology stack

| Concern | Service | Agent-accessible via |
|---|---|---|
| Static hosting | Netlify | REST API (fetch MCP) |
| Form collection | Netlify Forms | REST API (fetch MCP) |
| Serverless function | Netlify Functions | git push (GitHub MCP) |
| Database | Supabase (ca-central-1) | Supabase MCP |
| Email | Buttondown | REST API (fetch MCP) |
| Domain / DNS | Porkbun | Porkbun MCP |
| Email forwarding | ImprovMX | REST API (fetch MCP) |

All credentials in `~/.coalition/credentials.env` (per FOUNDATION_SETUP.md Step 9).

**Data distribution principle:** each sensitive data type with exactly one service handling its compliance obligations.

| Data | Storage | Compliance |
|---|---|---|
| Public display info (first name, last initial, school, neighbourhood) | Supabase | RLS policies (ours) |
| Email + consent | Buttondown | CASL (platform-managed) |
| Full form submission | Netlify Forms | 30-day retention |
| PAC endorsement details | Supabase | RLS policies (ours) |

---

## 6. Repository structure (campaign-specific)

Within the larger coalition platform:

```
burnabykidsfirst-coalition/
├── platform/
│   └── campaigns/
│       └── fund-burnaby-kids/
│           ├── index.html           # Existing HTML, minimally modified
│           └── privacy.html         # New (section 11)
├── campaigns/
│   └── fund-burnaby-kids.yaml       # Campaign metadata as structured data
├── infrastructure/
│   ├── PRD.md                       # This file
│   ├── supabase-migrations.sql      # Section 7
│   └── netlify-function.ts          # Section 8
├── netlify/
│   └── functions/
│       └── on-signature.ts          # Deployed copy of netlify-function.ts
└── ... (rest of platform, see CLAUDE_CODE_BOOTSTRAP_PROMPT.md)
```

---

## 7. Supabase schema

Run once via Supabase MCP. File: `infrastructure/supabase-migrations.sql`.

```sql
-- Table 1: public signatures (no PII)
CREATE TABLE signatures (
  id             BIGSERIAL PRIMARY KEY,
  first_name     TEXT NOT NULL,
  last_initial   CHAR(1) NOT NULL,
  school         TEXT NOT NULL,
  grade          TEXT NOT NULL,
  neighbourhood  TEXT NOT NULL,
  signed_at      TIMESTAMPTZ DEFAULT NOW(),
  CHECK (length(first_name) BETWEEN 1 AND 40),
  CHECK (length(last_initial) = 1),
  CHECK (length(school) BETWEEN 1 AND 80)
);

CREATE INDEX idx_signatures_signed_at ON signatures(signed_at DESC);
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public can read signatures"
  ON signatures FOR SELECT TO anon, authenticated USING (true);
-- NO INSERT policy for anon. Only Netlify Function (service_role) writes.

-- Table 2: PAC endorsements
CREATE TABLE pac_endorsements (
  id              BIGSERIAL PRIMARY KEY,
  school          TEXT NOT NULL,
  students        INTEGER NOT NULL CHECK (students > 0 AND students < 5000),
  chair_name      TEXT NOT NULL,
  chair_email     TEXT NOT NULL,
  approval_date   DATE,
  future_interest BOOLEAN DEFAULT FALSE,
  status          TEXT NOT NULL DEFAULT 'pending' 
                  CHECK (status IN ('pending', 'verified', 'rejected')),
  submitted_at    TIMESTAMPTZ DEFAULT NOW(),
  verified_at     TIMESTAMPTZ,
  notes           TEXT
);

CREATE INDEX idx_pac_status ON pac_endorsements(status);
ALTER TABLE pac_endorsements ENABLE ROW LEVEL SECURITY;

-- Public reads only verified endorsements via restricted view
CREATE VIEW public_pac_endorsements AS
SELECT school, students, approval_date
FROM pac_endorsements
WHERE status = 'verified';

GRANT SELECT ON public_pac_endorsements TO anon, authenticated;
```

**Acceptance test** (MUST run before launch):

1. Manually insert one row in each table via Supabase MCP
2. `GET /rest/v1/signatures` with anon key — should return the row
3. `GET /rest/v1/public_pac_endorsements` — should return PAC only if status='verified'
4. Try anon `INSERT` — should return 401/403
5. Agent reports results to Ben

---

## 8. Netlify Function (`netlify/functions/on-signature.ts`)

Handles both forms. Dispatches by `form-name`.

```typescript
import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const NEIGHBOURHOODS: Record<string, string> = {
  'V3J': 'North Burnaby', 'V3N': 'Edmonds',
  'V5A': 'Burnaby Mountain', 'V5B': 'Brentwood',
  'V5C': 'Willingdon Heights', 'V5E': 'Big Bend',
  'V5G': 'Central Burnaby', 'V5H': 'Metrotown',
  'V5J': 'South Burnaby'
};

export const handler: Handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const data = body.payload?.data || {};
    const formName = body.payload?.form_name || data['form-name'];

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (formName === 'signature') {
      return await handleSignature(data, supabase);
    }
    if (formName === 'pac-endorsement') {
      return await handlePacEndorsement(data, supabase);
    }

    return { statusCode: 200, body: 'ignored' };
  } catch (err) {
    console.error('Unhandled error', err);
    return { statusCode: 200, body: 'ok' };  // Never retry
  }
};

async function handleSignature(data: any, supabase: any) {
  const { firstname, lastname, email, school, grade, postal,
          'consent-public': consentPublic,
          'consent-updates': consentUpdates } = data;

  if (!firstname || !lastname || !email || !school || !grade || !postal) {
    return { statusCode: 200, body: 'missing fields' };
  }
  if (consentPublic !== 'on' && consentPublic !== true) {
    return { statusCode: 200, body: 'no public consent' };
  }

  const postalPrefix = postal.trim().toUpperCase().substring(0, 3);
  const neighbourhood = NEIGHBOURHOODS[postalPrefix] || 'Burnaby';
  const lastInitial = lastname.trim().charAt(0).toUpperCase();

  await supabase.from('signatures').insert({
    first_name: firstname.trim().substring(0, 40),
    last_initial: lastInitial,
    school: school.trim().substring(0, 80),
    grade: grade.trim().substring(0, 20),
    neighbourhood
  });

  if (consentUpdates === 'on' || consentUpdates === true) {
    await fetch('https://api.buttondown.email/v1/subscribers', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.BUTTONDOWN_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email_address: email.trim().toLowerCase(),
        type: 'regular',
        tags: ['signed-2026', `grade-${grade}`, 
               `school-${school.replace(/\s+/g, '-').toLowerCase()}`],
        metadata: { first_name: firstname, school, neighbourhood,
                    signed_at: new Date().toISOString() }
      })
    });
  }

  return { statusCode: 200, body: 'ok' };
}

async function handlePacEndorsement(data: any, supabase: any) {
  const { 'pac-school': school, 'pac-students': students,
          'pac-chair-name': chairName, 'pac-chair-email': chairEmail,
          'pac-approval-date': approvalDate, 'pac-consent': consent,
          'pac-future-interest': futureInterest } = data;

  if (!school || !students || !chairName || !chairEmail || consent !== 'on') {
    return { statusCode: 200, body: 'invalid pac submission' };
  }

  await supabase.from('pac_endorsements').insert({
    school: school.trim().substring(0, 80),
    students: parseInt(students, 10),
    chair_name: chairName.trim().substring(0, 60),
    chair_email: chairEmail.trim().toLowerCase(),
    approval_date: approvalDate || null,
    future_interest: futureInterest === 'on',
    status: 'pending'
  });

  // Notify Ben for verification (see agent-instructions/VERIFY_PAC.md)
  await fetch('https://api.buttondown.email/v1/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${process.env.BUTTONDOWN_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      subject: `[PAC pending] ${school} — verify endorsement`,
      body: `School: ${school}\nChair: ${chairName} <${chairEmail}>\n` +
            `Students: ${students}\nApproval date: ${approvalDate || 'pending'}\n` +
            `Future interest: ${futureInterest}`,
      email_type: 'public',
      recipients: [process.env.ADMIN_NOTIFICATION_EMAIL || 'ben@fundburnabykids.ca']
    })
  });

  return { statusCode: 200, body: 'ok' };
}
```

### Webhook wiring

Netlify → Site → Notifications → Form submissions → Outgoing webhook:
- URL: `https://{site}/.netlify/functions/on-signature`
- Apply to both `signature` and `pac-endorsement` forms

Claude Code configures this via Netlify REST API during Phase 4.

---

## 9. Frontend modifications (minimal)

### 9.1 Add Netlify form attributes

```html
<form id="action-form" name="signature" method="POST" 
      data-netlify="true" netlify-honeypot="bot-field" 
      onsubmit="return handleSubmit()">
  <input type="hidden" name="form-name" value="signature">
  <p class="hidden" aria-hidden="true">
    <label>Don't fill: <input name="bot-field"/></label>
  </p>
  ...
</form>
```

Same for PAC endorsement form. Audit each input has `name` attribute.

### 9.2 Replace localStorage with Supabase

In the existing HTML, find `const store = {` and `loadSignatures()` / `renderCounter()` / `renderPacs()`. Replace bodies:

```javascript
const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR-ANON-KEY';  // safe to hardcode; RLS protects

async function fetchSignatures(limit = 60) {
  const url = `${SUPABASE_URL}/rest/v1/signatures?select=first_name,last_initial,school,neighbourhood,signed_at&order=signed_at.desc&limit=${limit}`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_ANON_KEY, Prefer: 'count=exact' }
  });
  const count = parseInt(res.headers.get('content-range')?.split('/')[1] || '0', 10);
  const rows = await res.json();
  return { count, rows };
}

async function fetchVerifiedPacs() {
  const url = `${SUPABASE_URL}/rest/v1/public_pac_endorsements?select=*&order=approval_date.desc`;
  const res = await fetch(url, { headers: { apikey: SUPABASE_ANON_KEY } });
  return await res.json();
}
```

### 9.3 Create `privacy.html` (content in section 11)

### 9.4 Replace `{{MAILING_ADDRESS}}` with real PO Box

### 9.5 What to NOT change

- Copy (EN or ZH)
- Journey visualization logic
- Mailto: email body construction
- EN/ZH toggle behavior
- SVG variants — **keep `_EN` and `_ZH` separate**
- Persona selector behavior
- PAC Endorsement Kit modal
- Design tokens (CSS variables, fonts, colors)
- Dual-layer header brand

---

## 10. Environment variables

In Netlify Site Configuration → Environment variables (Claude Code sets via REST API):

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...       # Secret. Backend only.
SUPABASE_ANON_KEY=eyJhbG...                # Public. OK to hardcode frontend.
BUTTONDOWN_API_KEY=...                      # Secret.
ADMIN_NOTIFICATION_EMAIL=ben@fundburnabykids.ca
```

Values pulled from `~/.coalition/credentials.env` during Phase 4.

Repo includes `.env.example` with placeholder values. Real `.env` is git-ignored.

---

## 11. Privacy policy (`platform/campaigns/fund-burnaby-kids/privacy.html`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Privacy Policy — Fund Burnaby Kids</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 720px; 
         margin: 40px auto; padding: 20px; line-height: 1.65; color: #1a1a1a; }
  h1 { font-size: 28px; margin-bottom: 8px; }
  h2 { font-size: 18px; margin-top: 28px; }
  a { color: #1C3F8F; }
  .meta { color: #666; font-size: 14px; }
</style>
</head>
<body>

<p><a href="/">← Back to campaign</a></p>

<h1>Privacy Policy</h1>
<p class="meta">Last updated: 22 April 2026</p>

<h2>Who we are</h2>
<p><strong>Fund Burnaby Kids</strong> is a campaign of <strong>Burnaby Kids First</strong>, 
a parent-led advocacy coalition founded by Ben Zhou. Our mailing address is 
<strong>{{MAILING_ADDRESS}}</strong>. Privacy inquiries: 
<a href="mailto:privacy@fundburnabykids.ca">privacy@fundburnabykids.ca</a>.</p>

<h2>What we collect</h2>
<p>First name, last name, email address, your child's school, your child's grade, 
and postal code. Governed by BC's <em>Personal Information Protection Act</em> (PIPA).</p>

<h2>What we display publicly</h2>
<p>ONLY: first name + last initial + school + neighbourhood (derived from postal 
code prefix). We NEVER display email, full last name, or full postal code.</p>

<h2>Where your information is stored</h2>
<ul>
  <li>Public display info: Supabase (Canadian region, ca-central-1).</li>
  <li>Email and consent: Buttondown.</li>
  <li>Full form submission: Netlify Forms, 30-day retention then purged.</li>
</ul>

<h2>Your rights under PIPA</h2>
<ul>
  <li><strong>Access / correction / deletion:</strong> 
      <a href="mailto:privacy@fundburnabykids.ca">email us</a>. 7-day response.</li>
  <li><strong>Unsubscribe:</strong> one-click link in every email.</li>
  <li><strong>Complaint:</strong> BC's Office of the Information and Privacy 
      Commissioner at <a href="https://www.oipc.bc.ca">oipc.bc.ca</a>.</li>
</ul>

<h2>What we never do</h2>
<ul>
  <li>Sell or share data with third parties.</li>
  <li>Use data commercially.</li>
  <li>Share with political parties or candidates.</li>
  <li>Retain beyond need.</li>
</ul>

<h2>Cookies and tracking</h2>
<p>No tracking cookies. No Google Analytics. No advertising pixels. Netlify's 
anonymous analytics counts page views only.</p>

<h2>Contact</h2>
<p><a href="mailto:privacy@fundburnabykids.ca">privacy@fundburnabykids.ca</a><br>
{{MAILING_ADDRESS}}</p>

</body>
</html>
```

Chinese version deferred to Phase 2 post-launch.

---

## 12. Buttondown configuration

Claude Code configures via Buttondown REST API in Phase 4.

### Welcome email

**Subject:** `Thanks — you signed the Burnaby $9.4M petition`

**Body:**
```
Hi {{ subscriber.metadata.first_name | default: 'there' }},

Thanks for signing. You're now part of the public record asking the Province 
of British Columbia to fully fund the $9.4M arbitration liability affecting 
Burnaby schools.

What happens next:

- Your name appears on the public signatures at fundburnabykids.ca (as first 
  name + last initial + school + neighbourhood). Your email and full postal 
  code are never shown.

- If you haven't already, open your pre-filled email to the Minister of 
  Education and Burnaby's 5 MLAs: https://fundburnabykids.ca#act

- You'll get a short update every two weeks.

Share with another parent: https://fundburnabykids.ca

— Fund Burnaby Kids
  A campaign of Burnaby Kids First
```

Buttondown auto-appends unsubscribe link, physical address, sender ID.

### Critical settings

- **Double opt-in**: ON
- **Sender name**: `Fund Burnaby Kids`
- **Sender domain**: `campaign@fundburnabykids.ca` (DKIM verified)
- **Physical address**: real PO Box from credentials
- **Subscription tags** (auto-added by Netlify Function): `signed-2026`, `grade-{N}`, `school-{slug}`

---

## 13. Launch checklist

Run every item. Agent reports pass/fail to Ben before declaring live.

### Domains and email
- [ ] `fundburnabykids.ca` resolves, SSL green
- [ ] `burnabykidsfirst.ca` 302 redirects to `fundburnabykids.ca`
- [ ] DKIM/SPF/DMARC verified via mail-tester.com score ≥9/10
- [ ] ImprovMX forwarding works for `ben@`, `hello@`, `privacy@`
- [ ] Buttondown sender domain verified

### Compliance
- [ ] Real PO Box replaces `{{MAILING_ADDRESS}}` in footer, privacy page, Buttondown settings
- [ ] Privacy page at `/privacy`, linked from footer
- [ ] Test welcome email shows unsubscribe link + physical address footer
- [ ] Supabase RLS acceptance test (section 7) passed

### Functional
- [ ] Signature form submits
- [ ] Counter increments across browsers in <30s
- [ ] Public signatures list shows new entries
- [ ] Confirmation email arrives <60s
- [ ] Unsubscribe link works
- [ ] Mailto: opens correctly in Gmail, Apple Mail, Outlook (desktop + mobile)
- [ ] Mailto: body contains all 7 recipients, subject, pre-filled fields
- [ ] EN/ZH toggle changes all content with **no bilingual mixing** (including all 4 persona visualizations in both directions)
- [ ] All 4 persona cards work: correct 2 tailored visualizations per persona in active language
- [ ] Journey viz grade picker updates impact summary for all 14 grade options
- [ ] PAC Endorsement Kit modal opens
- [ ] PAC form creates pending Supabase record + emails Ben

### Accessibility & performance
- [ ] Lighthouse Performance ≥95 on mobile
- [ ] Lighthouse Accessibility ≥95
- [ ] Page loads <2s on 4G
- [ ] Keyboard navigation works everywhere
- [ ] No console errors

### Smoke test
- [ ] 5 team members signed successfully
- [ ] All 5 signatures in Supabase; 5 subscribers confirmed in Buttondown
- [ ] ≥1 test PAC endorsement submitted and verified end-to-end

---

## 14. Risks (campaign-specific)

Platform-wide risks (security incidents, service outages, disaster recovery) are in `agent-instructions/EMERGENCY.md` and `DISASTER_RECOVERY.md`.

Campaign-specific:

| Risk | Mitigation |
|---|---|
| Counter gaming / bot signups | Netlify Forms spam filter + IP rate limit + unique email constraint |
| Confirmation emails hit spam | DKIM/SPF/DMARC before first send. Test with mail-tester.com. |
| Supabase RLS misconfigured leaks PII | Section 7 acceptance test MUST be run before launch. No email/postal ever in `signatures`. |
| Bilingual mixing reintroduced during edits | All SVGs split into `_EN` and `_ZH` with `pickSvg()` helper. Do not merge. See `policies/VISUAL_DESIGN.md`. |
| MLA legal pushback | We name representatives factually, not defamatorily. Status categories objectively verifiable. Policy in `policies/COMPLIANCE.md`. |

---

## 15. Acceptance criteria — campaign is ready to launch when

1. Signature submitted in one browser appears on public list in another within 60s
2. Signer receives working confirmation email <60s
3. Unsubscribe link works
4. Mailto: opens correctly in Gmail/Apple Mail/Outlook with all 7 recipients and pre-filled fields
5. EN/ZH toggle switches all content with zero bilingual mixing (including all 4 persona visualizations)
6. All 4 persona cards render correct 2 visualizations in active language only
7. Journey visualization updates impact summary for all 14 grade options
8. PAC endorsement form creates Supabase pending record + emails Ben
9. Privacy page at `/privacy` shows real mailing address
10. Lighthouse Performance ≥95 on mobile
11. All section 13 checklist items green
12. 5 real team members completed end-to-end smoke test

---

**Estimated build time after FOUNDATION_SETUP.md complete: 4-6 hours focused work by Claude Code in Phase 5 of the bootstrap sequence.**

**This PRD covers campaign deployment only. Platform architecture, agent operations, and future campaign deployment are in separate documents.** See `CLAUDE_CODE_BOOTSTRAP_PROMPT.md` section 0 for the document map.
