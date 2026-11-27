// @ts-check
import { readdirSync, readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import keystatic from '@keystatic/astro';
import sitemap from '@astrojs/sitemap';
import { satteri } from '@astrojs/markdown-satteri';
import { statementPlugin } from './plugins/statement.mjs';

// The public address of the site. Not a secret: it is the default here and is also set in the
// deploy workflow. Override with SITE_URL for previews or local checks of absolute URLs.
const site = process.env.SITE_URL ?? 'https://blog.saranmahadev.in';

const enableKeystatic = process.env.NODE_ENV !== 'production';

/**
 * Reads one frontmatter field from every Markdown/MDX file in a content folder.
 * @param {string} dir
 * @param {string} field
 */
const frontmatterField = (dir, field) =>
  Object.fromEntries(
    readdirSync(dir)
      .filter((name) => /\.mdx?$/.test(name))
      .map((name) => {
        const raw = readFileSync(new URL(`${dir}/${name}`, import.meta.url), 'utf8');
        const value = raw.match(new RegExp(`^${field}:\\s*"?([^"\\n]+)"?\\s*$`, 'm'))?.[1];
        return [name.replace(/\.mdx?$/, ''), value];
      }),
  );

const postDates = frontmatterField('./src/content/posts', 'publishedAt');
const legalDates = frontmatterField('./src/content/legal', 'updatedAt');
const newestPost = Object.values(postDates).filter(Boolean).sort().at(-1);

/**
 * `lastmod` for every URL: a post's own date, a legal page's update date, else the newest post.
 * @param {string} url
 */
const lastmodFor = (url) => {
  const path = new URL(url).pathname;
  const post = path.match(/^\/posts\/([^/]+)\/$/)?.[1];
  const legal = path.match(/^\/([^/]+)\/$/)?.[1];
  return (post && postDates[post]) || (legal && legalDates[legal]) || newestPost;
};

export default defineConfig({
  site,
  // One URL per page: every internal link, canonical tag and sitemap entry ends in a slash.
  trailingSlash: 'always',
  // Code colours come from CSS variables so they follow the Dark Chocolate tokens in both themes.
  // Same Markdown engine as before, plus a plugin that marks fully-bold paragraphs as statements.
  markdown: { processor: satteri({ hastPlugins: [statementPlugin] }), shikiConfig: { theme: 'css-variables' } },
  // Links prefetch on hover/focus, so transitions feel instant.
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  integrations: [
    react(),
    mdx(),
    sitemap({
      serialize: (item) => {
        const lastmod = lastmodFor(item.url);
        return lastmod ? { ...item, lastmod: new Date(lastmod).toISOString() } : item;
      },
    }),
    ...(enableKeystatic ? [keystatic()] : []),
  ],
});
