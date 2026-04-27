// @ts-check
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';

// Burnaby Kids First — Astro configuration.
//
// Multi-campaign routing strategy (finalized in Phase 5):
//   /                       → umbrella landing (burnabykidsfirst.ca, future)
//   /campaigns/[slug]       → campaign page (EN default)
//   /zh/campaigns/[slug]    → campaign page (ZH)
//   /privacy                → privacy policy
//
// Initially, fundburnabykids.ca serves the fund-burnaby-kids campaign at /.
// This is handled at the deploy layer (redirects in netlify.toml) so Astro
// stays agnostic.
//
// Hybrid rendering (Astro 5 default static + per-page SSR opt-out):
//   Most pages stay statically pre-rendered. Routes that depend on a
//   per-request token or Supabase row (e.g. /letters/[token], /mla/[id])
//   set `export const prerender = false` and run as Netlify Functions
//   via the @astrojs/netlify adapter. The adapter is a no-op for all
//   pages still in the default static output mode.

export default defineConfig({
  site: 'https://fundburnabykids.ca',
  trailingSlash: 'ignore',
  output: 'static',
  adapter: netlify(),
  build: {
    format: 'directory'
  },
  i18n: {
    locales: ['en', 'zh'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false
    }
  }
});
