// @ts-check
import { defineConfig } from 'astro/config';

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

export default defineConfig({
  site: 'https://fundburnabykids.ca',
  trailingSlash: 'ignore',
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
