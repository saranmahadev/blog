/**
 * Post-build SEO and agent-readiness audit. Usage: node scripts/audit-seo.mjs [dist] [https://site]
 * Fails (exit 1) on errors; prints warnings without failing.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dist = process.argv[2] ?? 'dist';
const site = (process.argv[3] ?? 'https://blog.saranmahadev.in').replace(/\/$/, '');

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
const read = (file) => readFileSync(join(dist, file), 'utf8');
const urlPath = (file) => '/' + file.replace(dist + '/', '').replace(/index\.html$/, '').replaceAll('\\', '/');

const errors = [];
const warnings = [];
const fail = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

const pages = walk(dist)
  .filter((f) => f.endsWith('.html') && !f.includes('pagefind'))
  .map((f) => f.replaceAll('\\', '/'));

const titles = new Map();
const descriptions = new Map();
const indexable = [];
const postPages = [];

for (const file of pages) {
  const rel = file.replace(dist + '/', '');
  const html = readFileSync(file, 'utf8');
  const path = urlPath(file);
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1]?.trim() ?? '';
  const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
  const robots = html.match(/<meta name="robots" content="([^"]*)"/)?.[1] ?? '';
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
  const noindex = /noindex/.test(robots);

  if (rel === '404.html') {
    if (!noindex) fail('404 page should be noindex');
    continue;
  }
  indexable.push(`${site}${path}`);

  if (title.length < 10 || title.length > 62) warn(`${path}: title is ${title.length} chars (aim for 10-60): "${title}"`);
  if (description.length < 70 || description.length > 160) fail(`${path}: description is ${description.length} chars (need 70-160)`);
  if (!robots || noindex) fail(`${path}: should be indexable (robots="${robots}")`);
  if (canonical !== `${site}${path}`) fail(`${path}: canonical is ${canonical}, expected ${site}${path}`);
  if ((html.match(/<h1[\s>]/g) ?? []).length !== 1) fail(`${path}: needs exactly one <h1>`);
  if (!/<html lang="[a-z-]+"/.test(html)) fail(`${path}: missing <html lang>`);
  if ((html.match(/<main[\s>]/g) ?? []).length !== 1) fail(`${path}: needs exactly one <main>`);
  for (const tag of ['og:title', 'og:description', 'og:image', 'og:url', 'og:image:alt', 'twitter:card', 'twitter:image']) {
    if (!new RegExp(`(property|name)="${tag}"`).test(html)) fail(`${path}: missing ${tag}`);
  }
  if (!/rel="manifest"/.test(html) || !/rel="apple-touch-icon"/.test(html)) fail(`${path}: missing manifest or apple-touch-icon`);

  titles.set(title, [...(titles.get(title) ?? []), path]);
  descriptions.set(description, [...(descriptions.get(description) ?? []), path]);

  // Structured data must parse and carry the entities agents rely on.
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  if (blocks.length !== 1) fail(`${path}: expected one JSON-LD block, found ${blocks.length}`);
  else {
    try {
      const graph = JSON.parse(blocks[0])['@graph'] ?? [];
      const types = graph.flatMap((n) => [n['@type']].flat());
      for (const needed of ['Person', 'WebSite']) if (!types.includes(needed)) fail(`${path}: JSON-LD missing ${needed}`);
      if (path !== '/' && !types.includes('BreadcrumbList')) fail(`${path}: JSON-LD missing BreadcrumbList`);
      if (path.startsWith('/posts/') && path !== '/posts/') {
        postPages.push(path);
        const article = graph.find((n) => n['@type'] === 'BlogPosting');
        if (!article) fail(`${path}: JSON-LD missing BlogPosting`);
        else for (const key of ['headline', 'datePublished', 'dateModified', 'author', 'image', 'wordCount', 'description']) {
          if (!article[key]) fail(`${path}: BlogPosting missing ${key}`);
        }
        const md = html.match(/<link rel="alternate" type="text\/markdown"[^>]*href="([^"]+)"/)?.[1];
        if (!md) fail(`${path}: missing Markdown alternate link`);
        else if (!existsSync(join(dist, md))) fail(`${path}: Markdown twin ${md} does not exist`);
      }
    } catch (error) {
      fail(`${path}: JSON-LD is not valid JSON (${error.message})`);
    }
  }
}

for (const [title, paths] of titles) if (paths.length > 1) fail(`duplicate title "${title}": ${paths.join(', ')}`);
for (const [, paths] of descriptions) if (paths.length > 1) fail(`duplicate description: ${paths.join(', ')}`);

// Sitemap covers every indexable page, with lastmod on posts.
const sitemap = read('sitemap-0.xml');
for (const url of indexable) if (!sitemap.includes(`<loc>${url}</loc>`)) fail(`sitemap is missing ${url}`);
for (const path of postPages) if (!new RegExp(`<loc>${site}${path}</loc><lastmod>`).test(sitemap)) fail(`sitemap entry for ${path} has no lastmod`);

// robots.txt
const robots = read('robots.txt');
if (!robots.includes(`Sitemap: ${site}/sitemap-index.xml`)) fail('robots.txt lacks the Sitemap line');
for (const bot of ['OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'PerplexityBot', 'GPTBot', 'ClaudeBot', 'Google-Extended']) {
  if (!robots.includes(`User-agent: ${bot}`)) fail(`robots.txt has no group for ${bot}`);
}
if (/Disallow:\s*\/\s*$/m.test(robots)) fail('robots.txt blocks the whole site');

// llms.txt / llms-full.txt
const llms = read('llms.txt');
const llmsFull = read('llms-full.txt');
if (!llms.startsWith('# ') || !/^> /m.test(llms)) fail('llms.txt must start with an H1 and a blockquote summary');
for (const path of postPages) {
  const slug = path.split('/')[2];
  if (!llms.includes(`${site}/posts/${slug}.md`)) fail(`llms.txt does not list ${slug}`);
  if (!llmsFull.includes(`url: ${site}${path}`)) fail(`llms-full.txt does not contain ${slug}`);
}

// Feeds
const rss = read('rss.xml');
const rssItems = (rss.match(/<item>/g) ?? []).length;
if (rssItems !== postPages.length) fail(`rss.xml has ${rssItems} items, expected ${postPages.length}`);
if ((rss.match(/<content:encoded>/g) ?? []).length !== rssItems) fail('rss.xml items are missing full text (content:encoded)');
try {
  const feed = JSON.parse(read('feed.json'));
  if (feed.items.length !== postPages.length || feed.items.some((i) => !i.content_html)) fail('feed.json items incomplete');
} catch (error) {
  fail(`feed.json invalid: ${error.message}`);
}

// security.txt (RFC 9116): present, with Contact and an Expires that is in the future but within a year.
const sec = read('.well-known/security.txt');
const expires = new Date(sec.match(/^Expires:\s*(.+)$/m)?.[1] ?? NaN);
if (!/^Contact:/m.test(sec)) fail('security.txt has no Contact');
if (!(expires > new Date())) fail('security.txt has expired');
else if (expires - new Date() > 366 * 864e5) fail('security.txt Expires is more than a year away (RFC 9116)');
else if (expires - new Date() < 45 * 864e5) warn('security.txt expires within 45 days');

// Files crawlers and browsers expect
for (const file of ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'site.webmanifest', 'og/default.png']) {
  if (!existsSync(join(dist, file))) fail(`missing ${file}`);
}

console.log(`audited ${pages.length} pages (${indexable.length} indexable, ${postPages.length} posts)`);
if (warnings.length) console.log(`\n${warnings.length} warning(s):\n - ${warnings.join('\n - ')}`);
if (errors.length) {
  console.error(`\n${errors.length} error(s):\n - ${errors.join('\n - ')}`);
  process.exit(1);
}
console.log('\nSEO and agent-readiness audit passed');
