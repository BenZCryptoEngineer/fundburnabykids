# Confirmation email — English

**Sent by:** `netlify/functions/on-signature.ts` → Resend
**To:** newly-signed user (1 email per signature submission)
**Tone fallback:** neutral institutional (until VOICE.md is filled)
**Source of truth for content:** `netlify/functions/on-signature.ts` `renderConfirmEn()`. This file is a readable copy for non-coders. Edits here do nothing on their own — change the function too.

---

## Subject

```
One click left: confirm your signature for Burnaby kids
```

## Plain-text body

```
Hi {{firstName}},

You signed the petition asking the BC Province to fully fund the $9.4M
arbitration liability before SD41 adopts its 2026-27 budget on May 27.

To put your name on the public record we will show MLAs, Ministers, and
reporters, please confirm:

  {{confirmUrl}}

Why this step.

Every name we publish on fundburnabykids.ca is a name we can stand
behind. When an MLA's office asks "are these real Burnaby parents?",
confirmed signatures are the answer. Unconfirmed signatures stay
private and uncounted.

This link expires in 48 hours. After that, you would need to sign again.

The deadline that matters: budget adoption is May 27.

—
Fund Burnaby Kids
A campaign of Burnaby Kids First
{{MAILING_ADDRESS}}

You are receiving this email because you signed the petition at
fundburnabykids.ca. This is the only email you will receive about this
signature unless you opted in to ongoing updates.
```

## HTML body

See `renderConfirmEn()` in `netlify/functions/on-signature.ts`. Structurally identical to plain-text version with:
- Brand-blue (#1C3F8F) confirm button
- Visible plain-text URL fallback
- CASL-required identification + mailing address footer

## Variables

| Token | Source | Example |
|---|---|---|
| `{{firstName}}` | Signer's first name from form | `Sarah` |
| `{{confirmUrl}}` | `${SITE_URL}/api/confirm?t=<token>` | `https://fundburnabykids.ca/api/confirm?t=abc123...` |
| `{{MAILING_ADDRESS}}` | `MAILING_ADDRESS` env var | `PO Box XXXX, Station Willingdon, Burnaby BC V5C 5W6, Canada` |

## CASL position

This email is a **transactional message**, exempt from CASL's express-consent requirement (CRTC guidance: confirmation messages are excluded from CEM rules). It still includes:
- Sender identification (Fund Burnaby Kids / Burnaby Kids First)
- Physical mailing address
- Statement of why the recipient is getting this email

The footer notes that this is the *only* email the recipient will receive unless they opted in to ongoing updates — which sets correct expectations and avoids the "ongoing relationship without consent" failure mode.

## Why this content, not "click to subscribe"

A bare confirmation email ("click here to confirm your subscription") feels like a chore. This version reframes the click as the political act it actually is — the moment the signature becomes part of the public record MLAs can be shown. The framing is factual (no hype, no marketing), but it states the stakes clearly.

This is a deliberate departure from generic transactional confirmation patterns. If it underperforms (low confirmation rate), measure and iterate before the next campaign.
