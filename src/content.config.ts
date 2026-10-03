import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const basePost = z.object({
  title: z.string(),
  description: z.string().max(200),
  date: z.coerce.date(),
  updated: z.coerce.date().optional(),
  author: z.string().default('Dev'),
  tags: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
  featured: z.boolean().default(false),
  cover: z.object({ image: z.string(), alt: z.string() }).optional(),
  canonical: z.url().optional(),
});

// Standalone posts: src/content/posts/<slug>.md(x)  ->  /<slug>/
const posts = defineCollection({
  loader: glob({ base: './src/content/posts', pattern: '*.{md,mdx}' }),
  schema: basePost,
});

// Series metadata: src/content/series/<series>/index.md  ->  /<series>/
const series = defineCollection({
  loader: glob({ base: './src/content/series', pattern: '*/index.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(200),
    cover: z.object({ image: z.string(), alt: z.string() }).optional(),
    // Optional look of the series; falls back to a stable choice derived from its slug.
    tone: z.enum(['mint', 'lilac', 'sky', 'rose']).optional(),
    pattern: z.enum(['dots', 'rings', 'grid', 'stripes', 'check']).optional(),
    draft: z.boolean().default(false),
  }),
});

// Series posts: src/content/series/<series>/<post>.md(x)  ->  /<series>/<post>/
const seriesPosts = defineCollection({
  loader: glob({
    base: './src/content/series',
    pattern: ['*/*.{md,mdx}', '!*/index.{md,mdx}'],
  }),
  schema: basePost.extend({
    // Position within the series; posts are ordered by this, then by date.
    order: z.number().int().positive().optional(),
  }),
});

export const collections = { posts, series, seriesPosts };
