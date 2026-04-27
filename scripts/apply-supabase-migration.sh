#!/usr/bin/env bash
# Apply infrastructure/supabase-migrations.sql to the Supabase project via
# the Management API. Idempotent — re-running is safe; the file only adds
# things and uses CREATE ... IF NOT EXISTS / DROP CONSTRAINT IF EXISTS /
# DROP VIEW IF EXISTS guards.
#
# Required env (already in credentials.env at repo root, or in CI secrets):
#   SUPABASE_URL  — https://<ref>.supabase.co
#   SUPABASE_PAT  — sbp_... (Personal Access Token, NOT the service-role JWT)
#
# Usage:
#   source credentials.env && scripts/apply-supabase-migration.sh
# In CI:
#   env vars set as secrets, script invoked directly.

set -euo pipefail

if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_PAT:-}" ]]; then
  echo "error: SUPABASE_URL and SUPABASE_PAT must be set" >&2
  echo "       (source credentials.env, or set the GH Actions secrets)" >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SQL_FILE="${REPO_ROOT}/infrastructure/supabase-migrations.sql"

if [[ ! -f "$SQL_FILE" ]]; then
  echo "error: migration file not found at $SQL_FILE" >&2
  exit 1
fi

PROJECT_REF="${SUPABASE_URL#https://}"
PROJECT_REF="${PROJECT_REF%%.*}"

if [[ -z "$PROJECT_REF" ]]; then
  echo "error: could not derive project ref from SUPABASE_URL=$SUPABASE_URL" >&2
  exit 1
fi

echo "applying migration to project: $PROJECT_REF"
echo "sql file:                      $SQL_FILE ($(wc -l < "$SQL_FILE") lines)"

# JSON-encode the SQL via python (handles all escaping correctly).
PAYLOAD=$(python3 -c '
import json, sys
sql = open(sys.argv[1]).read()
print(json.dumps({"query": sql}))
' "$SQL_FILE")

HTTP_CODE=$(curl -sS -o /tmp/supa-migrate-response.json -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer ${SUPABASE_PAT}" \
  -H "Content-Type: application/json" \
  --data-binary "$PAYLOAD" \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query")

echo "http status: $HTTP_CODE"

if [[ "$HTTP_CODE" =~ ^2 ]]; then
  echo "migration applied successfully"
  # The Management API returns the result of the last statement (often empty).
  # Print a short tail of the body for the log without dumping huge results.
  head -c 400 /tmp/supa-migrate-response.json
  echo
  exit 0
else
  echo "migration FAILED. response body:" >&2
  cat /tmp/supa-migrate-response.json >&2
  echo >&2
  exit 1
fi
