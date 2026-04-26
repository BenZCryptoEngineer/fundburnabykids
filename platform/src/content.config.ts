import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// =============================================================================
// Content Collections — campaign data
// =============================================================================
//
// Each YAML file in `campaigns/fund-burnaby-kids/` becomes one entry in the
// `campaign` collection. Entry id = filename without extension:
//
//    meta       facts       personas    journey      mlas
//    faq        letter      schools     pac-kit      thresholds
//
// Usage in pages/components:
//   import { getEntry } from 'astro:content';
//   const meta = await getEntry('campaign', 'meta');
//   const facts = await getEntry('campaign', 'facts');
//
// Schemas are intentionally permissive for now — tighten per file as the
// frontend stabilizes. Components can do their own validation where needed.
//
// When a second campaign is added, switch the loader pattern to
// `*/*.yaml` and adjust the entry-id structure to include the campaign slug.
// =============================================================================

const campaign = defineCollection({
  loader: glob({
    pattern: '*.yaml',
    base: '../campaigns/fund-burnaby-kids',
  }),
  schema: z.any(),
});

export const collections = { campaign };
