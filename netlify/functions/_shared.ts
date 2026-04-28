// Shared helpers for Netlify Functions.
// Imported by submit.ts, confirm-signature.ts, and withdraw.ts.

import { createHash } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let cachedSupabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  if (!cachedSupabase) {
    cachedSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cachedSupabase;
}

export function getRequestIp(headers: Record<string, string | undefined>): string | null {
  // Netlify-specific: x-nf-client-connection-ip is the end-user IP at the edge.
  // Falls back to first entry of x-forwarded-for if missing.
  const nfIp = headers['x-nf-client-connection-ip'];
  if (nfIp) return nfIp.slice(0, 45);
  const fwd = headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0]?.trim().slice(0, 45) || null;
  return null;
}

export async function verifyTurnstile(
  token: string | undefined,
  remoteIp: string | null
): Promise<{ ok: boolean; reason: string }> {
  if (!token) return { ok: false, reason: 'no_token' };
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) {
    // Soft-fail in dev: if no secret configured, accept. In production,
    // misconfigured secret should never happen — Phase 4B verifies.
    console.warn('TURNSTILE_SECRET not set; skipping verification');
    return { ok: true, reason: 'skipped_dev' };
  }
  const params = new URLSearchParams({ secret, response: token });
  if (remoteIp) params.append('remoteip', remoteIp);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: params,
    });
    const json = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
    if (json.success === true) return { ok: true, reason: 'verified' };
    return { ok: false, reason: (json['error-codes'] || ['unknown']).join(',') };
  } catch (err) {
    console.error('turnstile verify network error:', err);
    return { ok: false, reason: 'network_error' };
  }
}

// School → neighbourhood lookup — kept in sync with
// campaigns/fund-burnaby-kids/schools.yaml. The Function derives the
// canonical neighbourhood from the submitted school name rather than
// trusting whatever the form posts (defense in depth) and rather than
// deriving from postal-code FSA (which crosses neighbourhood
// boundaries — V5B alone covers Capitol Hill, Brentwood, and Burnaby
// Heights).
const SCHOOL_NEIGHBOURHOODS: Record<string, string> = {
  // Elementary
  'Armstrong': 'Capitol Hill',
  'Aubrey': 'Edmonds',
  'Brantford': 'Lochdale',
  'Buckingham': 'Buckingham',
  'Cameron': 'Lochdale',
  'Capitol Hill': 'Capitol Hill',
  'Cascade Heights': 'Cascade Heights',
  'Chaffey-Burke': 'Garden Village',
  'Clinton': 'South Burnaby',
  'Confederation Park': 'Capitol Hill',
  'Douglas Road': 'Edmonds',
  'Edmonds': 'Edmonds',
  'Forest Grove': 'Forest Grove',
  'Gilmore': 'Willingdon Heights',
  'Glenwood': 'Edmonds',
  'Inman': 'Highgate',
  'Kitchener': 'Brentwood',
  'Lakeview': 'Sperling-Duthie',
  'Lochdale': 'Lochdale',
  'Lyndhurst': 'Lochdale',
  'Marlborough': 'Maywood',
  'Maywood': 'Metrotown',
  'Morley': 'South Burnaby',
  'Nelson': 'Burnaby Heights',
  'Parkcrest': 'Brentwood',
  'Seaforth': 'Forest Grove',
  'Second Street': 'Edmonds',
  'Sperling': 'Sperling-Duthie',
  'Stoney Creek': 'Brentwood',
  'Stride Avenue': 'Edmonds',
  'Suncrest': 'Suncrest',
  'Taylor Park': 'Edmonds',
  'Twelfth Avenue': 'Edmonds',
  'University Highlands': 'Burnaby Mountain',
  'Westridge': 'Westridge',
  'Windsor': 'Burnaby Heights',
  // Secondary
  'Alpha': 'Capitol Hill',
  'Burnaby Central': 'Central Burnaby',
  'Burnaby Mountain': 'Burnaby Mountain',
  'Burnaby North': 'Capitol Hill',
  'Burnaby South': 'South Burnaby',
  'Byrne Creek': 'Edmonds',
  'Cariboo Hill': 'Edmonds',
  'Moscrop': 'Central Burnaby',
  // Other
  'South Slope / BC School for the Deaf': 'South Burnaby',
  'Other / Prefer not to say': 'Burnaby',
};

export function schoolToNeighbourhood(school: string): string {
  return SCHOOL_NEIGHBOURHOODS[school.trim()] || 'Burnaby';
}

// Postal-code FSA → BC provincial riding_id (post-2024 redistribution).
// Best-effort mapping: FSAs cross riding boundaries, so this is approximate
// at the edges. The riding_id matches Elections BC ED_ABBREVIATION used by
// the riding-map component for visual aggregation, NOT for legal eligibility.
// Mapping reviewed against Elections BC 2024 boundary GeoJSON; refine as
// coverage data improves.
const RIDING_BY_FSA: Record<string, string> = {
  V3J: 'BNO', // North Burnaby fringe → Burnaby North
  V3N: 'BNN', // Edmonds → Burnaby-New Westminster
  V5A: 'BNE', // Mountain / Confederation Park → Burnaby East
  V5B: 'BNO', // Brentwood / Capitol Hill → Burnaby North
  V5C: 'BNC', // Heights / Willingdon Heights → Burnaby Centre
  V5E: 'BNN', // Big Bend / SW industrial → Burnaby-New Westminster
  V5G: 'BNC', // Central / Garden Village → Burnaby Centre
  V5H: 'BNS', // Metrotown → Burnaby South-Metrotown
  V5J: 'BNN', // Royal Oak / Suncrest → Burnaby-New Westminster
};

export function postalToRidingId(postal: string): string | null {
  const prefix = postal.trim().toUpperCase().substring(0, 3);
  return RIDING_BY_FSA[prefix] || null;
}

export function pickLocale(input: string | undefined): 'en' | 'zh' {
  return (input || 'en').toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

// Canonical URL of the deploy that's processing this request. Used to
// build absolute confirmation / letter / withdraw links inside email
// bodies, where relative URLs aren't an option.
//
// Precedence:
//   1. SITE_URL — explicit operator override (set on Netlify env per
//      deploy context). On Production this is "https://fundburnabykids.ca".
//   2. URL      — auto-injected by Netlify. Resolves to the primary
//      custom domain on Production, the deploy-preview-N URL on PR
//      previews, and the branch--<site> URL on branch deploys. So a
//      preview deploy self-links to itself without any env tweaking.
//   3. Hardcoded prod fallback — only matters in environments where
//      neither env is set (e.g. local node test scripts).
//
// Single source of truth so the email-built URL doesn't drift across
// submit.ts / confirm-signature.ts / withdraw.ts / recover-signature.ts.
export function getSiteUrl(): string {
  return process.env.SITE_URL || process.env.URL || 'https://fundburnabykids.ca';
}

// ---------------------------------------------------------------------------
// "Your links" email — sent from two places:
//   1. confirm-signature.ts, immediately after a signature flips to
//      confirmed (so the signer has letter + withdraw URLs in their inbox
//      forever, not just on the one-shot /confirmed/ page).
//   2. recover-signature.ts, when a signer inputs their email on
//      /find-my-signature/ to recover the same URLs they may have lost.
// Same body in both cases — what differs is the opening sentence, passed
// in via `mode`.
// ---------------------------------------------------------------------------

const RESEND_FROM_FOR_LINKS = process.env.RESEND_FROM || 'Fund Burnaby Kids <campaign@fundburnabykids.ca>';
const MAILING_ADDRESS_FOR_LINKS = process.env.MAILING_ADDRESS || '';

export async function sendLinksEmail(opts: {
  to: string;
  firstName: string;
  locale: 'en' | 'zh';
  letterToken: string;
  mode: 'post_confirm' | 'recovery';
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set; skipping links email');
    return;
  }

  const localePrefix = opts.locale === 'zh' ? '/zh' : '';
  const letterUrl = `${getSiteUrl()}${localePrefix}/letters/${encodeURIComponent(opts.letterToken)}/`;
  const withdrawUrl = `${getSiteUrl()}${localePrefix}/withdraw/${encodeURIComponent(opts.letterToken)}/`;

  const subject =
    opts.locale === 'zh'
      ? opts.mode === 'recovery'
        ? '你的签名链接 — Fund Burnaby Kids'
        : '签名已确认 — 这是你的链接'
      : opts.mode === 'recovery'
        ? 'Your signature links — Fund Burnaby Kids'
        : 'Your signature is in — here are your links';

  const body =
    opts.locale === 'zh'
      ? renderLinksZh({
          firstName: opts.firstName,
          letterUrl,
          withdrawUrl,
          mode: opts.mode,
          mailingAddress: MAILING_ADDRESS_FOR_LINKS,
        })
      : renderLinksEn({
          firstName: opts.firstName,
          letterUrl,
          withdrawUrl,
          mode: opts.mode,
          mailingAddress: MAILING_ADDRESS_FOR_LINKS,
        });

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM_FOR_LINKS,
      to: [opts.to],
      subject,
      html: body.html,
      text: body.text,
      tags: [{ name: 'type', value: opts.mode === 'recovery' ? 'links_recovery' : 'links_post_confirm' }],
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error(`links email send failed (${res.status}):`, txt);
  }
}

function renderLinksEn(p: {
  firstName: string;
  letterUrl: string;
  withdrawUrl: string;
  mode: 'post_confirm' | 'recovery';
  mailingAddress: string;
}): { html: string; text: string } {
  const opening =
    p.mode === 'recovery'
      ? `You asked us to resend your signature links. Here they are.`
      : `Your signature is now on the public record we will show MLAs, the Minister, and reporters. Thank you.`;

  const text = `Hi ${p.firstName},

${opening}

YOUR PUBLIC LETTER PAGE
A permanent page showing your letter to the MLA. Share it with neighbours, post it on WeChat or Twitter:

  ${p.letterUrl}

REMOVE YOUR SIGNATURE
If you ever change your mind, this link removes your name from the public list — no questions asked, takes two clicks:

  ${p.withdrawUrl}

Save this email. Both URLs work for the lifetime of the campaign.

—
Fund Burnaby Kids
A campaign of Burnaby Kids First
${p.mailingAddress}

You are receiving this email because you signed the petition at fundburnabykids.ca.
`;

  const html = `<!doctype html>
<html lang="en"><body style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:560px;margin:32px auto;padding:0 20px;line-height:1.6;color:#1a1a1a;">
<p>Hi ${escapeHtml(p.firstName)},</p>

<p>${escapeHtml(opening)}</p>

<h3 style="font-size:14px;text-transform:uppercase;letter-spacing:0.05em;color:#666;margin:28px 0 8px;">Your public letter page</h3>
<p style="font-size:14px;color:#444;margin:0 0 12px;">A permanent page showing your letter to the MLA. Share it with neighbours, post it on WeChat or Twitter.</p>
<p style="margin:0 0 8px;"><a href="${escapeAttrText(p.letterUrl)}" style="color:#1C3F8F;font-weight:600;">${escapeHtml(p.letterUrl)}</a></p>

<h3 style="font-size:14px;text-transform:uppercase;letter-spacing:0.05em;color:#666;margin:28px 0 8px;">Remove your signature</h3>
<p style="font-size:14px;color:#444;margin:0 0 12px;">If you ever change your mind, this link removes your name from the public list — no questions asked, takes two clicks.</p>
<p style="margin:0 0 8px;"><a href="${escapeAttrText(p.withdrawUrl)}" style="color:#1C3F8F;font-weight:600;">${escapeHtml(p.withdrawUrl)}</a></p>

<p style="margin-top:28px;color:#666;font-size:13px;">Save this email. Both URLs work for the lifetime of the campaign.</p>

<hr style="border:none;border-top:1px solid #e0e0e0;margin:32px 0 16px;">

<p style="font-size:13px;color:#666;">
Fund Burnaby Kids — A campaign of Burnaby Kids First<br>
${escapeHtml(p.mailingAddress)}
</p>

<p style="font-size:12px;color:#888;">
You are receiving this email because you signed the petition at fundburnabykids.ca.
</p>
</body></html>`;

  return { html, text };
}

function renderLinksZh(p: {
  firstName: string;
  letterUrl: string;
  withdrawUrl: string;
  mode: 'post_confirm' | 'recovery';
  mailingAddress: string;
}): { html: string; text: string } {
  const opening =
    p.mode === 'recovery'
      ? `按你的请求，我们重新把签名相关的链接发给你。`
      : `你的名字现在已经进入我们将向 MLA、教育部长和媒体公开的名单。谢谢。`;

  const text = `${p.firstName} 你好，

${opening}

你的公开信件页面
一个永久页面，展示你写给 MLA 的信件 —— 可以分享给邻居、发到微信或 Twitter：

  ${p.letterUrl}

移除你的签名
如果你以后想取消，这个链接可以从公开名单中移除你的名字 —— 两步确认，无须解释：

  ${p.withdrawUrl}

请保留这封邮件。两个链接在 campaign 整个周期内都有效。

—
Fund Burnaby Kids
Burnaby Kids First 旗下的一个 campaign
${p.mailingAddress}

你收到这封邮件，是因为你在 fundburnabykids.ca 签署了请愿。
`;

  const html = `<!doctype html>
<html lang="zh"><body style="font-family:system-ui,-apple-system,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;max-width:560px;margin:32px auto;padding:0 20px;line-height:1.7;color:#1a1a1a;">
<p>${escapeHtml(p.firstName)} 你好，</p>

<p>${escapeHtml(opening)}</p>

<h3 style="font-size:14px;font-weight:700;color:#666;margin:28px 0 8px;">你的公开信件页面</h3>
<p style="font-size:14px;color:#444;margin:0 0 12px;">一个永久页面，展示你写给 MLA 的信件 —— 可以分享给邻居、发到微信或 Twitter。</p>
<p style="margin:0 0 8px;"><a href="${escapeAttrText(p.letterUrl)}" style="color:#1C3F8F;font-weight:600;">${escapeHtml(p.letterUrl)}</a></p>

<h3 style="font-size:14px;font-weight:700;color:#666;margin:28px 0 8px;">移除你的签名</h3>
<p style="font-size:14px;color:#444;margin:0 0 12px;">如果你以后想取消，这个链接可以从公开名单中移除你的名字 —— 两步确认，无须解释。</p>
<p style="margin:0 0 8px;"><a href="${escapeAttrText(p.withdrawUrl)}" style="color:#1C3F8F;font-weight:600;">${escapeHtml(p.withdrawUrl)}</a></p>

<p style="margin-top:28px;color:#666;font-size:13px;">请保留这封邮件。两个链接在 campaign 整个周期内都有效。</p>

<hr style="border:none;border-top:1px solid #e0e0e0;margin:32px 0 16px;">

<p style="font-size:13px;color:#666;">
Fund Burnaby Kids — Burnaby Kids First 旗下的一个 campaign<br>
${escapeHtml(p.mailingAddress)}
</p>

<p style="font-size:12px;color:#888;">
你收到这封邮件，是因为你在 fundburnabykids.ca 签署了请愿。
</p>
</body></html>`;

  return { html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttrText(s: string): string {
  return escapeHtml(s);
}

export function emailHashHex(email: string): string {
  // SHA-256 of normalized lowercase email — kept long-lived in
  // signatures.email_hash for cross-session dedup. Single helper so
  // submit.ts and recover-signature.ts hash identically; if these ever
  // diverge a recovery would silently miss the matching row.
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
}
