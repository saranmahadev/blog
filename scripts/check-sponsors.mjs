// Checks every live banner before it can go out: a safe link, a label, alt text and an image of exactly the right size for its
// slot (or double), and within the file budget. Then checks the built pages: each banner has its label, and a paid banner's link
// is marked as sponsored.
import fs from 'node:fs';
import path from 'node:path';
import { imageSize } from 'image-size';

const SLOTS = { inline: [720, 90], end: [720, 200], rail: [300, 250] };
const MOBILE = [320, 100];
const MAX = 100 * 1024;
const dir = path.resolve('src/content/sponsors');
const today = new Date().toISOString().slice(0, 10);
const problems = [];
const bad = (id, msg) => problems.push(`${id}: ${msg}`);

let live = 0;
for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.json'))) {
  const id = f.replace(/\.json$/, '');
  const s = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  if (!s.active || id === 'example') continue;
  if ((s.start && s.start > today) || (s.end && s.end < today)) continue;
  live++;
  if (!/^https:\/\//.test(s.href) && !s.href.startsWith('/')) bad(id, `link must be https (is ${s.href})`);
  if (s.kind === 'image') {
    if (!s.alt || s.alt.trim().length < 5) bad(id, 'image banners need alt text');
    for (const slot of s.sizes) {
      const files = [[s.image, SLOTS[slot], `${slot} image`]];
      if (s.image2x) files.push([s.image2x, SLOTS[slot].map((n) => n * 2), `${slot} 2x image`]);
      if (s.mobileImage && slot !== 'rail') files.push([s.mobileImage, MOBILE, 'phone image']);
      for (const [rel, [w, h], what] of files) {
        const file = path.resolve('public', String(rel).replace(/^\//, ''));
        if (!rel || !fs.existsSync(file)) { bad(id, `${what} is missing (${rel})`); continue; }
        if (fs.statSync(file).size > MAX) bad(id, `${what} is ${Math.round(fs.statSync(file).size / 1024)} KB; the limit is ${MAX / 1024} KB`);
        if (file.endsWith('.svg')) continue;
        const d = imageSize(fs.readFileSync(file));
        if (d.width !== w || d.height !== h) bad(id, `${what} is ${d.width} x ${d.height}; it must be ${w} x ${h}`);
      }
    }
  } else {
    if (!s.headline || !s.cta) bad(id, 'text banners need a headline and button text');
  }
}

// The built pages.
const dist = path.resolve('dist');
let banners = 0;
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) {
      const html = fs.readFileSync(p, 'utf8');
      for (const m of html.matchAll(/<aside class="sponsor [^>]*>([\s\S]*?)<\/aside>/g)) {
        banners++;
        const rel = path.relative(dist, p);
        const label = m[1].match(/class="sponsor-tag">([^<]+)</)?.[1];
        if (!label || !['Sponsored', 'Dev Universe', 'Example'].includes(label)) bad(rel, `banner without a proper label (${label})`);
        const a = m[1].match(/<a [^>]*>/)?.[0] ?? '';
        const external = /href="https?:/.test(a);
        if (label === 'Sponsored' && external && !/rel="[^"]*sponsored/.test(a)) bad(rel, 'a paid banner link is not marked rel="sponsored"');
        if (/<img /.test(m[1]) && !/<img [^>]*alt="[^"]+"/.test(m[1]) && label !== 'Example') bad(rel, 'banner image without alt text');
        if (/<img /.test(m[1]) && !/<img [^>]*width="\d+"[^>]*height="\d+"/.test(m[1])) bad(rel, 'banner image without width and height');
      }
    }
  }
})(dist);

if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log(`sponsors: ${live} live banners valid, ${banners} placements checked in the built pages`);
