# HANDOFF — for an incoming local Claude Code session

You're picking up mid-task from a previous Claude Code session that ran in the
claude.ai web sandbox. That sandbox had outbound network restrictions
(allowlist blocked `api.supabase.com`, `api.netlify.com`, `*.netlify.app`,
`fundburnabykids.ca`, Cloudflare DoH, the Edge Functions runtime download URL).
You're on the user's actual machine — none of those restrictions apply, you
can hit production directly, run `netlify dev`, run Playwright, etc.

## First read these, in order

1. **TODO.md § "ACTIVE BUG"** — top of the file. The user reports filling the
   signature form, clicking Sign, and landing on Netlify's default "Page not
   found." Two redirect-rule fixes shipped (`c16b2a9`, `b489d44`) didn't
   resolve it. Hypotheses are listed; previous session couldn't test live
   because of the allowlist.
2. **CLAUDE.md** — full architecture state. The "Architecture state (post-v0.2)"
   section is new and describes the SSR adapter setup, trailing-slash
   invariant, and per-signer letter system that landed in the last session.
3. `git log --oneline | head -25` — the v0.2 commit chain.

## What you should do first

```bash
# 1. You're on b489d44 (or later). Confirm.
git log --oneline -3

# 2. Run the curl tests from TODO.md § "How a local session can confirm root
#    cause in 5 minutes". You can actually run these — the previous session
#    couldn't.
curl -sI -L https://fundburnabykids.ca/confirm-thanks
curl -sI -X POST https://fundburnabykids.ca/confirm-thanks/ \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "form-name=signature" \
  --data-urlencode "firstname=ClaudeTest" \
  --data-urlencode "lastname=DontStore" \
  --data-urlencode "email=claude-smoke-test@example.invalid" \
  --data-urlencode "school=Capitol Hill" \
  --data-urlencode "grade=2" \
  --data-urlencode "postal=V5B 3X6" \
  --data-urlencode "consent-public=on" \
  --data-urlencode "school_neighbourhood=Capitol Hill" \
  --data-urlencode "locale=en"

# 3. If the redirect / form POST tests don't pinpoint it, run a real browser
#    test. The previous session shipped a smoke-test.sh but no Playwright; add
#    one as part of the fix so this regression can never silently ship again.
cd platform
npm install --save-dev @playwright/test
npx playwright install chromium
# Then write tests/e2e-form-submit.spec.ts that:
# - navigates to https://fundburnabykids.ca/
# - fills the form with throwaway data
# - clicks Sign
# - asserts the next page contains "Check your email"

# 4. Check Netlify dashboard → Forms tab → is the "signature" form listed
#    under detected forms? If not, that's the smoking gun for hypothesis 1
#    (Netlify Forms detection failing, possibly because the SSR adapter is
#    making something about index.html not look "static" to Netlify's scanner).
```

## How to run a full production simulation locally

```bash
# Edge Functions runtime download was the blocker for the previous session.
# On a real machine it should just work.
cd /path/to/fundburnabykids
npx netlify dev --port 8888
# Visit http://localhost:8888 — full simulation including Forms, redirects, SSR.
# Submit the form; observe whether you hit the same 404 or whether it works
# locally (would tell us the bug is production-only).
```

## Repository conventions you should follow

- **Reply in Chinese** to the user (Simplified or Traditional, mirror them).
- **Repo files stay English** — code, YAML, SQL, commit messages.
- **Commits**: single coherent feature per commit, message body explains the
  *why*. Co-author trailer
  `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
- **Always `astro check && astro build` before pushing**. CI now gates this
  but local feedback is faster.
- **Never push to a different branch without explicit permission.** Current
  branch contract: `claude/review-todo-files-2WYo5` for development; the user
  has previously authorized direct push to main for this repo (see CLAUDE.md
  "When committing"). Confirm authorization is still in effect for any push
  to main.

## Credentials

`credentials.env` at repo root (gitignored) has every key. `source
credentials.env` before scripts that need Supabase / Resend / Netlify /
Turnstile / Cloudflare / Buttondown access. The previous session's GH Actions
secrets (`SUPABASE_URL`, `SUPABASE_PAT`) are already configured — see
`docs/DEPLOY.md` for the playbook.

## What's expected to be working

- Production deploy at `b489d44` includes: trailing-slash redirects, withdrawal
  endpoint at `/withdraw/<token>/`, school-derived neighbourhood UI, OG cards
  on letter pages.
- CI workflow (`.github/workflows/ci.yml`) validates every push.
- Smoke test workflow (`.github/workflows/smoke-test-prod.yml`) runs against
  prod every 30 min.
- `/letters/<token>/`, `/mla/<id>/`, `/withdraw/<token>/` are all SSR routes
  served by the `@astrojs/netlify` v6 function. They worked end-to-end in
  manual testing before the form-submit issue surfaced.

## What's known broken (one item)

The active bug in TODO.md: form submit lands on 404. Fix this first.

Once fixed:
- Add a Playwright e2e test so the regression can't silently re-ship.
- Update `tests/smoke-test.sh` if the fix changes any URLs/expectations.
- Confirm CI green + smoke-test green before declaring done.
- Reply to the user with what the actual root cause was — they've been waiting
  on confirmation.

Welcome aboard.
