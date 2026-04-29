-- ============================================================================
-- Burnaby Kids First — Initial Database Schema (v0.1)
-- ============================================================================
-- Apply once to a fresh Supabase project (region: ca-central-1).
-- Run via Supabase MCP, the SQL editor in Supabase Dashboard, or psql.
--
-- Idempotent where reasonable (CREATE TABLE IF NOT EXISTS, OR REPLACE VIEW,
-- DROP/CREATE policies). Re-running on a populated database is safe but will
-- not migrate existing data shape — for that, write a v0.2 migration.
--
-- Tables:
--   signatures              — petition signatories with confirmation lifecycle
--   pac_endorsements        — Parent Advisory Council endorsements
--   mla_replies             — reserved for v2 (MLA reply capture)
--
-- Views:
--   public_signatures       — anon-readable, only confirmed + non-anonymized
--   public_pac_endorsements — anon-readable, only verified
--
-- Scheduled jobs (pg_cron):
--   purge-expired-pending-signatures  — hourly, drops expired pending rows
-- Manual cleanup tools (NOT scheduled):
--   scripts/purge-test-signatures.sh  — on-demand, drops smoke/test rows
--
-- IP / fraud-detection design follows alphagov/e-petitions (UK Parliament):
--   - Raw IP stored at submission AND at validation (two events)
--   - No IP hashing (no industry precedent)
--   - Anonymization on lifecycle event (campaign close + 90 days), not cron
--   - Fraud detection is query-based (GROUP BY ip_address)
-- ============================================================================

-- Required extensions.
--   pgcrypto: pre-installed on Supabase, no enabling needed.
--   pg_cron:  installed but NOT auto-enabled. CREATE EXTENSION below enables it.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- IMPORTANT: If the Supabase project was created with
-- "Automatically expose new tables and functions" UNCHECKED in the
-- Data API security settings (recommended for tighter access control),
-- then NEW tables in the public schema are NOT auto-granted to the
-- Data API roles (anon, authenticated, service_role). The Netlify
-- Functions use the service_role key, so without explicit GRANTs
-- the Functions get HTTP 403 "permission denied for table X".
--
-- The GRANTs at the BOTTOM of this file fix that. Do not remove them
-- even if it looks redundant — Supabase does not auto-grant in this
-- security mode. Verified via acceptance test on 2026-04-26.


-- ----------------------------------------------------------------------------
-- TABLE: signatures
-- ----------------------------------------------------------------------------
-- Lifecycle:
--   1. POST to on-signature function:
--        INSERT with confirmed=FALSE, confirm_token=<random>,
--        confirm_token_expires=NOW()+'48h', pending_email=<email>,
--        pending_consent_updates=<bool>, ip_address=<remote_ip>
--   2. User clicks confirmation link within 48h:
--        UPDATE WHERE confirm_token=? SET
--          confirmed=TRUE, validated_at=NOW(), validated_ip=<remote_ip>,
--          confirm_token=NULL, confirm_token_expires=NULL,
--          pending_email=NULL, pending_consent_updates=NULL
--        (Email + consent are dropped after processing — the only persistent
--         PII on this row becomes first_name + last_initial + school +
--         neighbourhood + IP.)
--   3. Hourly cron purges any row with confirmed=FALSE AND
--      confirm_token_expires < NOW() — unconfirmed within 48h is gone.
--   4. After campaign close + 90 days, manually run anonymization:
--        UPDATE signatures
--        SET ip_address=NULL, validated_ip=NULL, anonymized_at=NOW()
--        WHERE petition_slug='fund-burnaby-kids';
--      (No automated trigger — Ben runs this when ready.)
--
-- Public visibility: public_signatures view (below) exposes only confirmed,
-- non-anonymized rows with safe columns.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS signatures (
  id                        BIGSERIAL PRIMARY KEY,

  -- Public-display data (retained indefinitely for the historical record)
  first_name                TEXT NOT NULL,
  last_initial              CHAR(1) NOT NULL,
  school                    TEXT NOT NULL,
  grade                     TEXT NOT NULL,
  neighbourhood             TEXT NOT NULL,

  -- Provincial riding (post-2024 redistribution Elections BC abbreviation:
  -- BNC/BNE/BNN/BNO/BNS). Derived from postal-code FSA at submission time;
  -- nullable because non-Burnaby postal codes don't map. See netlify/functions/
  -- _shared.ts for the FSA → riding_id table.
  riding_id                 TEXT,

  -- Petition identifier (one row per petition signed; future-proof for
  -- multi-campaign deployments under the umbrella).
  petition_slug             TEXT NOT NULL DEFAULT 'fund-burnaby-kids',

  -- Confirmation lifecycle
  confirmed                 BOOLEAN NOT NULL DEFAULT FALSE,
  confirm_token             TEXT UNIQUE,
  confirm_token_expires     TIMESTAMPTZ,
  signed_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  validated_at              TIMESTAMPTZ,

  -- Pending fields (held for at most 48h, NULLed on confirmation or expiry)
  pending_email             TEXT,
  pending_consent_updates   BOOLEAN,
  pending_locale            TEXT,  -- 'en' or 'zh', used to pick email template

  -- Long-lived locale (copied from pending_locale at confirmation; the
  -- pending_* fields are NULLed there, so we'd otherwise lose the signer's
  -- chosen language for rendering their per-signer letter page).
  locale                    TEXT,

  -- Public letter token. Generated at confirmation time (alongside the flip
  -- to confirmed=TRUE) so each signer has a stable, shareable URL at
  -- /letters/<letter_token>. Distinct from confirm_token: confirm_token is
  -- single-use and cleared after confirmation; letter_token is long-lived
  -- and revocable (NULL it to drop a letter from public view without
  -- triggering full-row anonymization). UNIQUE constraint is added by the
  -- explicit ALTER block below (named signatures_letter_token_unique) so it
  -- works idempotently for both fresh and existing DBs.
  letter_token              TEXT,

  -- Fraud-detection data (anonymized 90 days after campaign close)
  ip_address                INET,
  validated_ip              INET,
  anonymized_at             TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT signatures_first_name_length    CHECK (char_length(first_name)    BETWEEN 1 AND 40),
  CONSTRAINT signatures_last_initial_length  CHECK (char_length(last_initial)  = 1),
  CONSTRAINT signatures_school_length        CHECK (char_length(school)        BETWEEN 1 AND 80),
  CONSTRAINT signatures_grade_length         CHECK (char_length(grade)         BETWEEN 1 AND 20),
  CONSTRAINT signatures_neighbourhood_length CHECK (char_length(neighbourhood) BETWEEN 1 AND 80),
  CONSTRAINT signatures_pending_email_basic  CHECK (
    pending_email IS NULL OR pending_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  CONSTRAINT signatures_pending_locale_valid CHECK (
    pending_locale IS NULL OR pending_locale IN ('en','zh')
  ),
  CONSTRAINT signatures_locale_valid CHECK (
    locale IS NULL OR locale IN ('en','zh')
  )
);

-- Idempotent column adds. MUST run BEFORE the CREATE INDEX block below —
-- on an existing DB, CREATE TABLE IF NOT EXISTS above is a no-op (so the
-- columns listed there don't actually get added), and any partial index
-- referencing one of those columns (e.g. WHERE letter_token IS NOT NULL)
-- fails with `42703: column "letter_token" does not exist` and aborts the
-- whole migration. Adding the column here first makes the indexes valid
-- on both fresh and migrated databases.

-- For projects already migrated before riding_id existed.
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS riding_id TEXT;

-- v0.2 additions: per-signer letter system. Adds long-lived locale + public
-- letter_token. See TODO.md item 2 ("Per-signer letter system, mode A + C").
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS locale TEXT;
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS letter_token TEXT;
ALTER TABLE signatures DROP CONSTRAINT IF EXISTS signatures_locale_valid;
ALTER TABLE signatures
  ADD CONSTRAINT signatures_locale_valid
  CHECK (locale IS NULL OR locale IN ('en','zh'));
ALTER TABLE signatures DROP CONSTRAINT IF EXISTS signatures_letter_token_unique;
ALTER TABLE signatures
  ADD CONSTRAINT signatures_letter_token_unique UNIQUE (letter_token);

-- v0.3 dedup: SHA-256 of the normalized lowercase email, kept long-lived
-- (NOT cleared at confirm). Without this column we have no way to detect
-- "same person signing twice" — pending_email is NULLed at confirm to
-- minimize PII retention, so a second sign with the same address looks
-- like a brand-new signer at the application layer. The hash is one-way
-- and never displayed; it only powers (a) the submit-time dedup check
-- and (b) the partial UNIQUE index below that backstops any race the
-- application logic misses.
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS email_hash TEXT;

-- At most one CONFIRMED signature per (email_hash, petition_slug). Partial
-- so unconfirmed pending rows can coexist with their eventual confirmed
-- form, and so legacy rows with NULL email_hash (pre-v0.3) don't collide
-- with each other or block the constraint creation.
DROP INDEX IF EXISTS signatures_email_hash_confirmed_unique;
CREATE UNIQUE INDEX IF NOT EXISTS signatures_email_hash_confirmed_unique
  ON signatures (email_hash, petition_slug)
  WHERE confirmed = TRUE AND email_hash IS NOT NULL;

-- Plain (non-unique) index for the submit-time dedup lookup that hits
-- email_hash without filtering on confirmed. The partial unique index
-- above only covers `WHERE confirmed = TRUE`, so it can't accelerate the
-- "is there a pending row?" branch.
CREATE INDEX IF NOT EXISTS idx_signatures_email_hash
  ON signatures (email_hash)
  WHERE email_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_signatures_confirmed_recent
  ON signatures (signed_at DESC)
  WHERE confirmed = TRUE;

CREATE INDEX IF NOT EXISTS idx_signatures_confirm_token
  ON signatures (confirm_token)
  WHERE confirm_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_signatures_confirm_expires
  ON signatures (confirm_token_expires)
  WHERE confirmed = FALSE;

CREATE INDEX IF NOT EXISTS idx_signatures_ip_audit
  ON signatures (ip_address)
  WHERE ip_address IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_signatures_petition_slug
  ON signatures (petition_slug);

CREATE INDEX IF NOT EXISTS idx_signatures_riding_id
  ON signatures (riding_id)
  WHERE confirmed = TRUE AND riding_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_signatures_letter_token
  ON signatures (letter_token)
  WHERE letter_token IS NOT NULL;

ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;
-- No policy granted to anon — anon cannot SELECT/INSERT/UPDATE/DELETE directly.
-- The Netlify Functions use the service_role key which bypasses RLS.


-- ----------------------------------------------------------------------------
-- VIEW: public_signatures
-- ----------------------------------------------------------------------------
-- Anon-readable. Only confirmed signatures, only safe columns. The view
-- bypasses RLS on the underlying table by virtue of being a view.
-- ----------------------------------------------------------------------------

DROP VIEW IF EXISTS public_signatures;
CREATE VIEW public_signatures AS
  SELECT
    first_name,
    last_initial,
    school,
    neighbourhood,
    signed_at,
    petition_slug
  FROM signatures
  WHERE confirmed = TRUE
    AND anonymized_at IS NULL
  ORDER BY signed_at DESC;

GRANT SELECT ON public_signatures TO anon, authenticated;


-- ----------------------------------------------------------------------------
-- VIEW: public_signatures_by_riding
-- ----------------------------------------------------------------------------
-- Anon-readable aggregate of confirmed signatures grouped by Burnaby riding.
-- Powers the riding choropleth on the homepage. Nulls (signatures whose
-- postal code didn't map to a Burnaby riding) are excluded.
-- ----------------------------------------------------------------------------

DROP VIEW IF EXISTS public_signatures_by_riding;
CREATE VIEW public_signatures_by_riding AS
  SELECT
    riding_id,
    COUNT(*)::INTEGER AS count
  FROM signatures
  WHERE confirmed = TRUE
    AND anonymized_at IS NULL
    AND riding_id IS NOT NULL
    AND petition_slug = 'fund-burnaby-kids'
  GROUP BY riding_id;

GRANT SELECT ON public_signatures_by_riding TO anon, authenticated;


-- ----------------------------------------------------------------------------
-- VIEW: public_letters
-- ----------------------------------------------------------------------------
-- Anon-readable feed for the per-signer letter system (TODO.md item 2):
--   /letters/<letter_token>  — single signer's filled letter (mode A)
--   /mla/<mla-id>            — riding-filtered list of signers' letters (mode C)
--
-- Privacy guardrails enforced at the view layer (defense-in-depth on top of
-- the page-level rendering rules):
--   - pending_email is NEVER projected (UK Parliament e-petition convention).
--   - Full surname is NEVER projected — only last_initial.
--   - letter_token must be non-NULL. To remove a letter from public view
--     without anonymizing the row, NULL the letter_token (count remains in
--     aggregate signature stats; row is unlinkable via /letters/*).
-- ----------------------------------------------------------------------------

DROP VIEW IF EXISTS public_letters;
CREATE VIEW public_letters AS
  SELECT
    letter_token,
    first_name,
    last_initial,
    school,
    grade,
    neighbourhood,
    riding_id,
    locale,
    signed_at,
    validated_at
  FROM signatures
  WHERE confirmed = TRUE
    AND anonymized_at IS NULL
    AND letter_token IS NOT NULL
    AND petition_slug = 'fund-burnaby-kids'
  ORDER BY signed_at DESC;

GRANT SELECT ON public_letters TO anon, authenticated;


-- ----------------------------------------------------------------------------
-- TABLE: pac_endorsements
-- ----------------------------------------------------------------------------
-- Parent Advisory Council endorsements. Workflow: form submit → status='pending'
-- → Ben verifies via email exchange → status='verified' (manual UPDATE).
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pac_endorsements (
  id                BIGSERIAL PRIMARY KEY,
  school            TEXT NOT NULL,
  students          INTEGER NOT NULL,
  chair_name        TEXT NOT NULL,
  chair_email       TEXT NOT NULL,
  approval_date     DATE,
  future_interest   BOOLEAN NOT NULL DEFAULT FALSE,
  status            TEXT NOT NULL DEFAULT 'pending',
  submitted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at       TIMESTAMPTZ,
  petition_slug     TEXT NOT NULL DEFAULT 'fund-burnaby-kids',
  notes             TEXT,
  ip_address        INET,
  anonymized_at     TIMESTAMPTZ,

  CONSTRAINT pac_status_valid       CHECK (status IN ('pending', 'verified', 'rejected')),
  CONSTRAINT pac_school_length      CHECK (char_length(school) BETWEEN 1 AND 80),
  CONSTRAINT pac_students_range     CHECK (students > 0 AND students < 5000),
  CONSTRAINT pac_chair_email_basic  CHECK (chair_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

-- v0.4: optional backup phone for the chair, in case email bounces. Same
-- ordering rule as the signatures ALTERs above — column add must come
-- before any partial index that filters on it (none currently, but the
-- pattern stays consistent for future fields).
ALTER TABLE pac_endorsements ADD COLUMN IF NOT EXISTS chair_phone TEXT;

-- v0.5: one-click verify token for PAC endorsements. Generated at INSERT
-- time, embedded as a magic-link in the admin notification email so Ben
-- can verify a PAC by clicking a button instead of pasting an UPDATE
-- query into Supabase Studio. Token is NULLed once consumed (single-use).
-- Admin email is the only place this token is ever surfaced; security
-- model is the same as the signer letter_token (32-byte CSPRNG, only
-- delivered via authenticated channel).
ALTER TABLE pac_endorsements ADD COLUMN IF NOT EXISTS verify_token TEXT;
DROP INDEX IF EXISTS pac_endorsements_verify_token_unique;
CREATE UNIQUE INDEX IF NOT EXISTS pac_endorsements_verify_token_unique
  ON pac_endorsements (verify_token)
  WHERE verify_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pac_status ON pac_endorsements (status);
CREATE INDEX IF NOT EXISTS idx_pac_petition_slug ON pac_endorsements (petition_slug);

ALTER TABLE pac_endorsements ENABLE ROW LEVEL SECURITY;


DROP VIEW IF EXISTS public_pac_endorsements;
CREATE VIEW public_pac_endorsements AS
  SELECT school, students, approval_date, petition_slug
  FROM pac_endorsements
  WHERE status = 'verified'
    AND anonymized_at IS NULL
  ORDER BY approval_date DESC NULLS LAST;

GRANT SELECT ON public_pac_endorsements TO anon, authenticated;


-- ----------------------------------------------------------------------------
-- TABLE: mla_replies (reserved for v2 — empty in v1)
-- ----------------------------------------------------------------------------
-- v1: Ben curates MLA scorecard via git commit on YAML. This table is unused.
-- v2: inbound emails to mla-reply@fundburnabykids.ca are parsed by Postmark
--     Inbound, POSTed to a webhook function, written here as 'pending_review',
--     manually approved by Ben, then surfaced on the MLA scorecard.
-- See infrastructure/MLA_REPLY_WORKFLOW.md.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS mla_replies (
  id                BIGSERIAL PRIMARY KEY,
  mla_riding        TEXT,
  mla_name          TEXT,
  reply_excerpt     TEXT,
  reply_full        TEXT,
  source_url        TEXT,
  submitted_via     TEXT,
  submitted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status            TEXT NOT NULL DEFAULT 'pending_review',
  reviewed_by       TEXT,
  reviewed_at       TIMESTAMPTZ,
  publish_notes     TEXT,
  petition_slug     TEXT,

  CONSTRAINT mla_status_valid CHECK (status IN ('pending_review', 'published', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_mla_replies_status ON mla_replies (status);
ALTER TABLE mla_replies ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------------------
-- SCHEDULED JOBS (pg_cron)
-- ----------------------------------------------------------------------------

-- Every hour: purge unconfirmed signatures past their 48h window.
-- Safe re-schedule: unschedule existing job with same name first.
SELECT cron.unschedule('purge-expired-pending-signatures')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'purge-expired-pending-signatures'
  );

SELECT cron.schedule(
  'purge-expired-pending-signatures',
  '0 * * * *',
  $$
    DELETE FROM signatures
    WHERE confirmed = FALSE
      AND confirm_token_expires < NOW();
  $$
);

-- Test-data purge job is intentionally NOT scheduled. We tried it on
-- '*/10 * * * *' for one push (097f307) and decided automatic deletion
-- of test data was too eager: it could quietly wipe a deliberate
-- test row a developer was about to inspect. The unschedule call below
-- removes the job from any project where a previous migration registered
-- it, leaving the manual scripts/purge-test-signatures.sh as the only
-- entry point. Re-enabling the schedule is intentionally a code change
-- that has to be reviewed.
SELECT cron.unschedule('purge-test-signatures')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'purge-test-signatures'
  );


-- ----------------------------------------------------------------------------
-- DATA API GRANTS
-- ----------------------------------------------------------------------------
-- See note at top of file: required when project security setting
-- "Automatically expose new tables and functions" is unchecked.
-- service_role bypasses RLS by default once granted DML. anon and
-- authenticated reach our data only through the public_signatures and
-- public_pac_endorsements views (already granted above).
-- ----------------------------------------------------------------------------

GRANT ALL PRIVILEGES ON TABLE signatures        TO service_role;
GRANT ALL PRIVILEGES ON TABLE pac_endorsements  TO service_role;
GRANT ALL PRIVILEGES ON TABLE mla_replies       TO service_role;

GRANT USAGE, SELECT ON SEQUENCE signatures_id_seq        TO service_role;
GRANT USAGE, SELECT ON SEQUENCE pac_endorsements_id_seq  TO service_role;
GRANT USAGE, SELECT ON SEQUENCE mla_replies_id_seq       TO service_role;


-- ============================================================================
-- ACCEPTANCE TEST (run after migration with both anon and service_role keys)
-- ============================================================================
-- 1. Insert via service_role:
--      INSERT INTO signatures (first_name, last_initial, school, grade,
--                              neighbourhood, confirm_token,
--                              confirm_token_expires, pending_email,
--                              pending_locale)
--      VALUES ('Test', 'X', 'Test School', '5', 'Willingdon Heights',
--              'test_token_abc123', NOW() + INTERVAL '48 hours',
--              'test@example.com', 'en')
--      RETURNING id;
--
-- 2. Anon SELECT from public_signatures:
--      Expected: 0 rows (confirmed=FALSE, view excludes)
--
-- 3. Anon SELECT from signatures directly:
--      Expected: 0 rows or RLS-denied (no SELECT policy granted)
--
-- 4. Service_role UPDATE:
--      UPDATE signatures
--      SET confirmed=TRUE, validated_at=NOW(),
--          validated_ip='127.0.0.1', confirm_token=NULL,
--          confirm_token_expires=NULL, pending_email=NULL,
--          pending_consent_updates=NULL, pending_locale=NULL
--      WHERE confirm_token='test_token_abc123';
--      (Pre-NULL because confirm_token cleared above; in production code,
--       you'd capture id from step 1 and use that as the WHERE.)
--
-- 5. Anon SELECT from public_signatures:
--      Expected: 1 row showing Test, X, Test School, Willingdon Heights
--
-- 6. Cleanup:
--      DELETE FROM signatures WHERE first_name='Test' AND last_initial='X';
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Reload PostgREST schema cache.
-- Without this, every column added by the migration above is invisible to
-- the REST API for ~1-2 minutes (or until the next process restart). That
-- shows up at runtime as `PGRST204: Could not find the 'X' column of 'Y' in
-- the schema cache` and is exactly what bit us when letter_token first
-- shipped. Running NOTIFY here makes the migration self-healing.
-- ----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
