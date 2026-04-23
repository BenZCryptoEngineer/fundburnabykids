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

All mailboxes are **aliases only** (ImprovMX → Ben's personal inbox). No real mailboxes.

| Address | Forward target | Purpose |
|---|---|---|
| `ben@fundburnabykids.ca` | Ben's personal | Founder public contact |
| `hello@fundburnabykids.ca` | Ben's personal | General inquiries |
| `privacy@fundburnabykids.ca` | Ben's personal | PIPA data requests |
| `campaign@fundburnabykids.ca` | — (send-only via Buttondown) | Newsletter sender address |
| `dmarc@fundburnabykids.ca` | Ben's personal | DMARC aggregate reports |

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

Append one row per DNS or domain change. Never silently mutate DNS.
