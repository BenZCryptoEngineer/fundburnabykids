# Domains

State-of-record for all domains, DNS, and email identity operated by Burnaby Kids First.

**Source of truth for DNS:** Porkbun (via Porkbun MCP).
**Source of truth for this file:** git. Update after every DNS change.

---

## Registered domains

| Domain | Purpose | Expiry | WHOIS privacy | API access |
|---|---|---|---|---|
| `fundburnabykids.ca` | Primary URL for Fund Burnaby Kids campaign | 5-year prepaid (see Porkbun) | ON | Enabled |
| `burnabykidsfirst.ca` | Coalition umbrella URL; currently 302 → `fundburnabykids.ca`; becomes primary when 2nd campaign deploys | 5-year prepaid | ON | Enabled |

Both registered at Porkbun per `docs/FOUNDATION_SETUP.md` Step 1. Porkbun account holds ≥$100 CAD credit for renewals and any future domain ops.

---

## DNS records (expected state after Phase 4)

### `fundburnabykids.ca`

| Type | Host | Value | TTL | Purpose |
|---|---|---|---|---|
| A | @ | Netlify load balancer IP (from Netlify site config) | 300 | Root → Netlify |
| CNAME | www | `<site-name>.netlify.app` | 300 | www → Netlify |
| MX | @ | `mx1.improvmx.com` (priority 10) | 3600 | Inbound email → ImprovMX |
| MX | @ | `mx2.improvmx.com` (priority 20) | 3600 | Inbound email → ImprovMX |
| TXT | @ | `v=spf1 include:spf.improvmx.com include:_spf.buttondown.email ~all` | 3600 | SPF |
| TXT | buttondown._domainkey | (DKIM value from Buttondown setup) | 3600 | DKIM |
| TXT | _dmarc | `v=DMARC1; p=quarantine; rua=mailto:dmarc@fundburnabykids.ca` | 3600 | DMARC |

### `burnabykidsfirst.ca`

| Type | Host | Value | TTL | Purpose |
|---|---|---|---|---|
| URL forward | @ | 302 → `https://fundburnabykids.ca` | — | Umbrella redirect |
| URL forward | www | 302 → `https://fundburnabykids.ca` | — | Umbrella redirect |

When the 2nd campaign deploys, this flips: `burnabykidsfirst.ca` becomes the umbrella hub; individual campaigns become subdomains (e.g. `crosswalks.burnabykidsfirst.ca`).

---

## Email identity

All mailboxes are **forwarded aliases** (ImprovMX inbound → Ben's personal Gmail). No real mailboxes on the domain. One alias (`ben@`) additionally has **outbound SMTP** so Ben can write personal email from Gmail with `ben@fundburnabykids.ca` as the visible From address — see "Outbound for `ben@`" below.

| Address | Forward target | Purpose | Outbound from this address? |
|---|---|---|---|
| `ben@fundburnabykids.ca` | Ben's personal | Founder public contact | **Yes** — ImprovMX SMTP + Gmail Send-as |
| `hello@fundburnabykids.ca` | Ben's personal | General inquiries | No (forward-only) |
| `privacy@fundburnabykids.ca` | Ben's personal | PIPA data requests | No (forward-only) |
| `campaign@fundburnabykids.ca` | — (send-only) | Transactional sender (Resend) + newsletter (Buttondown) | Automated only |
| `dmarc@fundburnabykids.ca` | Ben's personal | DMARC aggregate reports | No (forward-only) |

### Outbound for `ben@`

Set up 2026-04-29 to let Ben write personal replies + PAC outreach + MLA staff correspondence from Gmail with `ben@fundburnabykids.ca` as the visible From, instead of his personal `benz92124@gmail.com`. The mechanism:

- **ImprovMX Premium** ($9/mo billed yearly = ~$92/yr, 15% off). Premium unlocks outbound SMTP that Free does not have. The free-tier forwarding everything in the table above stays unchanged.
- **Gmail "Send mail as"** wired to ImprovMX's SMTP server (`smtp.improvmx.com:587`, TLS, username = `ben@fundburnabykids.ca`, password = a per-alias key generated in the ImprovMX dashboard, NOT the ImprovMX account password).
- Gmail's Reply auto-defaults `From` to whichever address received the email — so when ImprovMX forwards `ben@` mail into Ben's Gmail, replying back picks `ben@` automatically.

**Capacity**: Premium plan caps outbound at 6,000 emails/month. Personal correspondence + PAC outreach is well under that. **Transactional / automated email continues to flow through Resend** (signature confirmation, PAC chair confirmation, "your links", recovery, admin notifications) — those are `from: campaign@fundburnabykids.ca`, not `ben@`. Don't route Resend traffic through ImprovMX SMTP — Resend's deliverability is purpose-built for transactional volume.

**Rotation / re-issue**: if the per-alias SMTP password is suspected leaked, regenerate it in the ImprovMX dashboard → Domain → SMTP Credentials. Then update Gmail's Send-as configuration with the new password (Settings → Accounts → "edit info" on the alias). No DNS change needed.

---

## Physical mailing address

CASL (Canadian Anti-Spam Legislation) requires every commercial / advocacy email to include a physical address where the sender can be reached. Burnaby Kids First's address:

> **PO Box 44021 Burnaby RPO Kensington Sq, BC, V5B 4Y2**

Used in:
- All confirmation / "your links" / recovery email footers (rendered server-side via `MAILING_ADDRESS` env var)
- `/privacy/` and `/zh/privacy/` page footers
- CampaignLayout's site-wide footer fallback

Configured via `MAILING_ADDRESS` env var:
- **Netlify Production**: set in Site settings → Build & deploy → Environment
- **Local dev**: read from `credentials.env`
- **Build-time fallback**: hardcoded in `platform/src/layouts/CampaignLayout.astro` and the privacy pages so the address appears even if the env var is missing in any context.

When the address changes, update **all four** locations (Netlify env, `credentials.env`, `credentials.env.example`, and the hardcoded fallbacks in the three .astro files) so no stale value can leak through any path. `docs/FOUNDATION_SETUP.md` keeps an example value for new deployments.

---

## Health monitoring

Weekly check in `agent-instructions/MONITOR_HEALTH.md`:

- Domain expiry (≥30 days warning threshold)
- DKIM / SPF / DMARC all passing (test: `mail-tester.com` ≥9/10)
- Netlify A/CNAME resolving
- ImprovMX forwarding a canary email end-to-end
- SSL cert auto-renewal confirmed

---

## Change log

| Date | Change | By | Commit |
|---|---|---|---|
| 2026-04-22 | Initial scaffold; domains registered in Foundation, DNS not yet provisioned | Ben + Claude Code | (this commit) |
| 2026-04-29 | ImprovMX upgraded Free → Premium (yearly); outbound SMTP enabled for `ben@`; wired into Gmail Send-as so Ben can reply from `ben@fundburnabykids.ca`. Other aliases stay forward-only. No DNS change. | Ben + Claude Code | (this commit) |

Append one row per DNS or domain change. Never silently mutate DNS.
