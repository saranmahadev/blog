// Writes the feeds into dist/ after `astro build`, from the pages as they were actually published, so a reader
// gets the same text as the site (not just a summary).
//
//   /rss.xml  /atom.xml  /feed.json          every post, newest first (latest 50)
//   /<series>/rss.xml  .../atom.xml  .../feed.json   one series, in reading order
//   /topics/<tag>/rss.xml  .../atom.xml  .../feed.json   one topic
//
// RSS 2.0 (with atom:link, dc:creator, content:encoded, enclosure), Atom 1.0 and JSON Feed 1.1. The XML feeds carry an
// XSL stylesheet (/feed.xsl) so a browser shows a readable page instead of raw XML.
import fs from 'node:fs';
import path from 'node:path';
import sanitizeHtml from 'sanitize-html';

const dist = path.resolve('dist');
const sourceFile = path.join(dist, 'feed-source.json');
if (!fs.existsSync(sourceFile)) throw new Error('dist/feed-source.json is missing. Run `astro build` first.');
const src = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
fs.rmSync(sourceFile);

const origin = (process.env.SITE_URL || 'https://blog.saranmahadev.in').replace(/\/$/, '');
const abs = (p) => new URL(p, origin + '/').href;
const LIMIT = 50;
const GENERATOR = 'Drafted (Astro)';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cdata = (s) => `<![CDATA[${String(s).replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
const rfc822 = (iso) => new Date(iso).toUTCString();
const newest = (posts) => posts.reduce((m, p) => (p.updated > m ? p.updated : m), posts[0]?.updated ?? new Date(0).toISOString());
const mime = (f) => ({ '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml' })[path.extname(f).toLowerCase()];

/** The rendered article as clean, self-contained HTML for a feed reader. */
function articleHtml(post) {
  const file = path.join(dist, post.key, 'index.html');
  const page = fs.readFileSync(file, 'utf8');
  const m = page.match(/<article class="prose"[^>]*>([\s\S]*?)<\/article>/);
  if (!m) throw new Error(`No <article class="prose"> in ${file}`);
  let html = m[1];
  const interactive = /<astro-island|<canvas|<input|<select/.test(html);

  // A diagram is two SVGs (light and dark). Readers get its caption and description instead.
  html = html.replace(/<figure class="diagram[^"]*"[\s\S]*?<\/figure>/g, (fig) => {
    const cap = fig.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/)?.[1]?.replace(/<[^>]+>/g, '') ?? '';
    const desc = fig.match(/<desc[^>]*>([\s\S]*?)<\/desc>/)?.[1]?.replace(/<[^>]+>/g, '') ?? '';
    return `<p><em>Diagram${cap ? `: ${cap}` : ''}.${desc ? ` ${desc}` : ''}</em></p>`;
  });

  // A sidenote's label would run into its text ("NoteIdempotent means..."), so set it as a labelled quote.
  html = html.replace(/<aside class="imx-note"><span class="imx-label">([\s\S]*?)<\/span>([\s\S]*?)<\/aside>/g, (_m, label, text) => `<blockquote><p><strong>${label}.</strong> ${text}</p></blockquote>`);

  const page_url = abs(post.url);
  const resolve = (v) => { try { return new URL(v, page_url).href; } catch { return undefined; } };
  const clean = sanitizeHtml(html, {
    allowedTags: ['p', 'div', 'a', 'strong', 'em', 'b', 'i', 'u', 'code', 'pre', 'span', 'br', 'hr', 'ul', 'ol', 'li', 'blockquote', 'h2', 'h3', 'h4', 'h5', 'h6',
      'table', 'caption', 'thead', 'tbody', 'tr', 'th', 'td', 'figure', 'figcaption', 'img', 'sup', 'sub', 'kbd', 'del', 'ins', 'mark', 'abbr', 'dl', 'dt', 'dd', 'details', 'summary'],
    allowedAttributes: {
      a: ['href', 'title'], img: ['src', 'alt', 'title', 'width', 'height'], abbr: ['title'],
      h2: ['id'], h3: ['id'], h4: ['id'], h5: ['id'], h6: ['id'],
      th: ['scope', 'colspan', 'rowspan'], td: ['colspan', 'rowspan'], ol: ['start'], code: ['class'], pre: ['style'], span: ['style'],
    },
    allowedStyles: { '*': { color: [/^#[0-9a-f]{3,8}$/i], 'background-color': [/^#[0-9a-f]{3,8}$/i] } },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
    // Everything inside these goes too, not just the tags (interactive widgets, inline SVG, scripts).
    nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript', 'svg', 'template', 'astro-island', 'button', 'select', 'canvas'],
    transformTags: {
      a: (_tag, attribs) => ({ tagName: 'a', attribs: attribs.href ? { ...attribs, href: resolve(attribs.href) ?? '' } : attribs }),
      img: (_tag, attribs) => ({ tagName: 'img', attribs: { ...attribs, src: resolve(attribs.src ?? '') ?? '' } }),
    },
    // Anything the page hides from assistive technology is decoration (marquee words, bar tracks, legends), so it goes too.
    exclusiveFilter: (f) => f.attribs['aria-hidden'] === 'true' || f.attribs['data-sponsor'] !== undefined || ((f.tag === 'div' || f.tag === 'p' || f.tag === 'span') && !f.text.trim() && f.mediaChildren.length === 0),
  }).replace(/\n{3,}/g, '\n\n').trim();

  const more = interactive
    ? `<p><em>This post has interactive parts that need the site. <a href="${esc(page_url)}">Read it on ${esc(src.site.title)}</a>.</em></p>`
    : `<p><em>Originally published at <a href="${esc(page_url)}">${esc(src.site.title)}</a>.</em></p>`;
  return `${clean}\n<hr>\n${more}`;
}

const byKey = new Map(src.posts.map((p) => [p.key, p]));
const html = new Map();
const htmlOf = (p) => html.get(p.key) ?? (html.set(p.key, articleHtml(p)), html.get(p.key));
const imageInfo = (p) => {
  const url = abs(p.image);
  const file = path.join(dist, p.image.replace(/^\//, ''));
  return fs.existsSync(file) && mime(file) ? { url, type: mime(file), length: fs.statSync(file).size } : undefined;
};

function rss(feed) {
  const items = feed.posts.map((p) => {
    const img = imageInfo(p);
    return `    <item>
      <title>${esc(p.title)}</title>
      <link>${esc(abs(p.url))}</link>
      <guid isPermaLink="true">${esc(abs(p.url))}</guid>
      <pubDate>${rfc822(p.date)}</pubDate>
      <dc:creator>${esc(p.author)}</dc:creator>
${p.tags.map((t) => `      <category>${esc(t)}</category>`).join('\n')}${p.series ? `\n      <category>${esc(p.series)}</category>` : ''}
      <description>${esc(p.description)}</description>
      <content:encoded>${cdata(htmlOf(p))}</content:encoded>${img ? `\n      <enclosure url="${esc(img.url)}" length="${img.length}" type="${img.type}"/>` : ''}
    </item>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/feed.xsl"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${esc(feed.title)}</title>
    <link>${esc(abs(feed.page))}</link>
    <description>${esc(feed.description)}</description>
    <language>en</language>
    <copyright>© ${new Date(feed.updated).getUTCFullYear()} ${esc(src.site.author)}</copyright>
    <lastBuildDate>${rfc822(feed.updated)}</lastBuildDate>
    <pubDate>${rfc822(feed.updated)}</pubDate>
    <ttl>60</ttl>
    <generator>${GENERATOR}</generator>
    <docs>https://www.rssboard.org/rss-specification</docs>
    <atom:link href="${esc(abs(feed.path + 'rss.xml'))}" rel="self" type="application/rss+xml"/>
    <image>
      <url>${esc(abs('/og/default.png'))}</url>
      <title>${esc(feed.title)}</title>
      <link>${esc(abs(feed.page))}</link>
    </image>
${items.join('\n')}
  </channel>
</rss>
`;
}

function atom(feed) {
  const entries = feed.posts.map((p) => `  <entry>
    <id>${esc(abs(p.url))}</id>
    <title>${esc(p.title)}</title>
    <link rel="alternate" type="text/html" href="${esc(abs(p.url))}"/>
    <published>${p.date}</published>
    <updated>${p.updated}</updated>
    <author><name>${esc(p.author)}</name><uri>${esc(abs('/about/'))}</uri></author>
${p.tags.map((t) => `    <category term="${esc(t)}"/>`).join('\n')}
    <summary>${esc(p.description)}</summary>
    <content type="html">${esc(htmlOf(p))}</content>
  </entry>`);
  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/feed.xsl"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en">
  <id>${esc(abs(feed.page))}</id>
  <title>${esc(feed.title)}</title>
  <subtitle>${esc(feed.description)}</subtitle>
  <updated>${feed.updated}</updated>
  <link rel="self" type="application/atom+xml" href="${esc(abs(feed.path + 'atom.xml'))}"/>
  <link rel="alternate" type="text/html" href="${esc(abs(feed.page))}"/>
  <author><name>${esc(src.site.author)}</name><uri>${esc(abs('/about/'))}</uri></author>
  <rights>© ${new Date(feed.updated).getUTCFullYear()} ${esc(src.site.author)}</rights>
  <icon>${esc(abs('/og/default.png'))}</icon>
  <generator>${GENERATOR}</generator>
${entries.join('\n')}
</feed>
`;
}

function jsonFeed(feed) {
  return JSON.stringify({
    version: 'https://jsonfeed.org/version/1.1',
    title: feed.title,
    home_page_url: abs(feed.page),
    feed_url: abs(feed.path + 'feed.json'),
    description: feed.description,
    icon: abs('/og/default.png'),
    favicon: abs('/favicon.svg'),
    language: 'en',
    authors: [{ name: src.site.author, url: abs('/about/') }],
    items: feed.posts.map((p) => ({
      id: abs(p.url),
      url: abs(p.url),
      title: p.title,
      summary: p.description,
      content_html: htmlOf(p),
      image: abs(p.image),
      date_published: p.date,
      date_modified: p.updated,
      authors: [{ name: p.author }],
      tags: [...p.tags, ...(p.series ? [p.series] : [])],
      language: 'en',
    })),
  }, null, 2) + '\n';
}

const newestFirst = (a, b) => b.date.localeCompare(a.date);
const feeds = [
  { path: '/', page: '/', title: `${src.site.title}, ${src.site.byline.toLowerCase()}`, description: src.site.description, posts: [...src.posts].sort(newestFirst).slice(0, LIMIT) },
  ...src.series.map((s) => ({ path: s.url, page: s.url, title: `${s.title} · ${src.site.title}`, description: s.description, posts: s.posts.map((k) => byKey.get(k)).sort(newestFirst) })),
  ...src.topics.map((t) => ({ path: `/topics/${t.slug}/`, page: `/topics/${t.slug}/`, title: `${t.label} · ${src.site.title}`, description: `Posts about ${t.label}.`, posts: t.posts.map((k) => byKey.get(k)).sort(newestFirst).slice(0, LIMIT) })),
];

let files = 0;
for (const f of feeds) {
  f.updated = newest(f.posts);
  const dir = path.join(dist, f.path);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'rss.xml'), rss(f));
  fs.writeFileSync(path.join(dir, 'atom.xml'), atom(f));
  fs.writeFileSync(path.join(dir, 'feed.json'), jsonFeed(f));
  files += 3;
}
console.log(`feeds: ${feeds.length} feeds (${files} files)`);
