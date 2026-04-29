# Foundation Setup — Manual One-Time Work

**For:** Ben Zhou
**Time required:** 2-3 hours total, spread over 2-3 days (some steps require waiting)
**Purpose:** Create all the external accounts, credentials, and physical infrastructure that agents (Claude Code, Claude Desktop) cannot create for you. Once this is done, you hand everything off to agents and they operate the platform.

**Critical principle**: This file describes the *only* manual work you ever do again for infrastructure. After this, every operation—deploying, updating, sending, responding—can be agent-driven.

---

## Why this work exists

Agents cannot do these things because of fundamental limitations:

- **Identity verification** — domain registrars, payment processors, postal services require phone/email/photo ID verification of a real person
- **Payment authorization** — you must authorize the initial payment method; agents can spend *from* pre-loaded credit but cannot add cards
- **Legal signatures** — PO Box rental is a contract
- **OAuth flows with 2FA** — require your physical device

Everything *else* after this setup, agents can do.

---

## Order of operations

Do in this order. Some steps depend on earlier ones.

```
Day 1:
  1. Porkbun account + domains          (45 min)
  2. PO Box application at Canada Post  (30 min, then 1-3 day wait)
  3. GitHub Personal Access Token        (10 min)
  4. Netlify account + PAT               (15 min)
  5. Supabase account + project          (20 min)

Day 2-3 (after PO Box confirmation):
  6. Buttondown account + sender verification  (30 min)
  7. ImprovMX free account                     (10 min)
  8. Consolidate credentials                   (15 min)
```

Total: ~2.5 hours active + 1-3 days passive waiting.

---

## Step 1: Porkbun (domain registrar)

**Go to** https://porkbun.com

1. Create account. Verify email and phone.
2. Add $150 CAD of account credit at Billing → Account Credit.
   (Enough for 2 domains × 5 years + DNS costs. Agents can spend *from* this credit but cannot add more.)
3. Register these two domains with WHOIS privacy ON for each:
   - `fundburnabykids.ca`
   - `burnabykidsfirst.ca`
4. Go to Account → API Access.
   - Enable API Access on your account
   - Click "Create API Key"
   - Save both `API Key` (starts with `pk1_...`) and `Secret Key` (starts with `sk1_...`)
5. For *each* domain, go to domain settings and toggle on "Allow API access for this domain". **This is required separately per domain or the API cannot manage it.**

**Save to credentials file:**
```
PORKBUN_API_KEY=pk1_...
PORKBUN_SECRET_KEY=sk1_...
```

---

## Step 2: Canada Post PO Box

**Why needed:** CASL (Canada's Anti-Spam Legislation) requires a physical mailing address in every marketing email sent. A PO Box satisfies this.

**Go to** https://www.canadapost-postescanada.ca/cpc/en/personal/receiving/po-box.page or a local Canada Post outlet.

1. Apply for a PO Box in Burnaby (any outlet). Smallest size is fine — we receive zero physical mail.
2. Takes 1-3 business days to activate.
3. Once confirmed, you have an address like:

```
PO Box XXXX
Station Willingdon
Burnaby, BC V5C 5W6
Canada
```

**Save to credentials file:**
```
MAILING_ADDRESS=PO Box 44021 Burnaby RPO Kensington Sq, BC, V5B 4Y2
```

---

## Step 3: GitHub Personal Access Token

**Why needed:** Claude Code pushes code to GitHub using your identity.

**Go to** https://github.com/settings/tokens?type=beta

1. Generate new token → Fine-grained personal access token
2. Name: `burnabykidsfirst-coalition-agent`
3. Expiration: 1 year
4. Repository access: "Only select repositories" → later add the specific repos
5. Permissions:
   - Contents: Read and write
   - Pull requests: Read and write
   - Metadata: Read
6. Generate, copy once (starts with `github_pat_...`)

**Save to credentials file:**
```
GITHUB_PAT=github_pat_...
```

---

## Step 4: Netlify

**Go to** https://app.netlify.com

1. Sign up with GitHub (OAuth). Easiest path.
2. Go to User Settings → Applications → Personal access tokens
3. New access token: `burnabykidsfirst-coalition-agent`, no expiration
4. Copy token (starts with anything, usually a long string)

**Save to credentials file:**
```
NETLIFY_PAT=...
```

*Do not create a site yet.* Claude Code will create the site programmatically via the Netlify API, so site name, environment variables, and form settings are all set automatically. This is the agent-first approach.

---

## Step 5: Supabase

**Go to** https://supabase.com

1. Sign up with GitHub (OAuth).
2. Create new project:
   - Name: `burnabykidsfirst-platform`
   - Region: **`ca-central-1`** (Canadian data residency matters for PIPA)
   - Database password: generate a strong one, save it
3. Wait ~2 minutes for provisioning.
4. Go to Settings → API. You need three values:
   - Project URL (`https://xxxxx.supabase.co`)
   - Anon public key (`eyJhbG...`) — OK to be public
   - Service role key (`eyJhbG...`) — **SECRET, backend only**
5. Generate a Personal Access Token for agent operations:
   - Go to Account → Access Tokens → Generate new token
   - Name: `coalition-agent`
   - Copy token

**Save to credentials file:**
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
SUPABASE_PAT=sbp_...
SUPABASE_DB_PASSWORD=...
```

---

## Step 6: Buttondown (email service) — *wait until PO Box confirmed*

**Why wait:** Buttondown requires a verified physical mailing address before you can send to real subscribers.

**Go to** https://buttondown.email

1. Sign up with GitHub (OAuth).
2. Select a plan. The Hobby plan ($9/month) is sufficient for <1,000 subscribers. Add payment method.
3. Settings → Newsletter:
   - Newsletter name: `Burnaby Kids First`
   - From name: `Fund Burnaby Kids`
   - Physical mailing address: **fill in your PO Box address from Step 2**
4. Settings → Domain Setup:
   - Add custom sending domain: `fundburnabykids.ca`
   - Buttondown gives you 3 DNS records (DKIM, SPF, DMARC)
   - You'll configure these in Porkbun via Claude Code later—just copy the values now
5. Settings → API Keys:
   - Generate new API key
   - Copy it

**Save to credentials file:**
```
BUTTONDOWN_API_KEY=...
BUTTONDOWN_DKIM_RECORD=<value from Buttondown>
BUTTONDOWN_SPF_RECORD=<value from Buttondown>
BUTTONDOWN_DMARC_RECORD=<value from Buttondown>
```

---

## Step 7: ImprovMX (email forwarding)

**Go to** https://improvmx.com

1. Sign up (free tier, no payment required).
2. Add domain: `fundburnabykids.ca`
3. ImprovMX gives you 2 MX records to add. Copy these.
4. Create aliases:
   - `ben@fundburnabykids.ca` → your personal email
   - `hello@fundburnabykids.ca` → your personal email
   - `privacy@fundburnabykids.ca` → your personal email
5. (Optional) Generate API key: Account → API
   - Copy token

**Save to credentials file:**
```
IMPROVMX_API_KEY=<optional>
IMPROVMX_MX_1=mx1.improvmx.com
IMPROVMX_MX_2=mx2.improvmx.com
```

---

## Step 8: Anthropic API key (for Claude Desktop + future agents)

**Go to** https://console.anthropic.com

1. Log in (or create account).
2. Settings → API Keys → Create Key
3. Name: `coalition-agent`
4. Copy key (`sk-ant-...`)

**Save to credentials file:**
```
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Step 9: Consolidate into one credentials file

Create `~/.coalition/credentials.env` on your computer with all the values above. This file:

- Never goes in git (add to `.gitignore` globally)
- Is read by Claude Code when you hand off
- Is referenced by Claude Desktop's MCP server configurations
- Is the single source of truth for agent credentials

```bash
# Create the directory
mkdir -p ~/.coalition
chmod 700 ~/.coalition  # Owner-only permissions

# Create the credentials file
nano ~/.coalition/credentials.env
chmod 600 ~/.coalition/credentials.env
```

Paste everything from steps 1-8 into that file.

**Do NOT commit this file to git. Ever. Anywhere.**

---

## Step 10: Install the MCP servers for Claude Desktop

Before your first Claude Desktop day-to-day operations session, install these MCP servers. This is a one-time setup on your laptop.

**Location of Claude Desktop config (macOS):**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

Paste this config (filling in values from your credentials file):

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
      "args": ["-y", "@supabase/mcp-server-supabase@latest", "--access-token", "sbp_..."],
      "env": {}
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "github_pat_..."
      }
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/YOUR_USERNAME/projects/burnabykidsfirst-coalition"
      ]
    },
    "fetch": {
      "command": "uvx",
      "args": ["mcp-server-fetch"]
    }
  }
}
```

Restart Claude Desktop. You should see the tool icon (🔧) showing these MCP servers are connected.

**Note**: Netlify and Buttondown don't have official MCP servers (as of April 2026). Claude Desktop will use the `fetch` MCP server to call their REST APIs directly, which works fine for the operations we need.

---

## Verification checklist

Before handing off to Claude Code, confirm:

- [ ] Both domains registered at Porkbun with WHOIS privacy; API access enabled on each
- [ ] Porkbun account has ≥$100 CAD credit for future domain operations
- [ ] PO Box address is real and confirmed (you've received the key)
- [ ] GitHub PAT generated with repo read/write permissions
- [ ] Netlify PAT generated
- [ ] Supabase project in `ca-central-1` region with PAT
- [ ] Buttondown account with physical address = real PO Box, sender domain started verification
- [ ] ImprovMX domain added, 3 aliases created
- [ ] Anthropic API key generated
- [ ] `~/.coalition/credentials.env` exists with all 11 required values
- [ ] Claude Desktop MCP config installed and tool icon visible
- [ ] `.gitignore` globally has `credentials.env` pattern blocked

When all 12 are checked, move to `CLAUDE_CODE_BOOTSTRAP_PROMPT.md`.

---

## What happens if you skip a step

| Skipped | Consequence |
|---|---|
| Porkbun API access per-domain | Agent can't update DNS; manual Porkbun UI trips only |
| PO Box | CASL violation on first subscriber email → potential $1M fine |
| Supabase in non-CA region | PIPA compliance weakened for BC residents |
| Consolidated credentials file | Every agent session you re-paste credentials (error-prone) |
| MCP config | Claude Desktop can't do day-to-day operations, you're back to web UIs |

---

## What's intentionally NOT in this foundation

Things that are agent-operable and don't need manual setup:

- Website repository structure (Claude Code creates)
- Supabase tables and RLS (Claude Code runs migrations)
- Netlify site + environment variables (Claude Code creates via API)
- DNS records (Claude Code configures via Porkbun MCP)
- Buttondown welcome email + templates (Claude Code configures via REST API)
- Agent instruction documents (Claude Code generates the first versions, you iterate)

You've built the foundation. The agents build the building.
