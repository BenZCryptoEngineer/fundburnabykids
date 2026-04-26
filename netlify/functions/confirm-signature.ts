// netlify/functions/confirm-signature.ts
//
// Handles GET /api/confirm?t=<token> (routed via netlify.toml).
// Validates the token, flips the signature row to confirmed, captures the
// validation IP, and (if the user opted in) subscribes them to the
// Buttondown newsletter list. Then redirects the user to a confirmed/
// failed page on the site.
//
// Idempotent: if the token already validated, treat as success.

import type { Handler } from '@netlify/functions';
import { getSupabase, getRequestIp, pickLocale } from './_shared.js';

const SITE_URL = process.env.SITE_URL || 'https://fundburnabykids.ca';
const BUTTONDOWN_API_KEY = process.env.BUTTONDOWN_API_KEY;

export const handler: Handler = async (event) => {
  try {
    const token = (event.queryStringParameters?.t || '').trim();
    if (!token || token.length < 16 || token.length > 128) {
      return redirect(`${SITE_URL}/confirm-failed?reason=invalid_token`);
    }

    const ip = getRequestIp(event.headers as Record<string, string | undefined>);
    const supabase = getSupabase();

    // Find the signature row. Cannot UPDATE-RETURNING in Supabase JS without
    // a couple of round-trips, so do a SELECT first.
    const { data: rows, error: selectError } = await supabase
      .from('signatures')
      .select('id, confirmed, confirm_token_expires, pending_email, pending_consent_updates, pending_locale, first_name, school, grade, neighbourhood')
      .eq('confirm_token', token)
      .limit(1);

    if (selectError) {
      console.error('confirm select error:', selectError);
      return redirect(`${SITE_URL}/confirm-failed?reason=server_error`);
    }
    if (!rows || rows.length === 0) {
      // Token unknown OR row already confirmed (token cleared on confirmation).
      // Without a separate "confirmed-token-history" table we can't distinguish.
      // Treat as success — the user clicked a confirmation link, the worst case
      // is a stale double-click.
      return redirect(`${SITE_URL}/confirmed?status=already`);
    }

    const row = rows[0];
    const expires = row.confirm_token_expires ? new Date(row.confirm_token_expires) : null;
    if (!expires || expires.getTime() < Date.now()) {
      return redirect(`${SITE_URL}/confirm-failed?reason=expired`);
    }

    if (row.confirmed) {
      return redirect(`${SITE_URL}/confirmed?status=already`);
    }

    // Capture confirmation details and clear pending fields.
    const { error: updateError } = await supabase
      .from('signatures')
      .update({
        confirmed: true,
        validated_at: new Date().toISOString(),
        validated_ip: ip,
        confirm_token: null,
        confirm_token_expires: null,
        pending_email: null,
        pending_consent_updates: null,
        pending_locale: null,
      })
      .eq('id', row.id);

    if (updateError) {
      console.error('confirm update error:', updateError);
      return redirect(`${SITE_URL}/confirm-failed?reason=server_error`);
    }

    // If the user opted in to the newsletter, add them to Buttondown
    // *now* (after they have proven their email is real). Buttondown's
    // own double opt-in is disabled here because our signature confirmation
    // already proved the email — re-confirming would be a worse UX.
    if (row.pending_consent_updates && row.pending_email && BUTTONDOWN_API_KEY) {
      await subscribeToNewsletter({
        email: row.pending_email,
        firstName: row.first_name,
        school: row.school,
        grade: row.grade,
        neighbourhood: row.neighbourhood,
      });
    }

    const locale = pickLocale(row.pending_locale ?? undefined);
    return redirect(`${SITE_URL}/${locale === 'zh' ? 'zh/' : ''}confirmed?status=ok`);
  } catch (err) {
    console.error('confirm-signature unhandled error:', err);
    return redirect(`${SITE_URL}/confirm-failed?reason=server_error`);
  }
};

function redirect(url: string): { statusCode: number; headers: Record<string, string>; body: string } {
  return {
    statusCode: 302,
    headers: { Location: url, 'Cache-Control': 'no-store' },
    body: '',
  };
}

async function subscribeToNewsletter(opts: {
  email: string;
  firstName: string;
  school: string;
  grade: string;
  neighbourhood: string;
}): Promise<void> {
  if (!BUTTONDOWN_API_KEY) return;
  const slugSchool = opts.school.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const tags = ['signed-2026', `grade-${opts.grade}`, `school-${slugSchool}`];

  const res = await fetch('https://api.buttondown.email/v1/subscribers', {
    method: 'POST',
    headers: {
      Authorization: `Token ${BUTTONDOWN_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email_address: opts.email,
      // 'regular' = active subscriber. Our signature confirmation served as
      // the email-validation step; we don't double-confirm.
      type: 'regular',
      tags,
      metadata: {
        first_name: opts.firstName,
        school: opts.school,
        neighbourhood: opts.neighbourhood,
        signed_at: new Date().toISOString(),
      },
    }),
  });

  if (!res.ok && res.status !== 409 /* already subscribed */) {
    const body = await res.text();
    console.error(`buttondown subscribe failed (${res.status}):`, body);
  }
}
