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
 *
 * Always emits a trailing slash for non-anchor, non-query paths. With the
 * @astrojs/netlify adapter installed, Netlify routes /foo (no slash)
 * through the SSR function before checking the static /foo/index.html
 * file, and the function returns 404 for paths it doesn't know about.
 * Canonical URLs with trailing slashes hit the static file directly.
 * Anchor (#act) and query (?status=ok) paths bypass the slash because
 * they're appended to the current page.
 */
export function localizedUrl(path: string, lang: Lang): string {
  let resolved = path;
  if (lang === 'zh' && !path.startsWith('/zh')) {
    resolved = path === '/' ? '/zh/' : `/zh${path}`;
  }
  // Skip the trailing-slash rule for anchors, queries, and paths that
  // already end in a slash.
  if (
    resolved.includes('#') ||
    resolved.includes('?') ||
    resolved.endsWith('/')
  ) {
    return resolved;
  }
  return `${resolved}/`;
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
 *
 * timeZone: 'UTC' is intentional. YAML date literals like `2026-04-30`
 * (no time + no TZ) get parsed by `new Date()` as UTC midnight; without
 * the timeZone option, Intl.DateTimeFormat then re-renders that instant
 * in the viewer's local TZ, which on PDT (UTC-7) yields the previous
 * calendar day. Forcing UTC makes the rendered day match the day
 * authored in YAML, regardless of who's viewing.
 */
export function formatDate(iso: string | Date, lang: Lang): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (lang === 'zh') {
    return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(d);
  }
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(d);
}
