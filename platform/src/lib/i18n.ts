// i18n helpers for bilingual EN/ZH rendering.
// Astro routing puts EN at root (`/`) and ZH under `/zh/...` per
// astro.config.mjs i18n config.

export type Lang = 'en' | 'zh';

/**
 * Resolve the current locale from a request URL pathname.
 * `/zh/anything` → 'zh'; everything else → 'en'.
 */
export function pickLang(pathname: string): Lang {
  return pathname === '/zh' || pathname.startsWith('/zh/') ? 'zh' : 'en';
}

/**
 * Pick the right value from a {en, zh} localized field.
 * Falls back to EN if ZH is missing or empty.
 */
export function t<T>(field: { en: T; zh?: T | null | undefined }, lang: Lang): T {
  if (lang === 'zh' && field.zh !== undefined && field.zh !== null && field.zh !== '') {
    return field.zh;
  }
  return field.en;
}

/**
 * Build a URL for the same page in the other language.
 * `/about` (en) → `/zh/about`; `/zh/about` (zh) → `/about`.
 */
export function alternateLangUrl(pathname: string, currentLang: Lang): string {
  if (currentLang === 'zh') {
    // Strip leading /zh, default to /
    const stripped = pathname.replace(/^\/zh(\/|$)/, '/');
    return stripped === '' ? '/' : stripped;
  }
  // Going to ZH from EN
  return pathname === '/' ? '/zh/' : `/zh${pathname}`;
}

/**
 * Build a URL respecting the current locale prefix.
 * Useful for in-page anchor links and navigation.
 */
export function localizedUrl(path: string, lang: Lang): string {
  if (lang === 'zh' && !path.startsWith('/zh')) {
    return path === '/' ? '/zh/' : `/zh${path}`;
  }
  return path;
}

/**
 * The two locale labels for the toggle.
 */
export const LANG_LABELS: Record<Lang, { self: string; other: string }> = {
  en: { self: 'EN', other: '中文' },
  zh: { self: '中文', other: 'EN' },
};

/**
 * Format a date in locale-aware short form (May 27, 2026 / 2026 年 5 月 27 日).
 */
export function formatDate(iso: string | Date, lang: Lang): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (lang === 'zh') {
    return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).format(d);
  }
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(d);
}
