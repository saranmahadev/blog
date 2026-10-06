import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const imageCover = z.object({ image: z.string(), alt: z.string().min(1, 'Describe the image in the alt text') });
// Typographic cover: a giant word, number, quote or stacked title set in the post's series colour.
const imaxtCover = z.object({
  kind: z.enum(['word', 'stat', 'quote', 'stack']),
  text: z.string().max(70),
  sub: z.string().max(40).optional(),
});

const basePost = z.object({
  title: z.string(),
  description: z.string().max(200),
  date: z.coerce.date(),
  updated: z.coerce.date().optional(),
  author: z.string().default('Dev'),
  tags: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
  featured: z.boolean().default(false),
  cover: z.union([imageCover, imaxtCover]).optional(),
  canonical: z.url().optional(),
  // Set to false to keep sponsored banners off this post (for example a personal story).
  sponsors: z.boolean().default(true),
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
    cover: z.object({ image: z.string(), alt: z.string().min(1, 'Describe the image in the alt text') }).optional(),
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

// Banners: src/content/sponsors/<name>.json. Our own (house) banners and paid sponsors use the same shape.
const slot = z.enum(['inline', 'end', 'rail']);
const sponsors = defineCollection({
  loader: glob({ base: './src/content/sponsors', pattern: '*.json' }),
  schema: z.object({
    name: z.string(),
    house: z.boolean().default(false),
    href: z.url().or(z.string().startsWith('/')),
    kind: z.enum(['image', 'text']),
    sizes: z.array(slot).min(1),
    // Image banners: files in public/sponsors/. Alt text is required.
    image: z.string().optional(),
    image2x: z.string().optional(),
    mobileImage: z.string().optional(),
    alt: z.string().optional(),
    // Text banners (built from Imaxt styles).
    headline: z.string().max(60).optional(),
    line: z.string().max(90).optional(),
    cta: z.string().max(24).optional(),
    tone: z.enum(['mint', 'lilac', 'sky', 'rose', 'accent', 'ink', 'white']).optional(),
    // Our own (house) banners may animate; paid banners never do.
    motion: z.enum(['aurora', 'orbit', 'pulse', 'sweep', 'grid']).optional(),
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    posts: z.union([z.literal('all'), z.array(z.string())]).default('all'),
    exclude: z.array(z.string()).default([]),
    active: z.boolean().default(true),
  }).refine((s) => s.kind !== 'image' || (s.image && s.alt), { message: 'Image banners need image and alt text' })
    .refine((s) => s.kind !== 'text' || (s.headline && s.cta), { message: 'Text banners need a headline and button text' }),
});

export const collections = { posts, series, seriesPosts, sponsors };
