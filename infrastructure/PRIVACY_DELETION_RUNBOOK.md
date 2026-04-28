# Signature deletion runbook

This is the manual fallback for the FAQ #6 / privacy-page deletion
promise. The primary path is the self-serve `/withdraw/<letter_token>`
flow — only run these steps when:

- A user lost their letter URL and emails `privacy@fundburnabykids.ca`
- The self-serve flow returned an error
- A government / privacy-commissioner request demands it

Target SLA: **7 days from request, usually same-day**. Track each step
in a one-line note in your reply email so the requester sees the audit
trail.

## Inputs you'll have

A request usually contains some of:

- The signer's email address
- First name + last name + school (the public listing format)
- The `letter_token` (32-byte base64url) if they kept their URL

The cleanest identifier is `letter_token`. Without it, fall back to
`first_name + school` and confirm by replying to the requester's email.

## Step 1 — locate the row

Source `credentials.env`, then either Supabase Dashboard SQL editor or
psql. Try in this order — stop at the first that returns a single row.

```sql
-- 1a. By letter_token (preferred, exact match)
SELECT id, first_name, last_initial, school, neighbourhood, riding_id,
       confirmed, signed_at, letter_token IS NOT NULL AS has_token,
       pending_consent_updates, pending_email
FROM signatures
WHERE letter_token = '<TOKEN_FROM_REQUEST>';

-- 1b. By first name + school (case-insensitive)
SELECT id, first_name, last_initial, school, neighbourhood, signed_at,
       confirmed, pending_consent_updates, pending_email IS NOT NULL AS had_email
FROM signatures
WHERE LOWER(first_name) = LOWER('<FIRST>')
  AND LOWER(school) = LOWER('<SCHOOL>')
ORDER BY signed_at DESC;

-- 1c. Pre-confirmation only (pending_email still present)
SELECT id, first_name, last_initial, school, signed_at,
       pending_consent_updates, pending_email
FROM signatures
WHERE pending_email = LOWER('<EMAIL>');
```

If 1c returns rows, they signed but never confirmed. The hourly
`purge-expired-pending-signatures` cron drops these after 48 h
anyway, but go ahead and delete now per their request.

If multiple rows match (rare — only when same first name + school
combine, e.g. two parents at one school), reply asking for the
`letter_token` to disambiguate. Don't guess.

## Step 2 — delete the row

```sql
DELETE FROM signatures WHERE id = <ID_FROM_STEP_1> RETURNING id, school;
```

`RETURNING` confirms the row went; you should see exactly one row in
the output. The IP address columns vanish with the row (they were
only stored on the row, not duplicated elsewhere).

## Step 3 — remove from Buttondown (only if `pending_consent_updates = TRUE`)

Buttondown subscribers live in a separate datastore. The withdraw
function does this automatically, but the manual fallback runs
separately because we no longer have the email after confirmation
(`pending_email` is NULLed at confirmation per the lifecycle in
supabase-migrations.sql).

```bash
source credentials.env

# Confirm subscriber exists (returns 200 + JSON; 404 = not subscribed)
curl -i -H "Authorization: Token $BUTTONDOWN_API_KEY" \
  "https://api.buttondown.email/v1/subscribers/<EMAIL>"

# Delete (returns 204 = removed; 404 = wasn't subscribed, also fine)
curl -i -X DELETE \
  -H "Authorization: Token $BUTTONDOWN_API_KEY" \
  "https://api.buttondown.email/v1/subscribers/<EMAIL>"
```

## Step 4 — purge Netlify Forms entry (optional, faster than 30-day auto)

Netlify Forms keeps the raw form payload for 30 days. Most users won't
care, but if the request explicitly mentions it:

1. Netlify dashboard → Site → **Forms** → `signature` form
2. Find the submission by email or timestamp
3. Click the row → **Delete** button at top right

This is the only place the full last name + email + raw postal code
still live after Step 2 + 3. If the requester invokes PIPA, you must
clear it here too.

## Step 5 — reply to the requester

Template:

> Hi [name],
>
> Confirming we've completed your withdrawal request:
>
>   - Signature row deleted from our database (✓ <date/time>)
>   - Newsletter subscription removed (✓ / not applicable — you didn't subscribe)
>   - Form-submission record purged from Netlify (✓ / will auto-purge by <date + 30d>)
>
> Your name no longer appears in our public count, on the MLA inboxes,
> or on /letters/. If you'd like to verify, the URL you previously had
> at /letters/<token> now returns 404.
>
> If you change your mind, you're welcome to sign again — but the
> previous row is permanently gone.
>
> — Ben

Send from `privacy@fundburnabykids.ca`. Keep the email thread for the
audit trail.

## What you DON'T need to do

- **IP anonymization**: IPs were only stored on the deleted row and
  vanish with it.
- **Backups**: Supabase free-tier backups are point-in-time; they
  expire on a 7-day rolling window. By the time the user might
  ask "is it really gone forever?", the backup window has rolled
  past their row.
- **Audit log row**: the withdraw Function logs to Netlify Functions
  console (visible at app.netlify.com → Site → Functions → withdraw
  → recent invocations). The manual path doesn't auto-log; the
  email thread is your audit trail.
