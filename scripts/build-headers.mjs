/**
 * After `astro build`: compute the CSP script hashes from the real built HTML and write them
 * into firebase.json, so the header always matches what the build actually emits.
 *
 * Scripts are locked down to 'self' plus these exact inline hashes (the main XSS defence).
 * Inline styles stay allowed: Mermaid injects a <style> into each diagram, which hash-only
 * style rules would block. 'wasm-unsafe-eval' is required by Pagefind's WebAssembly search.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { inlineScriptHashes } from './lib/dist.mjs';

const hashes = inlineScriptHashes('dist');

const csp = [
  "default-src 'self'",
  `script-src 'self' 'wasm-unsafe-eval' ${[...hashes].sort().join(' ')}`.trim(),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

const config = JSON.parse(readFileSync('firebase.json', 'utf8'));
const rule = config.hosting.headers.find((r) => r.source === '**');
const header = rule.headers.find((h) => h.key === 'Content-Security-Policy');
const changed = header.value !== csp;
header.value = csp;
writeFileSync('firebase.json', JSON.stringify(config, null, 2) + '\n');
console.log(`CSP: ${hashes.size} inline script hash(es) ${changed ? 'written to' : 'already in'} firebase.json`);
