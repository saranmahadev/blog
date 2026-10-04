// Fails if the built site loads fonts, analytics or session-replay tools from third parties.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const BANNED = ['fonts.googleapis.com', 'fonts.gstatic.com', 'use.typekit.net', 'googletagmanager.com', 'google-analytics.com', 'hotjar', 'clarity.ms', 'fullstory', 'logrocket', 'mouseflow', 'smartlook', 'heap-analytics', 'segment.com/analytics', 'facebook.net', 'doubleclick.net'];
const TEXT = new Set(['.html', '.js', '.mjs', '.css', '.json', '.xml', '.xsl', '.txt']);
const hits = [];
(function walk(dir) {
  for (const n of readdirSync(dir)) {
    const f = join(dir, n);
    if (statSync(f).isDirectory()) { if (n !== 'pagefind') walk(f); continue; }
    if (!TEXT.has(extname(f))) continue;
    const body = readFileSync(f, 'utf8').toLowerCase();
    for (const b of BANNED) if (body.includes(b)) hits.push(`${f}: ${b}`);
  }
})('dist');
if (hits.length) { console.error('privacy: third-party tracking or font hosts found:\n' + hits.join('\n')); process.exit(1); }
console.log('privacy: no third-party font, analytics or session-replay hosts in dist');
