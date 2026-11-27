import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
  loader: glob({
    base: './src/content/posts',
    pattern: '**/*.{md,mdx}',
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishedAt: z.coerce.date(),
    // A typo in the series slug now fails the build instead of silently dropping the post from its series.
    series: reference('series').nullish(),
    // Position inside the series. Posts without one fall back to publish date.
    order: z.number().int().positive().nullish(),
    // Shorter <title> than the on-page headline when that would be cut off in search results (60 chars).
    seoTitle: z.string().max(60).nullish(),
    // Short display word shown large and faint inside the generated cover (cards, article header, share image).
    coverWord: z.string().max(12).nullish(),
    featured: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const series = defineCollection({
  loader: glob({
    base: './src/content/series',
    pattern: '**/*.{md,mdx}',
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
  }),
});

const legal = defineCollection({
  loader: glob({
    base: './src/content/legal',
    pattern: '**/*.{md,mdx}',
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    updatedAt: z.coerce.date(),
  }),
});

export const collections = { posts, series, legal };
