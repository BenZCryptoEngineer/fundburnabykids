import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Campaign content collection — loads `campaigns/*.yaml` at the repo root.
// Schema is v0.1 (minimal). Phase 3's `agent-instructions/CREATE_CAMPAIGN.md`
// codifies the full schema; Phase 5 extends this definition to match.

const campaigns = defineCollection({
  // Files beginning with `_` (e.g. `_schema.yaml`) are documentation, not data.
  loader: glob({ pattern: ['**/*.yaml', '!**/_*.yaml'], base: '../campaigns' }),
  schema: z.object({
    slug: z.string(),
    status: z.enum(['draft', 'live', 'archived']).default('draft'),
    deadline: z.coerce.date().optional(),
    title: z.object({
      en: z.string(),
      zh: z.string().optional()
    }),
    subtitle: z
      .object({
        en: z.string(),
        zh: z.string().optional()
      })
      .optional()
  })
});

export const collections = { campaigns };
