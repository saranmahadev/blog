import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { unified } from '@astrojs/markdown-remark';
import { rehypeImaxtDiagram } from './src/plugins/rehype-imaxt-diagram.mjs';

// Production origin; override with SITE_URL in CI.
const site = process.env.SITE_URL || 'https://blog.saranmahadev.in';

export default defineConfig({
  site,
  trailingSlash: 'always',
  build: { format: 'directory' },
  redirects: { '/library/': '/profile/#bookmarks' }, // bookmarks moved into the profile
  integrations: [mdx(), react()],
  vite: { plugins: [tailwindcss()] },
  markdown: {
    // Mermaid fences are handled by the diagram plugin, not the code highlighter.
    syntaxHighlight: { type: 'shiki', excludeLangs: ['mermaid'] },
    shikiConfig: { theme: 'github-dark' },
    processor: unified({ rehypePlugins: [rehypeImaxtDiagram] }),
  },
});
