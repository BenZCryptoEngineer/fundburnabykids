#!/usr/bin/env bash
# Hit every URL the deploy is supposed to serve and assert the response
# matches expectation. Run against:
#   - astro preview local server (in CI, before deploy)
#   - the live deployed site (post-deploy verification)
#
# Usage:
#   tests/smoke-test.sh http://localhost:4321
#   tests/smoke-test.sh https://fundburnabykids.ca
#
# Exit code:
#   0 — all checks passed
#   1 — at least one URL didn't match expectation

set -uo pipefail

BASE="${1:-http://localhost:4321}"
BASE="${BASE%/}"  # strip trailing slash

# Each row: METHOD<TAB>URL<TAB>EXPECTED_STATUS<TAB>EXPECTED_BODY_REGEX_OR_-
# A "-" expected_body means we don't grep the body (status check only).
# For SSR routes returning 404 (e.g. /letters/<garbage>), we ALSO grep
# the body for our own 404 marker so we don't accept Netlify's default
# "Page not found" yellow page (which would mean the SSR function isn't
# even getting called).
read -r -d '' CHECKS <<'EOF' || true
GET	/	200	Fund Burnaby Kids
GET	/zh/	200	Fund Burnaby Kids
GET	/confirm-thanks/	200	Check your email
GET	/zh/confirm-thanks/	200	请查收邮件
GET	/confirmed/	200	-
GET	/zh/confirmed/	200	-
GET	/confirm-failed/	200	-
GET	/zh/confirm-failed/	200	-
GET	/methodology/	200	-
GET	/zh/methodology/	200	-
GET	/privacy/	200	Privacy
GET	/zh/privacy/	200	-
GET	/pac-kit/	200	-
GET	/zh/pac-kit/	200	-
GET	/withdrawn/	200	-
GET	/zh/withdrawn/	200	-
GET	/withdraw-failed/	200	-
GET	/zh/withdraw-failed/	200	-
GET	/find-my-signature/	200	Recover
GET	/zh/find-my-signature/	200	找回
GET	/letters/garbage_test_token_aaaaaa/	404	Letter not found
GET	/zh/letters/garbage_test_token_aaaaaa/	404	未找到该信件
GET	/mla/kang/	200	Anne Kang
GET	/zh/mla/kang/	200	Anne Kang
GET	/mla/nonexistent_id/	404	-
GET	/mla/kang	301	-
GET	/zh/mla/kang	301	-
GET	/withdraw/garbage_test_token_aaaaaa/	404	Signature not found
GET	/zh/withdraw/garbage_test_token_aaaaaa/	404	未找到该签名
GET	/confirm-thanks	301	-
GET	/confirmed	301	-
GET	/methodology	301	-
GET	/privacy	301	-
GET	/pac-kit	301	-
GET	/withdrawn	301	-
GET	/withdraw-failed	301	-
GET	/zh/confirm-thanks	301	-
GET	/zh/confirmed	301	-
GET	/zh/methodology	301	-
EOF

PASS=0
FAIL=0
FAILED_URLS=()

while IFS=$'\t' read -r method url expected_status expected_body; do
  [ -z "$method" ] && continue
  full="$BASE$url"

  # Use curl to fetch; -s silent, -o save body, -w status
  body_file=$(mktemp)
  status=$(curl -sS -o "$body_file" -w "%{http_code}" -X "$method" "$full" --max-time 15 || echo "000")

  ok=1
  reason=""

  if [ "$status" != "$expected_status" ]; then
    ok=0
    reason="status=$status (expected $expected_status)"
  elif [ "$expected_body" != "-" ]; then
    if ! grep -q -F "$expected_body" "$body_file"; then
      ok=0
      reason="body missing '$expected_body'"
    fi
  fi

  if [ $ok -eq 1 ]; then
    PASS=$((PASS + 1))
    printf '\033[0;32m  PASS\033[0m  %s %-50s -> %s\n' "$method" "$url" "$status"
  else
    FAIL=$((FAIL + 1))
    FAILED_URLS+=("$url")
    printf '\033[0;31m  FAIL\033[0m  %s %-50s -> %s [%s]\n' "$method" "$url" "$status" "$reason"
  fi

  rm -f "$body_file"
done <<< "$CHECKS"

# POST /api/submit smoke check. We use the honeypot field so the request
# short-circuits in submit.ts before any DB write — same response shape
# (303 → /confirm-thanks/) as a real submission. Catches the regression
# where /api/submit 404s because the function isn't wired (see
# netlify/functions/submit.ts header).
submit_status=$(curl -sS -o /dev/null -w "%{http_code}" -X POST \
  "$BASE/api/submit" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "form-name=signature" \
  --data-urlencode "bot-field=smoke" \
  --data-urlencode "locale=en" \
  --max-time 15 || echo "000")
submit_loc=$(curl -sS -o /dev/null -w "%{redirect_url}" -X POST \
  "$BASE/api/submit" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "form-name=signature" \
  --data-urlencode "bot-field=smoke" \
  --data-urlencode "locale=en" \
  --max-time 15 || echo "")
if [ "$submit_status" = "303" ] && echo "$submit_loc" | grep -q "/confirm-thanks/"; then
  PASS=$((PASS + 1))
  printf '\033[0;32m  PASS\033[0m  %s %-50s -> %s\n' "POST" "/api/submit (honeypot)" "$submit_status"
else
  FAIL=$((FAIL + 1))
  FAILED_URLS+=("/api/submit (honeypot)")
  printf '\033[0;31m  FAIL\033[0m  %s %-50s -> %s [loc=%s]\n' "POST" "/api/submit (honeypot)" "$submit_status" "$submit_loc"
fi

# POST /api/recover smoke check. Honeypot tripped so the function bails
# before looking up the email — same 303 → /find-my-signature/?sent=1
# response shape as a real recovery request.
recover_status=$(curl -sS -o /dev/null -w "%{http_code}" -X POST \
  "$BASE/api/recover" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "bot-field=smoke" \
  --data-urlencode "email=smoke@example.invalid" \
  --data-urlencode "locale=en" \
  --max-time 15 || echo "000")
recover_loc=$(curl -sS -o /dev/null -w "%{redirect_url}" -X POST \
  "$BASE/api/recover" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "bot-field=smoke" \
  --data-urlencode "email=smoke@example.invalid" \
  --data-urlencode "locale=en" \
  --max-time 15 || echo "")
if [ "$recover_status" = "303" ] && echo "$recover_loc" | grep -q "/find-my-signature/?sent=1"; then
  PASS=$((PASS + 1))
  printf '\033[0;32m  PASS\033[0m  %s %-50s -> %s\n' "POST" "/api/recover (honeypot)" "$recover_status"
else
  FAIL=$((FAIL + 1))
  FAILED_URLS+=("/api/recover (honeypot)")
  printf '\033[0;31m  FAIL\033[0m  %s %-50s -> %s [loc=%s]\n' "POST" "/api/recover (honeypot)" "$recover_status" "$recover_loc"
fi

echo
echo "========================================"
echo "  $PASS passed, $FAIL failed against $BASE"
echo "========================================"

if [ $FAIL -gt 0 ]; then
  echo
  echo "Failed URLs:"
  for u in "${FAILED_URLS[@]}"; do echo "  - $u"; done
  exit 1
fi
exit 0
