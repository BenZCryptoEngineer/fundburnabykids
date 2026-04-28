#!/usr/bin/env bash
# Manual purge of test/smoke signatures from production.
#
# Why manual (not a pg_cron schedule): an automatic 10-minute purge is
# too eager — it can wipe a deliberate debug row a developer was about
# to inspect. Run this on demand instead, when test data has visibly
# accumulated.
#
# Required env (in credentials.env at repo root):
#   SUPABASE_URL  — https://<ref>.supabase.co
#   SUPABASE_PAT  — Personal Access Token (Account → Access Tokens)
#                   Same secret apply-migration.sh + smoke-db.sh use.
#
# Usage:
#   source credentials.env && scripts/purge-test-signatures.sh
#   source credentials.env && scripts/purge-test-signatures.sh --apply
#
# Default is dry-run: prints rows that WOULD be deleted, no DELETE runs.
# Pass --apply to execute. Idempotent — re-running on a clean DB is a
# no-op.
#
# Patterns matched (deliberately conservative — won't catch real
# signatures even if a real signer is named Test or Claude):
#   - first_name LIKE '_smoke_%' (smoke-db.sh sentinels)
#   - email_hash LIKE 'smoke_%' (smoke-db.sh dedup test hashes)
#   - pending_email matches RFC-2606 reserved test domains
#     (example.invalid / example.com / example.org)
#   - first_name IN (ClaudeTest, PlaywrightTest) AND last_initial='X'

set -euo pipefail

if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_PAT:-}" ]]; then
  echo "error: SUPABASE_URL and SUPABASE_PAT must be set" >&2
  echo "       (source credentials.env first)" >&2
  exit 1
fi

PROJECT_REF="${SUPABASE_URL#https://}"
PROJECT_REF="${PROJECT_REF%%.*}"
API="https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query"

APPLY=false
if [[ "${1:-}" == "--apply" ]]; then
  APPLY=true
fi

# WHERE clause is duplicated in the SELECT (preview) and DELETE (apply)
# branches. Keep them in sync — the preview must match exactly what the
# apply step would delete.
#
# Using POSIX regex (~) for the underscore-prefixed sentinels because
# LIKE '\\_smoke\\_%' ESCAPE '\\' got mangled across the bash → python
# json → JSON-over-HTTP → SQL pipeline (each layer doubles backslashes,
# leaving the SQL parser with a 2-byte ESCAPE which Postgres rejects).
# Regex underscores are literal — no escape ceremony.
WHERE_CLAUSE=$(cat <<'EOF'
  first_name ~ '^_smoke_'
  OR email_hash ~ '^smoke_'
  OR pending_email LIKE '%@example.invalid'
  OR pending_email LIKE '%@example.com'
  OR pending_email LIKE '%@example.org'
  OR (first_name IN ('ClaudeTest', 'PlaywrightTest') AND last_initial = 'X')
EOF
)

run_sql() {
  local sql="$1"
  local payload
  payload=$(python3 -c '
import json, sys
print(json.dumps({"query": sys.argv[1]}))
' "$sql")
  curl -sS -X POST \
    -H "Authorization: Bearer ${SUPABASE_PAT}" \
    -H "Content-Type: application/json" \
    --data-binary "$payload" \
    "$API"
}

echo "== preview: rows that would be deleted =="
PREVIEW_SQL="SELECT id, first_name, last_initial, school, signed_at, confirmed, pending_email FROM signatures WHERE ${WHERE_CLAUSE} ORDER BY signed_at DESC;"
preview=$(run_sql "$PREVIEW_SQL")
echo "$preview" | python3 -m json.tool 2>/dev/null || echo "$preview"
count=$(echo "$preview" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(len(d) if isinstance(d, list) else 0)' 2>/dev/null || echo "?")
echo
echo "== matched: $count row(s) =="

if [[ "$APPLY" != "true" ]]; then
  echo
  echo "(dry-run — pass --apply to actually DELETE)"
  exit 0
fi

if [[ "$count" == "0" ]]; then
  echo "(nothing to delete)"
  exit 0
fi

echo
echo "== applying delete =="
DELETE_SQL="DELETE FROM signatures WHERE ${WHERE_CLAUSE} RETURNING id, first_name;"
result=$(run_sql "$DELETE_SQL")
echo "$result" | python3 -m json.tool 2>/dev/null || echo "$result"
deleted=$(echo "$result" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(len(d) if isinstance(d, list) else 0)' 2>/dev/null || echo "?")
echo
echo "== deleted: $deleted row(s) =="
