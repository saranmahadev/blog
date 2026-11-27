/** Helpers shared by the build and the security gate. Node built-ins only. */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const walk = (dir, skip = new Set()) =>
  readdirSync(dir).flatMap((name) => {
    if (skip.has(name)) return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path, skip) : [path];
  });

/** sha256 hashes (CSP syntax) of every inline, executable <script> in the built HTML. */
export const inlineScriptHashes = (dist = 'dist') => {
  const hashes = new Set();
  for (const file of walk(dist).filter((f) => f.endsWith('.html') && !f.includes('pagefind'))) {
    const html = readFileSync(file, 'utf8');
    for (const [, attrs, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (/\bsrc=/.test(attrs) || /type="application\/ld\+json"/.test(attrs)) continue; // external, or data not code
      hashes.add(`'sha256-${createHash('sha256').update(body).digest('base64')}'`);
    }
  }
  return hashes;
};
