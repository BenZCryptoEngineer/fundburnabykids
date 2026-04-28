// netlify/functions/withdraw.ts
//
// Self-serve signature withdrawal. Backs the FAQ #6 / privacy-page
// "delete within 7 days" promise — but realtime instead of 7 days.
//
// Flow:
//   1. /withdraw/<token> SSR page renders a 2-step confirmation form.
//   2. User submits form → POST /api/withdraw with letter_token + reason?.
//   3. This function looks up the row by letter_token, hard-deletes it,
//      and 302s the user to /withdrawn/.
//
// Authentication: the letter_token itself is the auth credential. It's
// 32 bytes of CSPRNG randomness (base64url-encoded), distinct from
// confirm_token, and only delivered to the signer via:
//   - the URL on /confirmed?t=<token> right after confirmation
//   - the user's saved /letters/<token> URL
// Anyone with the token can withdraw. This matches the privacy
// commitment: a signer who wants out should be able to get out without
// gating it on a manual email round-trip.

import type { Handler } from '@netlify/functions';
import { getSupabase, getRequestIp } from './_shared.js';

const SITE_URL = process.env.SITE_URL || 'https://fundburnabykids.ca';
const BUTTONDOWN_API_KEY = process.env.BUTTONDOWN_API_KEY;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return redirect(`${SITE_URL}/withdraw-failed/?reason=method_not_allowed`);
  }

  try {
    const body = parseBody(event.body, event.headers['content-type'] || '');
    const token = String(body.letter_token || '').trim();
    const locale = String(body.locale || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
    const reason = String(body.reason || '').trim().slice(0, 1000);

    // Token shape: 32-byte base64url is 43 chars; allow 16-128 for safety
    // matching the same range the SSR letter pages use.
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(token)) {
      return redirect(failPath(locale, 'invalid_token'));
    }

    const ip = getRequestIp(event.headers as Record<string, string | undefined>);
    const supabase = getSupabase();

    // Find the row first so we have its email (if newsletter-subscribed) for
    // Buttondown removal. After the row is deleted there's no second chance.
    const { data: rows, error: selectError } = await supabase
      .from('signatures')
      .select('id, pending_consent_updates, pending_email, first_name, school')
      .eq('letter_token', token)
      .limit(1);

    if (selectError) {
      console.error('withdraw select error:', selectError);
      return redirect(failPath(locale, 'server_error'));
    }
    if (!rows || rows.length === 0) {
      // Already deleted, or token never existed. Idempotent — treat as
      // success so a user clicking the same link twice doesn't see a
      // confusing error.
      return redirect(`${SITE_URL}/${locale === 'zh' ? 'zh/' : ''}withdrawn/?status=already`);
    }

    const row = rows[0];

    const { error: deleteError } = await supabase
      .from('signatures')
      .delete()
      .eq('id', row.id);

    if (deleteError) {
      console.error('withdraw delete error:', deleteError);
      return redirect(failPath(locale, 'server_error'));
    }

    // Audit log line — visible in Netlify Functions logs. Doesn't include
    // the email (already cleared post-confirmation in most cases) or the
    // token.
    console.log(
      `[withdraw] id=${row.id} school=${row.school} ip=${ip ?? 'unknown'} ` +
      `had_newsletter=${!!row.pending_consent_updates} reason_len=${reason.length}`
    );

    // Best-effort Buttondown removal IF the row still had a pending_email
    // (meaning the signer withdrew before clicking the confirmation link)
    // OR they subscribed at confirmation. Subscribed addresses live in
    // Buttondown only — that's a separate datastore from Supabase.
    if (BUTTONDOWN_API_KEY && row.pending_consent_updates && row.pending_email) {
      await unsubscribeButtondown(row.pending_email).catch((err) => {
        console.error('buttondown unsubscribe failed (non-fatal):', err);
      });
    }

    return redirect(`${SITE_URL}/${locale === 'zh' ? 'zh/' : ''}withdrawn/?status=ok`);
  } catch (err) {
    console.error('withdraw unhandled error:', err);
    return redirect(`${SITE_URL}/withdraw-failed/?reason=server_error`);
  }
};

function parseBody(raw: string | null | undefined, contentType: string): Record<string, string> {
  if (!raw) return {};
  if (contentType.includes('application/json')) {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  // Default to form-urlencoded (what HTML form posts produce)
  const params = new URLSearchParams(raw);
  const out: Record<string, string> = {};
  params.forEach((v, k) => { out[k] = v; });
  return out;
}

function failPath(locale: 'en' | 'zh', reason: string): string {
  return `${SITE_URL}/${locale === 'zh' ? 'zh/' : ''}withdraw-failed/?reason=${encodeURIComponent(reason)}`;
}

function redirect(url: string): { statusCode: number; headers: Record<string, string>; body: string } {
  return {
    statusCode: 302,
    headers: { Location: url, 'Cache-Control': 'no-store' },
    body: '',
  };
}

async function unsubscribeButtondown(email: string): Promise<void> {
  if (!BUTTONDOWN_API_KEY) return;
  const res = await fetch(
    `https://api.buttondown.email/v1/subscribers/${encodeURIComponent(email)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Token ${BUTTONDOWN_API_KEY}` },
    }
  );
  // 204 = removed, 404 = wasn't subscribed (also fine).
  if (!res.ok && res.status !== 404) {
    const body = await res.text();
    throw new Error(`buttondown DELETE failed (${res.status}): ${body}`);
  }
}
