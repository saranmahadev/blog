import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { unified } from '@astrojs/markdown-remark';
import { rehypeImaxtDiagram } from './src/plugins/rehype-imaxt-diagram.mjs';

// Production origin; override with SITE_URL in CI.
const site = process.env.SITE_URL || 'https://blog.saranmahadev.in';

// Where the browser may talk to. Firebase Auth/Firestore live on googleapis.com; messages go to our own Cloud Functions.
const project = process.env.PUBLIC_FIREBASE_PROJECT_ID;
const functionsHost = project ? [`https://asia-south1-${project}.cloudfunctions.net`] : [];
const emulators = process.env.PUBLIC_USE_EMULATORS === 'true' ? ['http://127.0.0.1:*', 'http://localhost:*'] : []; // CI's signed-in checks only

export default defineConfig({
  site,
  // Content-Security-Policy: Astro hashes every inline script and style it emits, so no 'unsafe-inline' for scripts.
  // Inline style="" attributes (used widely by the design) are allowed separately, for attributes only.
  security: {
    csp: {
      algorithm: 'SHA-256',
      scriptDirective: { resources: ["'self'", "'wasm-unsafe-eval'"] }, // wasm: Pagefind search
      styleDirective: { resources: [{ resource: "'self'", kind: 'element' }, { resource: "'unsafe-inline'", kind: 'attribute' }] },
      directives: [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "form-action 'self'",
        "frame-src 'none'",
        "worker-src 'self' blob:",
        "manifest-src 'self'",
        "img-src 'self' data: https://www.google.com/images/cleardot.gif", // the Firestore web client pings this image to test the connection
        "font-src 'self'",
        `connect-src ${["'self'", 'https://*.googleapis.com', ...functionsHost, ...emulators].join(' ')}`,
      ],
    },
  },
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
