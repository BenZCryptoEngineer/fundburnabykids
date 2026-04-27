// Shared helpers for Netlify Functions.
// Imported by on-signature.ts and confirm-signature.ts.

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

const NEIGHBOURHOODS: Record<string, string> = {
  V3J: 'North Burnaby',
  V3N: 'Edmonds',
  V5A: 'Burnaby Mountain',
  V5B: 'Brentwood',
  V5C: 'Willingdon Heights',
  V5E: 'Big Bend',
  V5G: 'Central Burnaby',
  V5H: 'Metrotown',
  V5J: 'South Burnaby',
};

export function postalToNeighbourhood(postal: string): string {
  const prefix = postal.trim().toUpperCase().substring(0, 3);
  return NEIGHBOURHOODS[prefix] || 'Burnaby';
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
