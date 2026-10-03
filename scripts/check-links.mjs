// Fails if any internal link, image, script, stylesheet or #anchor in dist/ points at something that does not exist.
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'parse5';

const dist = path.resolve('dist');
const pages = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (e.name !== 'pagefind') walk(p); } else if (e.name.endsWith('.html')) pages.push(p);
  }
})(dist);

const urlOf = (file) => '/' + path.relative(dist, file).replace(/index\.html$/, '').replace(/\.html$/, '').split(path.sep).join('/');
const resolveFile = (pathname) => {
  const clean = decodeURIComponent(pathname);
  const candidates = [path.join(dist, clean), path.join(dist, clean, 'index.html'), path.join(dist, clean + '.html')];
  return candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
};

const walkNodes = (node, fn) => { fn(node); (node.childNodes ?? []).forEach((c) => walkNodes(c, fn)); if (node.content) walkNodes(node.content, fn); };
const attr = (n, name) => n.attrs?.find((a) => a.name === name)?.value;

const idsCache = new Map();
const idsOf = (file) => {
  if (!idsCache.has(file)) {
    const ids = new Set();
    walkNodes(parse(fs.readFileSync(file, 'utf8')), (n) => { const id = attr(n, 'id'); if (id) ids.add(id); const nm = n.tagName === 'a' ? attr(n, 'name') : undefined; if (nm) ids.add(nm); });
    idsCache.set(file, ids);
  }
  return idsCache.get(file);
};

const bad = [];
let checked = 0;
for (const file of pages) {
  const here = urlOf(file);
  walkNodes(parse(fs.readFileSync(file, 'utf8')), (n) => {
    const raw = n.tagName === 'a' || n.tagName === 'link' ? attr(n, 'href') : ['img', 'script', 'source'].includes(n.tagName) ? attr(n, 'src') : undefined;
    if (!raw || /^(mailto:|tel:|data:|javascript:)/.test(raw)) return;
    let u;
    try { u = new URL(raw, `http://x${here}`); } catch { bad.push(`${here}: invalid URL "${raw}"`); return; }
    if (u.origin !== 'http://x' && !u.origin.includes('blog.saranmahadev.in')) return; // external links are not checked
    checked++;
    const target = resolveFile(u.pathname);
    if (!target) { bad.push(`${here}: ${raw} does not exist`); return; }
    if (u.hash && u.hash.length > 1 && target.endsWith('.html') && !idsOf(target).has(decodeURIComponent(u.hash.slice(1)))) bad.push(`${here}: ${raw} has no matching #${u.hash.slice(1)}`);
  });
}
if (bad.length) { console.error(`${bad.length} broken link(s):\n` + [...new Set(bad)].map((b) => '  ' + b).join('\n')); process.exit(1); }
console.log(`links: ${checked} internal references across ${pages.length} pages, all resolve`);
