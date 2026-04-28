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
import { randomBytes } from 'node:crypto';
import { getSupabase, getRequestIp, pickLocale, sendLinksEmail, getSiteUrl } from './_shared.js';

const BUTTONDOWN_API_KEY = process.env.BUTTONDOWN_API_KEY;

export const handler: Handler = async (event) => {
  try {
    const token = (event.queryStringParameters?.t || '').trim();
    if (!token || token.length < 16 || token.length > 128) {
      return redirect(`${getSiteUrl()}/confirm-failed/?reason=invalid_token`);
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
      return redirect(`${getSiteUrl()}/confirm-failed/?reason=server_error`);
    }
    if (!rows || rows.length === 0) {
      // Token unknown OR row already confirmed (token cleared on confirmation).
      // Without a separate "confirmed-token-history" table we can't distinguish.
      // Treat as success — the user clicked a confirmation link, the worst case
      // is a stale double-click.
      return redirect(`${getSiteUrl()}/confirmed/?status=already`);
    }

    const row = rows[0];
    const expires = row.confirm_token_expires ? new Date(row.confirm_token_expires) : null;
    if (!expires || expires.getTime() < Date.now()) {
      return redirect(`${getSiteUrl()}/confirm-failed/?reason=expired`);
    }

    if (row.confirmed) {
      return redirect(`${getSiteUrl()}/confirmed/?status=already`);
    }

    // letter_token: 32-byte URL-safe random, stable + revocable. Powers the
    // per-signer letter pages at /letters/<token>. See TODO.md item 2.
    const letterToken = randomBytes(32).toString('base64url');

    // Promote pending_locale → locale (long-lived). pending_* is NULLed below
    // per the lifecycle contract; without this hop, we'd lose the signer's
    // chosen language for rendering their letter page.
    const persistedLocale = pickLocale(row.pending_locale ?? undefined);

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
        locale: persistedLocale,
        letter_token: letterToken,
      })
      .eq('id', row.id);

    if (updateError) {
      console.error('confirm update error:', updateError);
      return redirect(`${getSiteUrl()}/confirm-failed/?reason=server_error`);
    }

    // Post-confirm "your links" email — gives the signer their letter +
    // withdraw URLs in their inbox forever, not just on the one-shot
    // /confirmed/ page they may close immediately. Best-effort: a send
    // failure here is logged but does not fail the confirmation (the
    // row is already flipped, the URLs still work, the recovery flow
    // at /find-my-signature/ exists as a fallback).
    if (row.pending_email) {
      try {
        await sendLinksEmail({
          to: row.pending_email,
          firstName: row.first_name,
          locale: persistedLocale,
          letterToken,
          mode: 'post_confirm',
        });
      } catch (err) {
        console.error('post-confirm links email failed:', err);
      }
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

    // Surface the freshly-minted letter_token to the /confirmed page so it
    // can render the user's shareable letter URL without an extra DB lookup.
    const confirmedPath = persistedLocale === 'zh' ? 'zh/confirmed' : 'confirmed';
    return redirect(
      `${getSiteUrl()}/${confirmedPath}/?status=ok&t=${encodeURIComponent(letterToken)}`
    );
  } catch (err) {
    console.error('confirm-signature unhandled error:', err);
    return redirect(`${getSiteUrl()}/confirm-failed/?reason=server_error`);
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
