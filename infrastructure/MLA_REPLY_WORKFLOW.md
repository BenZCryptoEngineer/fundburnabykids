# MLA Reply Workflow

**Purpose:** how MLA responses to the campaign make it from inbox to public scorecard.
**Owner:** Ben Zhou.
**Audience:** Ben (and any future operator). Not signer-facing.

---

## v1 (current — manual curation, ship-ready for May 1)

```
Constituent emails MLA via mailto: link from the campaign action form
                                |
                                ▼
        MLA replies to the constituent (NOT to the campaign)
                                |
        Two paths:
        (a) Constituent forwards to ben@fundburnabykids.ca
        (b) Constituent never forwards — we never see the reply
                                |
                                ▼
ImprovMX → ben@ / hello@fundburnabykids.ca → Ben's personal inbox
                                |
                                ▼
        Ben reads, decides if reply is appropriate to publish
                                |
                                ▼
Ben edits campaigns/fund-burnaby-kids.yaml `mla_scorecard` section
                                |
                                ▼
        git commit + git push → Netlify auto-deploys
                                |
                                ▼
                        Public scorecard updated
```

### Time per reply: ~5–10 minutes

Editing the YAML, writing the citation, committing. For a campaign cycle expecting 10–20 MLA touchpoints, this is manageable solo work.

### Decision tree for "should we publish this reply?"

| Reply type | Publish? | Citation form |
|---|---|---|
| Public statement (Twitter/X, press release, public meeting) | Yes | Direct quote + source URL + date |
| Direct reply to `ben@` or `hello@` from MLA | Yes (assumed publishable since sent to advocacy address) | Quote relevant sentence(s) + date |
| Constituent forwards a private reply, with constituent's permission | Yes | Excerpt only (relevant policy sentence), redact constituent's name + any personal details, note "in response to a constituent" + date |
| Constituent forwards without explicit permission | **Hold** — ask constituent first, or paraphrase without quoting | — |
| Reply contains internal staff names, scheduling, off-topic content | Excerpt only the policy-relevant sentence(s) | Redact everything else |
| Reply is hostile / dismissive in a way that's news | Yes — but quote precisely, don't editorialize | Direct quote + date |

### Status categories on the scorecard

| Status | Meaning | Evidence required |
|---|---|---|
| `awaiting` | We have not received any reply | None — default state |
| `acknowledged` | MLA office confirmed receipt, no policy position stated | Email or message confirming receipt |
| `committed` | MLA publicly supports the ask | Citable public statement with date |
| `opposed` | MLA publicly opposes the ask | Citable public statement with date |

The category is **Ben's call**, not auto-derived. A vague "we appreciate the parents' concerns" reply is `acknowledged`, not `committed`. A specific "I will be advocating for full funding" is `committed`.

### What goes in the YAML

Pseudocode for the scorecard structure (full schema in Phase 5):

```yaml
mla_scorecard:
  - riding: "Burnaby-Edmonds"
    name: "Anne Kang"
    status: "committed"
    last_updated: "2026-05-08"
    evidence:
      quote: "I will be advocating for the Province to fully fund this arbitration liability."
      source_type: "public_statement"
      source_url: "https://example.com/..."
      source_date: "2026-05-07"
```

---

## v2 (future — only if v1 manual work overwhelms Ben)

Inbound email parsing via Postmark. Trigger: Ben spends >2 hours/week on MLA reply curation, or replies start exceeding ~5/week.

### Architecture

```
        Constituent forwards MLA reply to mla-reply@fundburnabykids.ca
                                |
                                ▼
        Postmark Inbound webhook receives, parses, strips signature
                                |
                                ▼
   POST to /.netlify/functions/inbound-mla-reply (new function)
                                |
                                ▼
INSERT into mla_replies (status='pending_review', reply_excerpt, reply_full,
                         submitted_via='email_inbound', mla_riding, mla_name)
                                |
                                ▼
        Ben reviews via simple admin form (small Astro page that
        queries mla_replies WHERE status='pending_review')
                                |
                                ▼
   Ben approves → status='published' → frontend reads from view
   Ben rejects → status='rejected', notes=<reason>
```

### What changes in code

- Add `netlify/functions/inbound-mla-reply.ts`
- Add `inbound-mla-reply` route in `netlify.toml`
- Add Postmark Inbound webhook URL configured in Postmark dashboard pointing at `https://fundburnabykids.ca/.netlify/functions/inbound-mla-reply`
- Add `POSTMARK_INBOUND_WEBHOOK_TOKEN` to `credentials.env.example`
- Add Astro admin page at `platform/src/pages/admin/mla-replies.astro` (basic-auth gated)
- Add new public view `published_mla_replies` that frontend reads

### What does NOT change

- The `mla_replies` table schema (already created in Phase 4A.1)
- The `mla_scorecard` YAML structure (Ben can still curate manually for any reply that doesn't fit the inbound path)

### v1 → v2 trigger criteria

Promote when **any of**:

- Ben spends >2 hours/week on MLA reply curation for two consecutive weeks
- More than 5 MLA replies arrive in a single week
- A reply from someone NOT on Ben's contact list arrives (constituent acting independently)
- Multiple constituents forward the same reply (deduplication overhead)

If none of these trigger, v1 is enough. Don't pre-build.

### Cost (v2)

- Postmark Inbound: $15/month (first year free with new account)
- Implementation: ~3 hours (function + admin page + webhook config)

---

## Legal framing — why we publish MLA replies at all

Elected officials acting in their official capacity have a reduced expectation of privacy regarding their stated positions on policy matters. Quoting an MLA's response on this campaign's substantive issue is consistent with standard journalism and advocacy practice in Canada.

We **do** quote with date and citation. We **do** quote precisely (no paraphrase that could distort meaning). We **do** redact internal staff names, contact details, scheduling, and any personal context the MLA reasonably expected to remain private.

We **do not** publish full email threads. We **do not** publish constituent identities (the parent who forwarded to us stays anonymous). We **do not** mock, editorialize, or excerpt selectively to misrepresent meaning.

If an MLA later asks us to remove a quote, we evaluate good-faith requests case by case and respond within 7 days. A factual public statement, properly cited, generally stays.

---

## Open questions for v2 (deferred)

- Should we proactively offer MLAs a `submit a statement` form on the site? (Pros: invites engagement; cons: low expected use, attack surface)
- Should published replies have a public comment / response thread? (Strongly default no — moderation cost too high for this scale)
- Should we email subscribers when an MLA's status changes? (Probably yes — feeds the fortnightly update cadence)

These are Phase 6+ concerns. Don't decide now.
