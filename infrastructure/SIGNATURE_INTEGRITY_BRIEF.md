# Signature Integrity — MLA / Media Q&A Brief

**Audience:** MLA staff, journalists, policy researchers, anyone questioning the legitimacy of the signature count.
**Not for:** signers themselves (see the campaign FAQ on the public site for parent-facing language).
**Owner:** Ben Zhou.
**Last reviewed:** 2026-04-25.

This document is the canonical source for "are these real signatures?" questions. Quote it verbatim where useful; paraphrase where the conversation is informal. The numbers and procedures must stay accurate — if anything in `infrastructure/supabase-migrations.sql` or the Netlify Functions changes, update this file in the same commit.

---

## One-line summary

> 5,000 signatures does not equal 5,000 real people — unless every one of them confirmed via email. Our public count only displays confirmed signatures. This is the same model the Canadian House of Commons uses for its e-petition system.

---

## Q1 — "Are these signatures all real people?"

Yes, with three independent verification layers:

1. **Cloudflare Turnstile** intercepts automated scripts before the form ever submits. Real users pass invisibly; scripted submitters get blocked at the edge.

2. **Email confirmation (48 hours)** — every signer must click a unique single-use link sent to the email address they provided. **Only confirmed signatures appear in the public count or on the public list.** Unconfirmed submissions are deleted automatically 48 hours after submission.

3. **IP-level audit trail** — the database records the IP address of both submission and confirmation (two separate events). This lets us run cluster queries against any hostile pattern: "show me every IP that submitted more than N signatures."

The first two layers are a direct match for what the Canadian House of Commons e-petition system requires. The third is a direct match for the UK Parliament e-petition system (its source code is public — `alphagov/e-petitions` on GitHub).

We can provide the verification audit, anonymized in line with PIPA, to any inquiring office.

---

## Q2 — "How do you know they're actually Burnaby parents?"

We collect the **first three letters of postal code** (which we convert to a neighbourhood name like "Willingdon Heights" for public display) and the **child's school name** (selected from a list of SD41 schools).

We don't independently verify each parent's identity beyond the email. **What we have is the friction stack**: the cost of faking 1,000 Burnaby parents — generating 1,000 emails, accessing 1,000 inboxes within 48 hours, picking plausible school+postal combinations — is high enough that it would show up in our IP cluster query.

If you have a specific signature you suspect is fake, send the public listing details (e.g. "Sarah C., Westridge Elementary, Willingdon Heights, signed 2026-04-30") and we will investigate.

---

## Q3 — "Couldn't someone create a thousand fake emails?"

Theoretically yes, but at scale it leaves traces:

- Every email costs time (free email providers throttle bulk sign-ups).
- Every confirmation requires accessing that inbox within 48 hours.
- Our database logs the IP of submission and the IP of confirmation. **A thousand fake signatures means one or two IPs appearing a thousand times in the cluster query — immediately visible.**
- Cloudflare Turnstile catches the most common automation paths before submission.

We can provide a PIPA-compliant IP cluster report on request showing how concentrated or distributed our signatures are.

---

## Q4 — "What's the opt-out story?"

Any signer can request deletion at any time by emailing **privacy@fundburnabykids.ca**. We respond and complete the deletion within **7 days**. (PIPA permits 30 days; we commit to faster.)

Full privacy policy lives at fundburnabykids.ca/privacy. Section "What we DON'T do" is the relevant lead.

---

## Q5 — "Do you sell or share this data?"

No. Never. Specifically not to:
- Political parties or candidates (any party, any level)
- Other advocacy groups
- Commercial partners or data brokers
- Marketing platforms outside Buttondown (newsletter list only)

The data is partitioned across three services, each with one specific compliance role:

| Data | Where | Why |
|---|---|---|
| Public display info (first name, last initial, school, neighbourhood) | Supabase, ca-central-1 | Canadian region; we control RLS rules |
| Email + ongoing-update consent | Buttondown | They handle CASL on their platform |
| Raw form submissions (incl. email + postal) | Netlify Forms | 30-day retention then auto-purge |

If a complaint to the BC Office of the Information and Privacy Commissioner (OIPC) ever named us, the storage segregation is the first thing we would point to.

---

## Q6 — "Why do you need a petition at all? Why not just write to the Minister?"

We do both. The action form on the site pre-fills emails to the Minister of Education and Burnaby's five MLAs — every signer who completes the action sends those emails directly from their own client.

The petition exists for **public visibility**. The signature count, displayed on the site, tells everyone — MLAs, parents who haven't signed yet, reporters — how many Burnaby parents are watching this decision. Both audiences are the same; the petition turns "watching" into a public fact.

---

## Q7 — "How many signatures do you have right now?"

[Live number from `SELECT COUNT(*) FROM public_signatures WHERE petition_slug = 'fund-burnaby-kids';`]

We can break this down by school or by neighbourhood on request.

---

## Q8 — "What if a reporter tries to discredit your count?"

We welcome scrutiny. The verification process is documented publicly on the privacy page; the source code for the verification flow is in a public GitHub repository. Anyone can sign and observe the flow firsthand.

If a reporter has access logs from a specific concern (e.g. "I see 50 signatures from Westridge Elementary all submitted within an hour"), we will investigate using the IP cluster query and publicly correct any misrepresentation.

---

## Technical reference (for the curious)

| Element | Implementation |
|---|---|
| Bot prevention at form | Cloudflare Turnstile, server-side `siteverify` with `remoteip` |
| Token generation | `crypto.randomBytes(32).toString('base64url')` (~256 bits) |
| Token expiry | 48 hours; pg_cron purges expired unconfirmed rows hourly |
| Token storage | `signatures.confirm_token` UNIQUE column, indexed |
| IP storage | `signatures.ip_address` INET (submission) + `validated_ip` INET (confirmation) |
| IP retention | Until campaign close + 90 days; manual anonymization via `UPDATE ... SET ip_address = NULL, anonymized_at = NOW()` |
| Public read path | `public_signatures` view, anon SELECT only, filters `confirmed = TRUE AND anonymized_at IS NULL` |
| Direct table access | RLS denies anon SELECT/INSERT/UPDATE/DELETE on `signatures` |
| Function transport | Netlify Functions with `service_role` Supabase key (bypasses RLS) |
| Audit query example | `SELECT ip_address, COUNT(*) FROM signatures WHERE petition_slug = 'fund-burnaby-kids' GROUP BY ip_address HAVING COUNT(*) > 5 ORDER BY 2 DESC;` |

---

## What we do NOT claim

To preserve credibility, do not over-claim. In particular:

- We do **not** verify signers are Canadian citizens. PIPA permits this; we do not collect citizenship.
- We do **not** verify signers are residents of Burnaby beyond what their postal code prefix and school selection imply.
- We do **not** verify the email address matches a real-world identity beyond reachability.
- We do **not** detect signers who use multiple personal email addresses to sign once each — that pattern is indistinguishable from "different family members signing."

The verification stack guarantees that **every confirmed signature is a real reachable email address whose owner intentionally clicked a link**. That is the standard the House of Commons holds itself to. It is the standard we hold ourselves to. It is enough.
