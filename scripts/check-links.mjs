/**
 * Post-build verification. Usage: node scripts/check-links.mjs [dist] [https://expected.site]
 *   - every internal link resolves to a built page or file, and anchors exist
 *   - internal page links use the trailing-slash form (one URL per page)
 *   - with an expected site: canonical/og:url/sitemap/feeds use it, and no placeholder domain leaked
 * Exits 1 on any failure.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dist = process.argv[2] ?? 'dist';
const site = process.argv[3]?.replace(/\/$/, '');

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
const files = walk(dist);
const pages = files.filter((f) => f.endsWith('.html') && !f.includes('pagefind'));
const rel = (f) => f.replace(dist, '').replaceAll('\\', '/');

const problems = [];
let checked = 0;

for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  for (const [, href] of html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)) {
    if (/^(https?:|mailto:|tel:)/.test(href)) continue;
    const [path, hash] = href.split('#');
    checked += 1;
    if (path === '') continue; // same-page anchor
    const isFile = /\.[a-z0-9]+$/i.test(path);
    if (!isFile && !path.endsWith('/')) problems.push(`no trailing slash: ${href} (in ${rel(page)})`);
    const target = path === '/' ? join(dist, 'index.html') : isFile ? join(dist, path) : join(dist, path, 'index.html');
    if (!existsSync(target)) {
      problems.push(`broken link: ${href} (in ${rel(page)})`);
    } else if (hash && target.endsWith('.html') && !readFileSync(target, 'utf8').includes(`id="${decodeURIComponent(hash)}"`)) {
      problems.push(`missing anchor: ${href} (in ${rel(page)})`);
    }
  }
}

if (site) {
  const textFiles = files.filter((f) => /\.(html|xml|txt|md|json|webmanifest)$/.test(f) && !f.includes('pagefind'));
  for (const file of textFiles) {
    const text = readFileSync(file, 'utf8');
    if (/drafted\.example|localhost:\d{4}/.test(text)) problems.push(`placeholder/local URL in ${rel(file)}`);
  }
  for (const page of pages) {
    const canonical = readFileSync(page, 'utf8').match(/<link rel="canonical" href="([^"]*)"/)?.[1];
    if (!canonical) problems.push(`no canonical tag: ${rel(page)}`);
    else if (!canonical.startsWith(site + '/')) problems.push(`canonical not on ${site}: ${canonical} (${rel(page)})`);
  }
  for (const required of ['sitemap-index.xml', 'robots.txt', 'rss.xml', 'llms.txt', 'llms-full.txt']) {
    if (!existsSync(join(dist, required))) problems.push(`missing ${required}`);
  }
}

console.log(`pages: ${pages.length}, internal links checked: ${checked}`);
if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n - ${[...new Set(problems)].join('\n - ')}`);
  process.exit(1);
}
console.log('all checks passed');
