// Astro hashes the scripts and styles it emits, but not the <style> blocks inside the diagrams that are rendered at
// build time (Mermaid SVG). This adds a hash for every inline <style> block that is missing from each page's
// Content-Security-Policy, so 'unsafe-inline' is never needed for style elements.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const META = /(<meta http-equiv="content-security-policy" content=")([^"]*)(">)/i;
let pages = 0, added = 0;

(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) fix(p);
  }
})(dist);

function fix(file) {
  let html = fs.readFileSync(file, 'utf8');
  const m = html.match(META);
  if (!m) return;
  let policy = m[2];
  const hashes = new Set();
  for (const s of html.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/g)) {
    hashes.add(`'sha256-${crypto.createHash('sha256').update(s[1]).digest('base64')}'`);
  }
  const missing = [...hashes].filter((h) => !policy.includes(h));
  if (!missing.length) return;
  if (!/style-src-elem /.test(policy)) throw new Error(`${file}: no style-src-elem directive to extend`);
  policy = policy.replace(/(style-src-elem [^;]*)/, `$1 ${missing.join(' ')}`);
  fs.writeFileSync(file, html.replace(META, `$1${policy}$3`));
  pages++; added += missing.length;
}
console.log(`csp: added ${added} style hashes on ${pages} pages`);
