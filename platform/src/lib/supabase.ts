// Supabase client for SSR Astro pages (e.g. /letters/[token], /mla/[id]).
//
// Uses the anon key + RLS-protected views (public_letters,
// public_signatures_by_riding) — never the service_role key, which would
// bypass RLS and is reserved for Netlify Functions that handle writes.
//
// Env contract:
//   PUBLIC_SUPABASE_URL       — same value the browser-side code uses
//   PUBLIC_SUPABASE_ANON_KEY  — anon-role JWT (read-only via the views)
//
// Both are PUBLIC_-prefixed because the existing client-side components
// (RidingMap, SignatureCounter) already use them; this helper just centralizes
// access for server-side rendering.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

export function getAnonSupabase(): SupabaseClient {
  if (cached) return cached;
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY must be set for SSR pages'
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export type PublicLetter = {
  letter_token: string;
  first_name: string;
  last_initial: string;
  school: string;
  grade: string;
  neighbourhood: string;
  riding_id: string | null;
  locale: 'en' | 'zh' | null;
  signed_at: string;
  validated_at: string | null;
};

export async function fetchLetterByToken(token: string): Promise<PublicLetter | null> {
  const supabase = getAnonSupabase();
  const { data, error } = await supabase
    .from('public_letters')
    .select('*')
    .eq('letter_token', token)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('fetchLetterByToken error:', error);
    return null;
  }
  return (data as PublicLetter | null) ?? null;
}
