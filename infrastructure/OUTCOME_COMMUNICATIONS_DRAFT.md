---
STATUS: DRAFT — DO NOT SEND
Pending review after April 30 evening / May 1 DPAC call.
Tone target: parallel-actor framing. Specific ask resolved,
hand off May 1 to DPAC, "stay in touch" not "continue fight."
---

# Outcome thank-you email — DRAFT (archive only)

**Origin:** drafted in conversation 2026-04-30 by Ben after the SD41
Board's public funding announcement
(<https://burnabyschools.ca/province-protects-districts-classrooms-and-budget-by-funding-arbitration-ruling/>).

**Wiring status:** NOT wired to any send path. There is no function,
script, button, cron, webhook, or scheduled trigger in this repo that
sends this email. This file exists purely so the copy is not lost if
the chat context is cleared before review.

**When it goes live (AFTER review unlocks):** one-off bulk-send to
`signatures` rows where `confirmed=TRUE`, dispatched via Resend.
Requires a new function or local script — to be written ONLY after
the tone is locked. **Do NOT add a cron or scheduled trigger.**

**Localization status:** EN verbatim below. ZH translation deliberately
deferred — draft the ZH version only after the EN tone is locked.

---

## EN — verbatim (the version Ben wrote in conversation)

> The specific ask of this campaign — that the Province fund the $9.4M arbitration cost — was met today.
>
> This was a tightly-scoped campaign with a specific question and a specific deadline. It's now resolved.
>
> What you built by signing — your name on a list of Burnaby parents who refused to absorb a Province-level mistake — that doesn't go away just because the bill got paid.
>
> If you want to stay in touch as I figure out what (if anything) comes next, just don't unsubscribe. If you want out, no hard feelings — you've already given the most valuable thing.
>
> May 1: Burnaby DPAC has a Day of Action at MLA Paul Choi's office (4-5 PM). They're focused on broader funding pressures that are distinct from this campaign. If you want to keep showing up, that's a good place to start.
>
> Either way: thank you.

---

## ZH — TODO

Translate only AFTER the EN tone is locked. Constraints:

- Keep "stay in touch" register (e.g. 「保持联系」). Do NOT pick up
  "continue the fight" / activist language — that is DPAC's framing,
  not this campaign's.
- May 1 hand-off must be explicit, with the "distinct from but
  complementary to" caveat preserved.
- Closure phrase must mirror "Either way: thank you." — short,
  unconditional, no follow-up demand.

---

## Subject line — TODO

Pending tone decision. Candidates (do not lock yet):

- "Update from Fund Burnaby Kids — the ask is resolved"
- "$9.4M arbitration: funded. Thank you."
- "Outcome reached — and what's next"

---

## Pre-send checklist (only relevant after review unlocks)

- [ ] EN copy approved by Ben
- [ ] ZH translation written, approved by Ben
- [ ] Subject line picked (EN + ZH)
- [ ] Send-path code written (one-off script: read confirmed signers,
      pick locale per `signatures.locale`, batch via Resend)
- [ ] Test send to 1–2 internal addresses first
- [ ] Bulk send timing confirmed
- [ ] Buttondown coordination decided (does this go to the newsletter
      archive too, or only as transactional Resend?)
