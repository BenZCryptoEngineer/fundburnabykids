// Shared helpers for Netlify Functions.
// Imported by submit.ts, confirm-signature.ts, and withdraw.ts.

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
