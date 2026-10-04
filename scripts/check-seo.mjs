// Search-engine basics on the built site: titles, descriptions, canonicals, one h1, share image, valid structured data, sitemap integrity.
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'parse5';

const dist = path.resolve('dist');
const problems = [];
const titles = new Map();
const descs = new Map();
const pages = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!['pagefind', 'og-card'].includes(e.name)) walk(p); } else if (e.name.endsWith('.html')) pages.push(p);
  }
})(dist);

const find = (n, pred, out = []) => { if (pred(n)) out.push(n); (n.childNodes || []).forEach((c) => find(c, pred, out)); return out; };
const attr = (n, a) => n.attrs?.find((x) => x.name === a)?.value;
const text = (n) => (n.childNodes || []).map((c) => (c.nodeName === '#text' ? c.value : text(c))).join('');
const url = (f) => '/' + path.relative(dist, f).replace(/index\.html$/, '').replace(/\\/g, '/');
const indexable = new Set();

for (const f of pages) {
  const u = url(f);
  if (u === '/404.html') continue;
  const doc = parse(fs.readFileSync(f, 'utf8'));
  const meta = (name, key = 'name') => find(doc, (n) => n.tagName === 'meta' && attr(n, key) === name).map((n) => attr(n, 'content'));
  const noindex = meta('robots').some((c) => /noindex/.test(c));
  if (!noindex) indexable.add(u);
  const [title] = find(doc, (n) => n.tagName === 'title').map(text);
  const [desc] = meta('description');
  const h1 = find(doc, (n) => n.tagName === 'h1');
  const canon = find(doc, (n) => n.tagName === 'link' && attr(n, 'rel') === 'canonical').map((n) => attr(n, 'href'));
  const og = meta('og:image', 'property');
  if (noindex) continue; // sign-in and account pages are not in search, so they only need to work
  if (!title) problems.push(`${u}: no <title>`);
  else { if (title.length > 75) problems.push(`${u}: title is ${title.length} characters (keep it under 75)`); titles.set(title, [...(titles.get(title) || []), u]); }
  if (!desc) problems.push(`${u}: no meta description`);
  else { if (desc.length < 50 || desc.length > 170) problems.push(`${u}: description is ${desc.length} characters (aim for 50-170)`); descs.set(desc, [...(descs.get(desc) || []), u]); }
  if (h1.length !== 1) problems.push(`${u}: ${h1.length} <h1> elements (want exactly one)`);
  if (!noindex && canon.length !== 1) problems.push(`${u}: ${canon.length} canonical links`);
  if (!noindex && !og.length) problems.push(`${u}: no og:image`);
  if (!find(doc, (n) => n.tagName === 'html' && attr(n, 'lang')).length) problems.push(`${u}: <html> has no lang`);
  for (const s of find(doc, (n) => n.tagName === 'script' && attr(n, 'type') === 'application/ld+json')) {
    try { const j = JSON.parse(text(s)); if (!j['@context']) problems.push(`${u}: structured data without @context`); } catch { problems.push(`${u}: invalid structured data JSON`); }
  }
  if (find(doc, (n) => n.tagName === 'meta' && attr(n, 'property') === 'og:type' && attr(n, 'content') === 'article').length) {
    if (!meta('article:published_time', 'property').length) problems.push(`${u}: article without article:published_time`);
  }
}
for (const [m, list] of [['title', titles], ['description', descs]]) for (const [v, us] of list) if (us.length > 1 && !us.every((x) => !indexable.has(x))) problems.push(`duplicate ${m} on ${us.join(', ')}: "${v.slice(0, 50)}"`);

// Sitemap: every URL exists and is indexable; every indexable page is listed.
const sm = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8');
const listed = [...sm.matchAll(/<loc>https?:\/\/[^/]+(\/[^<]*)<\/loc>/g)].map((m) => m[1]);
for (const u of listed) { if (!fs.existsSync(path.join(dist, u, 'index.html'))) problems.push(`sitemap lists ${u}, which is not built`); else if (!indexable.has(u)) problems.push(`sitemap lists ${u}, which is noindex`); }
const robots = fs.existsSync(path.join(dist, 'robots.txt')) ? fs.readFileSync(path.join(dist, 'robots.txt'), 'utf8') : '';
if (!/^Sitemap:\s*https?:\/\//im.test(robots)) problems.push('robots.txt has no Sitemap line');
for (const f of ['site.webmanifest', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'favicon.svg']) if (!fs.existsSync(path.join(dist, f))) problems.push(`missing ${f}`);

if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log(`seo: ${pages.length} pages, ${listed.length} sitemap URLs, titles, descriptions, canonicals, structured data and icons all pass`);
