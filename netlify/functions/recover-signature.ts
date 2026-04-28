// netlify/functions/recover-signature.ts
//
// POST /api/recover with a URL-encoded form body containing `email` and
// `locale`. Looks up the confirmed signature for that (email_hash,
// petition) and re-sends the "your links" email containing the letter
// + withdraw URLs. The /find-my-signature/ page is the user-facing form.
//
// Defense vs. email-enumeration: the response is identical whether or
// not a signature was found. We always 303 to /find-my-signature/?sent=1.
// Without that, an attacker could probe arbitrary emails to discover
// who has signed — exactly the kind of disclosure the privacy hardening
// in v0.2 was designed to prevent.
//
// Honeypot + Turnstile are reused from submit.ts for the same reasons.

import type { Handler } from '@netlify/functions';
import {
  getSupabase,
  getRequestIp,
  verifyTurnstile,
  pickLocale,
  emailHashHex,
  sendLinksEmail,
} from './_shared.js';

const PETITION_SLUG = 'fund-burnaby-kids';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'method_not_allowed' };
  }

  let data: Record<string, string>;
  try {
    data = parseBody(event.body, event.isBase64Encoded, event.headers as Record<string, string | undefined>);
  } catch (err) {
    console.error('recover body parse error:', err);
    return { statusCode: 400, body: 'invalid_body' };
  }

  const locale = pickLocale(data.locale);
  const ip = getRequestIp(event.headers as Record<string, string | undefined>);

  // Honeypot — uniform success-shaped response on trip.
  if ((data['bot-field'] || '').length > 0) {
    return redirectSent(locale);
  }

  // Turnstile gate — same protection as submit.ts. Invalid response → no
  // lookup, but still uniform redirect (don't leak whether the email
  // exists vs. whether the bot check failed).
  const turnstile = await verifyTurnstile(data['cf-turnstile-response'], ip);
  if (!turnstile.ok) {
    console.warn(`recover turnstile failed: ${turnstile.reason}`);
    return redirectSent(locale);
  }

  const email = (data.email || '').trim().toLowerCase();
  if (!email || !email.includes('@') || email.length > 254) {
    return redirectSent(locale);
  }

  try {
    const supabase = getSupabase();
    const emailHash = emailHashHex(email);
    const { data: rows, error } = await supabase
      .from('signatures')
      .select('first_name, letter_token, locale')
      .eq('email_hash', emailHash)
      .eq('petition_slug', PETITION_SLUG)
      .eq('confirmed', true)
      .not('letter_token', 'is', null)
      .limit(1);

    if (error) {
      console.error('recover lookup error:', error);
      return redirectSent(locale);
    }

    const row = rows?.[0];
    if (row && row.letter_token) {
      // The signer's stored locale takes precedence over whatever the
      // recovery form's locale was — they should get the email in the
      // language they originally signed in.
      const sendLocale: 'en' | 'zh' = pickLocale(row.locale ?? undefined);
      await sendLinksEmail({
        to: email,
        firstName: row.first_name,
        locale: sendLocale,
        letterToken: row.letter_token,
        mode: 'recovery',
      });
    } else {
      // Intentionally silent — see header comment.
      console.warn('recover: no confirmed signature for hash');
    }
  } catch (err) {
    console.error('recover unhandled error:', err);
  }

  return redirectSent(locale);
};

function parseBody(
  body: string | null | undefined,
  isBase64: boolean | undefined,
  headers: Record<string, string | undefined>
): Record<string, string> {
  if (!body) return {};
  const decoded = isBase64 ? Buffer.from(body, 'base64').toString('utf8') : body;
  const ct = (headers['content-type'] || headers['Content-Type'] || '').toLowerCase();
  if (ct.includes('application/x-www-form-urlencoded') || !ct.includes('application/json')) {
    const params = new URLSearchParams(decoded);
    const out: Record<string, string> = {};
    params.forEach((v, k) => { out[k] = v; });
    return out;
  }
  return JSON.parse(decoded) as Record<string, string>;
}

function redirectSent(
  locale: 'en' | 'zh'
): { statusCode: number; headers: Record<string, string>; body: string } {
  const localePrefix = locale === 'zh' ? '/zh' : '';
  return {
    statusCode: 303,
    headers: {
      Location: `${localePrefix}/find-my-signature/?sent=1`,
      'Cache-Control': 'no-store',
    },
    body: '',
  };
}
