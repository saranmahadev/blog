// Checks every feed in dist/: the XML is well formed, each item has the fields readers need, every link points at a
// page that exists, and nothing a reader could not render (scripts, SVG, widgets) leaked into the HTML.
import fs from 'node:fs';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import { SyntaxValidator } from 'fast-xml-validator';

const dist = path.resolve('dist');
const origin = (process.env.SITE_URL || 'https://blog.saranmahadev.in').replace(/\/$/, '');
const problems = [];
const bad = (file, msg) => problems.push(`${file}: ${msg}`);
const exists = (url) => {
  if (!url.startsWith(origin)) return false;
  const p = path.join(dist, decodeURIComponent(new URL(url).pathname));
  return fs.existsSync(p) && (!fs.statSync(p).isDirectory() || fs.existsSync(path.join(p, 'index.html')));
};
const leaks = (html) => /<(script|svg|astro-island|iframe|input|button)\b|\son\w+=|javascript:/i.test(html);

const feedFiles = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (['rss.xml', 'atom.xml', 'feed.json'].includes(e.name)) feedFiles.push(p);
  }
})(dist);
if (feedFiles.length < 3) bad('dist', 'feeds are missing');

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@', processEntities: true });
const list = (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

for (const f of feedFiles) {
  const rel = path.relative(dist, f);
  const text = fs.readFileSync(f, 'utf8');
  const feedUrl = `${origin}/${rel}`;
  if (f.endsWith('.json')) {
    let j;
    try { j = JSON.parse(text); } catch (e) { bad(rel, `invalid JSON (${e.message})`); continue; }
    if (j.version !== 'https://jsonfeed.org/version/1.1') bad(rel, 'wrong version');
    if (j.feed_url !== feedUrl) bad(rel, `feed_url is ${j.feed_url}`);
    if (!j.title || !j.home_page_url) bad(rel, 'missing title or home_page_url');
    for (const it of j.items) {
      for (const k of ['id', 'url', 'title', 'content_html', 'date_published']) if (!it[k]) bad(rel, `item missing ${k}`);
      if (it.url && !exists(it.url)) bad(rel, `item url does not exist: ${it.url}`);
      if (leaks(it.content_html ?? '')) bad(rel, `unrenderable markup in ${it.url}`);
    }
    continue;
  }
  try { SyntaxValidator.validate(text); } catch (e) { bad(rel, `not well formed: ${e.message}`); continue; }
  const x = parser.parse(text);
  if (x.rss) {
    const c = x.rss.channel;
    for (const k of ['title', 'link', 'description', 'language', 'lastBuildDate']) if (!c[k]) bad(rel, `channel missing ${k}`);
    if (c['atom:link']?.['@href'] !== feedUrl) bad(rel, 'atom:link rel=self is missing or wrong');
    for (const it of list(c.item)) {
      for (const k of ['title', 'link', 'guid', 'pubDate', 'description', 'content:encoded', 'dc:creator']) if (!it[k]) bad(rel, `item missing ${k}: ${it.link}`);
      if (it.link && !exists(it.link)) bad(rel, `item link does not exist: ${it.link}`);
      if (leaks(it['content:encoded'] ?? '')) bad(rel, `unrenderable markup in ${it.link}`);
    }
  } else if (x.feed) {
    const fd = x.feed;
    for (const k of ['id', 'title', 'updated', 'author']) if (!fd[k]) bad(rel, `feed missing ${k}`);
    if (!list(fd.link).some((l) => l['@rel'] === 'self' && l['@href'] === feedUrl)) bad(rel, 'rel=self link is missing or wrong');
    for (const e of list(fd.entry)) {
      for (const k of ['id', 'title', 'updated', 'published', 'content']) if (!e[k]) bad(rel, `entry missing ${k}: ${e.id}`);
      if (e.id && !exists(e.id)) bad(rel, `entry id does not exist: ${e.id}`);
      if (leaks(e.content?.['#text'] ?? '')) bad(rel, `unrenderable markup in ${e.id}`);
    }
  } else bad(rel, 'neither RSS nor Atom');
}

// llms.txt points AI agents at the repository, and lists every article that is built.
const llms = path.join(dist, 'llms.txt');
if (!fs.existsSync(llms)) bad('llms.txt', 'is missing');
else {
  const t = fs.readFileSync(llms, 'utf8');
  if (!t.includes('https://github.com/saranmahadev/blog')) bad('llms.txt', 'does not point to the GitHub repository');
  const feed = JSON.parse(fs.readFileSync(path.join(dist, 'feed.json'), 'utf8'));
  for (const it of feed.items) if (!t.includes(it.title)) bad('llms.txt', `does not list "${it.title}"`);
}
const robots = fs.readFileSync(path.join(dist, 'robots.txt'), 'utf8');
for (const ua of ['GPTBot', 'ClaudeBot', 'PerplexityBot']) if (!robots.includes(`User-agent: ${ua}`)) bad('robots.txt', `does not address ${ua}`);
if (!/Allow: \/llms\.txt/.test(robots)) bad('robots.txt', 'does not leave /llms.txt readable for agents');

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`feeds: ${feedFiles.length} files OK`);
