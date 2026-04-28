#!/usr/bin/env bash
# Database-level smoke checks. Complements tests/smoke-test.sh, which only
# verifies HTTP routing — this one verifies schema + constraints + a real
# happy-path INSERT/UPDATE/SELECT cycle. Catches regressions like the
# v0.3 letter_token-column-missing incident, where the SQL migration had
# a runtime gap that no HTTP smoke could see.
#
# Required env (in CI: GH Actions secrets; locally: source credentials.env):
#   SUPABASE_URL  — https://<ref>.supabase.co
#   SUPABASE_PAT  — Personal Access Token (Account → Access Tokens)
#                   Same secret apply-migration.yml already uses.
#
# Usage:
#   tests/smoke-db.sh
#
# All test rows use first_name LIKE '_smoke_%' so a final cleanup DELETE
# wipes them even if an assertion failed mid-script. Re-running is safe.
#
# Exit code:
#   0 — all checks passed
#   1 — at least one schema / constraint / happy-path assertion failed

set -uo pipefail

if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_PAT:-}" ]]; then
  echo "error: SUPABASE_URL and SUPABASE_PAT must be set" >&2
  exit 1
fi

PROJECT_REF="${SUPABASE_URL#https://}"
PROJECT_REF="${PROJECT_REF%%.*}"
API="https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query"

PASS=0
FAIL=0
FAILED=()

# Run an arbitrary SQL query via the Supabase Management API. Echoes the
# response body to stdout, writes HTTP status to $SQL_HTTP_STATUS_FILE.
# Body and status are kept in separate streams so we don't have to parse
# them apart.
SQL_HTTP_STATUS_FILE=$(mktemp)
SQL_BODY_FILE=$(mktemp)

run_sql() {
  local sql="$1"
  local payload
  payload=$(python3 -c '
import json, sys
print(json.dumps({"query": sys.argv[1]}))
' "$sql")
  curl -sS -o "$SQL_BODY_FILE" -w '%{http_code}' -X POST \
    -H "Authorization: Bearer ${SUPABASE_PAT}" \
    -H "Content-Type: application/json" \
    --data-binary "$payload" \
    "$API" > "$SQL_HTTP_STATUS_FILE"
  cat "$SQL_BODY_FILE"
}

assert_pass() {
  local label="$1"
  PASS=$((PASS + 1))
  printf '\033[0;32m  PASS\033[0m  %s\n' "$label"
}

assert_fail() {
  local label="$1" reason="$2"
  FAIL=$((FAIL + 1))
  FAILED+=("$label")
  printf '\033[0;31m  FAIL\033[0m  %s — %s\n' "$label" "$reason"
}

# Always cleanup at exit, including on early failures.
cleanup() {
  run_sql "DELETE FROM signatures WHERE first_name LIKE '_smoke_%';" > /dev/null 2>&1 || true
}
trap 'cleanup; rm -f "$SQL_HTTP_STATUS_FILE" "$SQL_BODY_FILE"' EXIT

# Pre-clean any leftovers from a prior aborted run.
cleanup

echo "==== Schema checks ===="

# email_hash column exists (added in v0.3 migration). Was the regression
# we hit when the v0.2 migration silently failed before letter_token
# could be added — a column-existence assertion would have caught it.
body=$(run_sql "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='signatures' AND column_name IN ('email_hash','letter_token','locale') ORDER BY column_name;")
status=$(cat "$SQL_HTTP_STATUS_FILE")
if [[ "$status" =~ ^2 ]] && echo "$body" | python3 -c '
import json, sys
rows = json.load(sys.stdin)
need = {"email_hash", "letter_token", "locale"}
have = {r["column_name"] for r in rows}
sys.exit(0 if need <= have else 1)
'; then
  assert_pass "v0.3 columns present (email_hash, letter_token, locale)"
else
  assert_fail "v0.3 columns present" "got status=$status body=$body"
fi

# Partial UNIQUE index on (email_hash, petition_slug) WHERE confirmed=TRUE.
body=$(run_sql "SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename='signatures' AND indexname='signatures_email_hash_confirmed_unique';")
status=$(cat "$SQL_HTTP_STATUS_FILE")
if [[ "$status" =~ ^2 ]] && echo "$body" | python3 -c '
import json, sys
rows = json.load(sys.stdin)
sys.exit(0 if len(rows) == 1 else 1)
'; then
  assert_pass "dedup partial-UNIQUE index present"
else
  assert_fail "dedup partial-UNIQUE index present" "got status=$status body=$body"
fi

echo
echo "==== Dedup constraint ===="

TS=$(date +%s)
HASH_DEDUP="_smoke_dedup_hash_${TS}"

# Insert a confirmed row with email_hash=HASH_DEDUP. Should succeed.
body=$(run_sql "INSERT INTO signatures (first_name, last_initial, school, grade, neighbourhood, confirmed, email_hash, petition_slug) VALUES ('_smoke_d1_${TS}', 'X', 'Smoke', 'K', 'Smoke', true, '${HASH_DEDUP}', 'fund-burnaby-kids');")
status=$(cat "$SQL_HTTP_STATUS_FILE")
if [[ "$status" =~ ^2 ]]; then
  assert_pass "first confirmed row inserts"
else
  assert_fail "first confirmed row inserts" "got status=$status body=$body"
fi

# Second confirmed row with same email_hash. Must fail with 23505
# unique_violation. If this passes, dedup is broken and the application
# layer is the only thing standing between the user and duplicate rows.
body=$(run_sql "INSERT INTO signatures (first_name, last_initial, school, grade, neighbourhood, confirmed, email_hash, petition_slug) VALUES ('_smoke_d2_${TS}', 'X', 'Smoke', 'K', 'Smoke', true, '${HASH_DEDUP}', 'fund-burnaby-kids');")
status=$(cat "$SQL_HTTP_STATUS_FILE")
if [[ "$status" =~ ^4 ]] && echo "$body" | grep -q 'duplicate key\|23505\|unique'; then
  assert_pass "duplicate confirmed row rejected (23505)"
else
  assert_fail "duplicate confirmed row rejected" "expected 4xx + unique violation, got status=$status body=$body"
fi

# Pending rows with same email_hash should still be allowed (the partial
# index is WHERE confirmed=TRUE). This is the case where a signer
# re-submits before confirming the first attempt — submit.ts UPDATEs the
# pending row, but at the SQL level a stray INSERT shouldn't be blocked.
body=$(run_sql "INSERT INTO signatures (first_name, last_initial, school, grade, neighbourhood, confirmed, email_hash, petition_slug) VALUES ('_smoke_d3_${TS}', 'X', 'Smoke', 'K', 'Smoke', false, '${HASH_DEDUP}', 'fund-burnaby-kids');")
status=$(cat "$SQL_HTTP_STATUS_FILE")
if [[ "$status" =~ ^2 ]]; then
  assert_pass "pending row with same email_hash allowed (partial index)"
else
  assert_fail "pending row with same email_hash allowed" "got status=$status body=$body"
fi

echo
echo "==== Happy path: INSERT pending → UPDATE confirmed → SELECT ===="

TOKEN_HP="_smoke_token_${TS}_$$"
LETTER_HP="_smoke_letter_${TS}_$$"
HASH_HP="_smoke_hp_hash_${TS}"

# INSERT a pending row mimicking what submit.ts writes.
body=$(run_sql "INSERT INTO signatures (first_name, last_initial, school, grade, neighbourhood, confirmed, confirm_token, confirm_token_expires, pending_email, pending_locale, email_hash, petition_slug) VALUES ('_smoke_hp_${TS}', 'X', 'Smoke', 'K', 'Smoke', false, '${TOKEN_HP}', NOW() + INTERVAL '48 hours', 'smoke@example.invalid', 'en', '${HASH_HP}', 'fund-burnaby-kids');")
status=$(cat "$SQL_HTTP_STATUS_FILE")
if [[ "$status" =~ ^2 ]]; then
  assert_pass "pending row INSERT (submit.ts shape)"
else
  assert_fail "pending row INSERT" "got status=$status body=$body"
fi

# UPDATE mimicking confirm-signature.ts: flip confirmed, populate
# letter_token + locale, NULL the pending_* fields.
body=$(run_sql "UPDATE signatures SET confirmed=true, validated_at=NOW(), confirm_token=NULL, confirm_token_expires=NULL, pending_email=NULL, pending_consent_updates=NULL, pending_locale=NULL, locale='en', letter_token='${LETTER_HP}' WHERE confirm_token='${TOKEN_HP}';")
status=$(cat "$SQL_HTTP_STATUS_FILE")
if [[ "$status" =~ ^2 ]]; then
  assert_pass "confirm UPDATE (confirm-signature.ts shape)"
else
  assert_fail "confirm UPDATE" "got status=$status body=$body"
fi

# Verify the row is fully shaped: confirmed=true, letter_token populated,
# pending_* NULLed, email_hash long-lived.
body=$(run_sql "SELECT confirmed, letter_token, pending_email, email_hash FROM signatures WHERE letter_token='${LETTER_HP}';")
status=$(cat "$SQL_HTTP_STATUS_FILE")
if [[ "$status" =~ ^2 ]] && echo "$body" | python3 -c "
import json, sys
rows = json.load(sys.stdin)
if len(rows) != 1: sys.exit(1)
r = rows[0]
ok = (
  r['confirmed'] is True and
  r['letter_token'] == '${LETTER_HP}' and
  r['pending_email'] is None and
  r['email_hash'] == '${HASH_HP}'
)
sys.exit(0 if ok else 1)
"; then
  assert_pass "post-confirm row shape (confirmed=t, letter_token set, pending_email NULL, email_hash retained)"
else
  assert_fail "post-confirm row shape" "got status=$status body=$body"
fi

# Verify public_signatures view shows the row.
body=$(run_sql "SELECT first_name FROM public_signatures WHERE first_name='_smoke_hp_${TS}';")
status=$(cat "$SQL_HTTP_STATUS_FILE")
if [[ "$status" =~ ^2 ]] && echo "$body" | python3 -c '
import json, sys
rows = json.load(sys.stdin)
sys.exit(0 if len(rows) == 1 else 1)
'; then
  assert_pass "public_signatures view exposes confirmed row"
else
  assert_fail "public_signatures view exposes confirmed row" "got status=$status body=$body"
fi

echo
echo "========================================"
echo "  $PASS passed, $FAIL failed (DB)"
echo "========================================"

if [[ $FAIL -gt 0 ]]; then
  echo
  echo "Failed checks:"
  for f in "${FAILED[@]}"; do echo "  - $f"; done
  exit 1
fi
exit 0
