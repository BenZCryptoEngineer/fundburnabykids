// netlify/functions/on-signature.ts
//
// Handles Netlify Forms webhook for two forms:
//   - signature        — petition signature with email confirmation
//   - pac-endorsement  — Parent Advisory Council endorsement (verified manually)
//
// Form dispatch is by `form-name` field in the webhook payload.
// Both flows verify Cloudflare Turnstile before any DB write.

import type { Handler } from '@netlify/functions';
import { randomBytes } from 'node:crypto';
import {
  getSupabase,
  getRequestIp,
  verifyTurnstile,
  schoolToNeighbourhood,
  postalToRidingId,
  pickLocale,
} from './_shared.js';

const SITE_URL = process.env.SITE_URL || 'https://fundburnabykids.ca';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || 'Fund Burnaby Kids <campaign@fundburnabykids.ca>';
const MAILING_ADDRESS = process.env.MAILING_ADDRESS || '';
const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'ben@fundburnabykids.ca';

export const handler: Handler = async (event) => {
  try {
    const raw = JSON.parse(event.body || '{}');
    const data = raw.payload?.data || raw;
    const formName = raw.payload?.form_name || data['form-name'];

    const ip = getRequestIp(event.headers as Record<string, string | undefined>);

    const turnstile = await verifyTurnstile(data['cf-turnstile-response'], ip);
    if (!turnstile.ok) {
      console.warn(`turnstile failed: ${turnstile.reason}`);
      return { statusCode: 200, body: 'turnstile_failed' };
    }

    if (formName === 'signature') {
      return await handleSignature(data, ip);
    }
    if (formName === 'pac-endorsement') {
      return await handlePacEndorsement(data, ip);
    }

    return { statusCode: 200, body: 'ignored_unknown_form' };
  } catch (err) {
    // Never throw — Netlify will retry, which causes duplicate sends.
    console.error('on-signature unhandled error:', err);
    return { statusCode: 200, body: 'ok' };
  }
};

// ---------------------------------------------------------------------------

async function handleSignature(
  data: Record<string, string | boolean | undefined>,
  ip: string | null
): Promise<{ statusCode: number; body: string }> {
  const firstname = String(data.firstname || '').trim();
  const lastname = String(data.lastname || '').trim();
  const email = String(data.email || '').trim().toLowerCase();
  const school = String(data.school || '').trim();
  const grade = String(data.grade || '').trim();
  const postal = String(data.postal || '').trim().toUpperCase();
  const consentPublic = data['consent-public'] === 'on' || data['consent-public'] === true;
  const consentUpdates = data['consent-updates'] === 'on' || data['consent-updates'] === true;
  const locale = pickLocale(data.locale as string | undefined);

  if (!firstname || !lastname || !email || !school || !grade || !postal) {
    return { statusCode: 200, body: 'missing_required_fields' };
  }
  if (!consentPublic) {
    return { statusCode: 200, body: 'public_consent_required' };
  }
  if (!email.includes('@') || email.length > 254) {
    return { statusCode: 200, body: 'invalid_email' };
  }

  const lastInitial = lastname.charAt(0).toUpperCase();
  // Neighbourhood is derived from the school selection (more accurate than
  // postal-code FSA, which crosses neighbourhood boundaries). Postal code
  // is still required for riding_id (BNC/BNE/BNN/BNO/BNS) — riding
  // resolution at FSA granularity is fine because Burnaby ridings line up
  // closely with FSA splits.
  const neighbourhood = schoolToNeighbourhood(school);
  const ridingId = postalToRidingId(postal);
  const confirmToken = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const supabase = getSupabase();
  const { error: insertError } = await supabase.from('signatures').insert({
    first_name: firstname.substring(0, 40),
    last_initial: lastInitial,
    school: school.substring(0, 80),
    grade: grade.substring(0, 20),
    neighbourhood,
    riding_id: ridingId,
    confirmed: false,
    confirm_token: confirmToken,
    confirm_token_expires: expiresAt,
    pending_email: email,
    pending_consent_updates: consentUpdates,
    pending_locale: locale,
    ip_address: ip,
    petition_slug: 'fund-burnaby-kids',
  });

  if (insertError) {
    console.error('signatures insert error:', insertError);
    return { statusCode: 200, body: 'db_error' };
  }

  await sendConfirmationEmail({
    to: email,
    firstName: firstname,
    locale,
    token: confirmToken,
  });

  return { statusCode: 200, body: 'ok' };
}

// ---------------------------------------------------------------------------

async function handlePacEndorsement(
  data: Record<string, string | boolean | undefined>,
  ip: string | null
): Promise<{ statusCode: number; body: string }> {
  const school = String(data['pac-school'] || '').trim();
  const studentsRaw = String(data['pac-students'] || '').trim();
  const chairName = String(data['pac-chair-name'] || '').trim();
  const chairEmail = String(data['pac-chair-email'] || '').trim().toLowerCase();
  const approvalDate = String(data['pac-approval-date'] || '').trim() || null;
  const consent = data['pac-consent'] === 'on' || data['pac-consent'] === true;
  const futureInterest = data['pac-future-interest'] === 'on' || data['pac-future-interest'] === true;

  const students = parseInt(studentsRaw, 10);
  if (!school || !chairName || !chairEmail || !consent || !Number.isFinite(students) || students <= 0) {
    return { statusCode: 200, body: 'invalid_pac_submission' };
  }

  const supabase = getSupabase();
  const { error: insertError } = await supabase.from('pac_endorsements').insert({
    school: school.substring(0, 80),
    students,
    chair_name: chairName.substring(0, 60),
    chair_email: chairEmail.substring(0, 254),
    approval_date: approvalDate,
    future_interest: futureInterest,
    status: 'pending',
    ip_address: ip,
    petition_slug: 'fund-burnaby-kids',
  });

  if (insertError) {
    console.error('pac_endorsements insert error:', insertError);
    return { statusCode: 200, body: 'db_error' };
  }

  // Notify Ben so he can verify (see infrastructure/MLA_REPLY_WORKFLOW.md
  // and the sibling VERIFY_PAC.md once it exists).
  await sendAdminNotification({
    subject: `[PAC pending] ${school} — verify endorsement`,
    text:
      `School: ${school}\n` +
      `Chair: ${chairName} <${chairEmail}>\n` +
      `Students: ${students}\n` +
      `Approval date: ${approvalDate || 'pending'}\n` +
      `Future interest: ${futureInterest}\n\n` +
      `Verify via Supabase: UPDATE pac_endorsements SET status='verified', ` +
      `verified_at=NOW() WHERE school='${school.replace(/'/g, "''")}' AND status='pending';`,
  });

  return { statusCode: 200, body: 'ok' };
}

// ---------------------------------------------------------------------------
// Resend transactional sends — confirmation + admin alerts.
// We use Resend (not Buttondown) for one-off transactional emails:
//   - Buttondown's transactional surface is the subscription-lifecycle
//     emails for its own subscribers; it isn't meant for arbitrary one-off
//     sends to non-subscribers.
//   - Resend's REST API is purpose-built for one-off transactional with
//     full content control. Free tier (3K/mo) covers our scale.
// Buttondown remains the right tool for the fortnightly newsletter list.
// ---------------------------------------------------------------------------

async function sendConfirmationEmail(opts: {
  to: string;
  firstName: string;
  locale: 'en' | 'zh';
  token: string;
}): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set; skipping confirmation send');
    return;
  }

  const confirmUrl = `${SITE_URL}/api/confirm?t=${encodeURIComponent(opts.token)}`;
  const subject =
    opts.locale === 'zh'
      ? '再点一下：让你为本拿比孩子的签名生效'
      : 'One click left: confirm your signature for Burnaby kids';

  const { html, text } =
    opts.locale === 'zh'
      ? renderConfirmZh({ firstName: opts.firstName, confirmUrl, mailingAddress: MAILING_ADDRESS })
      : renderConfirmEn({ firstName: opts.firstName, confirmUrl, mailingAddress: MAILING_ADDRESS });

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [opts.to],
      subject,
      html,
      text,
      // Tag for Resend dashboard filtering
      tags: [{ name: 'type', value: 'signature_confirmation' }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`resend send failed (${res.status}):`, body);
  }
}

async function sendAdminNotification(opts: { subject: string; text: string }): Promise<void> {
  if (!RESEND_API_KEY) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [ADMIN_NOTIFICATION_EMAIL],
      subject: opts.subject,
      text: opts.text,
      tags: [{ name: 'type', value: 'admin_notification' }],
    }),
  }).catch((err) => console.error('admin notification failed:', err));
}

// ---------------------------------------------------------------------------
// Email rendering. The English and Chinese versions are kept side-by-side
// here for now; if either grows beyond a screen, lift to template files.
// Mission-aligned per VOICE policy fallback (neutral institutional tone).
// CASL: identification + mailing address + unsubscribe row in footer.
// ---------------------------------------------------------------------------

function renderConfirmEn(p: {
  firstName: string;
  confirmUrl: string;
  mailingAddress: string;
}): { html: string; text: string } {
  const text = `Hi ${p.firstName},

You signed the petition asking the BC Province to fully fund the $9.4M
arbitration liability before SD41 adopts its 2026-27 budget on May 27.

To put your name on the public record we will show MLAs, Ministers, and
reporters, please confirm:

  ${p.confirmUrl}

Why this step.

Every name we publish on fundburnabykids.ca is a name we can stand
behind. When an MLA's office asks "are these real Burnaby parents?",
confirmed signatures are the answer. Unconfirmed signatures stay
private and uncounted.

This link expires in 48 hours. After that, you would need to sign again.

The deadline that matters: budget adoption is May 27.

—
Fund Burnaby Kids
A campaign of Burnaby Kids First
${p.mailingAddress}

You are receiving this email because you signed the petition at
fundburnabykids.ca. This is the only email you will receive about this
signature unless you opted in to ongoing updates.
`;

  const html = `<!doctype html>
<html lang="en"><body style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:560px;margin:32px auto;padding:0 20px;line-height:1.6;color:#1a1a1a;">
<p>Hi ${escapeHtml(p.firstName)},</p>

<p>You signed the petition asking the BC Province to fully fund the
<strong>$9.4M arbitration liability</strong> before SD41 adopts its
2026-27 budget on <strong>May 27</strong>.</p>

<p>To put your name on the public record we will show MLAs, Ministers,
and reporters, please confirm:</p>

<p style="margin:28px 0;text-align:center;">
  <a href="${escapeAttr(p.confirmUrl)}"
     style="display:inline-block;background:#1C3F8F;color:#fff;text-decoration:none;padding:14px 28px;border-radius:6px;font-weight:600;">
     Confirm my signature
  </a>
</p>

<p style="font-size:13px;color:#666;text-align:center;">Or paste this link:<br><span style="word-break:break-all;">${escapeHtml(p.confirmUrl)}</span></p>

<h3 style="font-size:16px;margin-top:28px;">Why this step.</h3>

<p>Every name we publish on fundburnabykids.ca is a name we can stand
behind. When an MLA's office asks "are these real Burnaby parents?",
confirmed signatures are the answer. <strong>Unconfirmed signatures
stay private and uncounted.</strong></p>

<p>This link expires in 48 hours. After that, you would need to sign again.</p>

<p>The deadline that matters: budget adoption is May 27.</p>

<hr style="border:none;border-top:1px solid #e0e0e0;margin:32px 0 16px;">

<p style="font-size:13px;color:#666;">
Fund Burnaby Kids — A campaign of Burnaby Kids First<br>
${escapeHtml(p.mailingAddress)}
</p>

<p style="font-size:12px;color:#888;">
You are receiving this email because you signed the petition at
fundburnabykids.ca. This is the only email you will receive about
this signature unless you opted in to ongoing updates.
</p>
</body></html>`;

  return { html, text };
}

function renderConfirmZh(p: {
  firstName: string;
  confirmUrl: string;
  mailingAddress: string;
}): { html: string; text: string } {
  const text = `${p.firstName} 你好，

你刚刚在 fundburnabykids.ca 签下了请愿信，要求 BC 省政府在 SD41
学区于 5 月 27 日通过 2026-27 年度预算之前，全额拨付 940 万加元的
仲裁裁决款项。

为了让你的名字进入我们将向 MLA、教育部长和媒体公开展示的名单，
请点击确认：

  ${p.confirmUrl}

为什么需要这一步。

我们公开在 fundburnabykids.ca 上的每一个名字，都是我们能站出来
背书的名字。当 MLA 办公室质疑「这些都是真的本拿比家长吗」，
已确认的签名就是回答。未确认的签名不会公开、也不进入计数。

此链接 48 小时后失效，过期后需重新签名。

关键截止：预算通过日为 5 月 27 日。

—
Fund Burnaby Kids
Burnaby Kids First 旗下的一个 campaign
${p.mailingAddress}

你收到这封邮件，是因为你在 fundburnabykids.ca 签署了请愿。
除非你勾选了订阅后续更新，这是与本次签名相关的唯一一封邮件。
`;

  const html = `<!doctype html>
<html lang="zh"><body style="font-family:system-ui,-apple-system,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;max-width:560px;margin:32px auto;padding:0 20px;line-height:1.7;color:#1a1a1a;">
<p>${escapeHtml(p.firstName)} 你好，</p>

<p>你刚刚在 fundburnabykids.ca 签下了请愿信，要求 BC 省政府在
SD41 学区于 5 月 27 日通过 2026-27 年度预算之前，全额拨付
<strong>940 万加元</strong>的仲裁裁决款项。</p>

<p>为了让你的名字进入我们将向 MLA、教育部长和媒体公开展示的名单，
请点击确认：</p>

<p style="margin:28px 0;text-align:center;">
  <a href="${escapeAttr(p.confirmUrl)}"
     style="display:inline-block;background:#1C3F8F;color:#fff;text-decoration:none;padding:14px 28px;border-radius:6px;font-weight:600;">
     确认我的签名
  </a>
</p>

<p style="font-size:13px;color:#666;text-align:center;">或复制此链接：<br><span style="word-break:break-all;">${escapeHtml(p.confirmUrl)}</span></p>

<h3 style="font-size:16px;margin-top:28px;">为什么需要这一步。</h3>

<p>我们公开在 fundburnabykids.ca 上的每一个名字，都是我们能站出来
背书的名字。当 MLA 办公室质疑「这些都是真的本拿比家长吗」，
已确认的签名就是回答。<strong>未确认的签名不会公开、也不进入计数。</strong></p>

<p>此链接 48 小时后失效，过期后需重新签名。</p>

<p>关键截止：预算通过日为 5 月 27 日。</p>

<hr style="border:none;border-top:1px solid #e0e0e0;margin:32px 0 16px;">

<p style="font-size:13px;color:#666;">
Fund Burnaby Kids — Burnaby Kids First 旗下的一个 campaign<br>
${escapeHtml(p.mailingAddress)}
</p>

<p style="font-size:12px;color:#888;">
你收到这封邮件，是因为你在 fundburnabykids.ca 签署了请愿。
除非你勾选了订阅后续更新，这是与本次签名相关的唯一一封邮件。
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

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
