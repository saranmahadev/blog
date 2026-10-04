import { getCollection, type CollectionEntry } from 'astro:content';
import { patternFor, toneFor, type Pattern, type Tone } from './site';
import { DRAFTS_ROOT, draftUrl, parseDraftsToken } from './drafts';

/** Top-level paths owned by fixed pages/assets; content may not use them. */
const RESERVED_SLUGS = new Set([
  'about', 'imaxt', 'projects', 'blog', 'series', 'tags', 'search', 'login', 'register', 'reset', 'profile', 'inbox', 'admin',
  'security', 'privacy', 'source', 'github', 'content', 'llms.txt', 'terms', 'accessibility', 'contact', 'advertise', 'api', 'archive', 'topics', 'rss', 'rss.xml', 'atom.xml', 'feed.json', 'feed.xsl', 'sitemap', '404', '_astro', 'images', 'fonts', 'icons',
  'favicon.svg', 'robots.txt', DRAFTS_ROOT,
]);

const isPublished = ({ data }: { data: { draft: boolean } }) => import.meta.env.DEV || !data.draft;

export type Post = {
  /** `<slug>` or `<series>/<post>` */
  key: string;
  url: string;
  slug: string;
  seriesSlug?: string;
  seriesTitle?: string;
  /** Series colour; undefined for standalone posts. */
  tone?: Tone;
  pattern: Pattern;
  entry: CollectionEntry<'posts'> | CollectionEntry<'seriesPosts'>;
  data: CollectionEntry<'posts'>['data'] & { order?: number };
  /** True for a draft served from the secret folder (see drafts.ts). Published posts leave it unset. */
  draft?: boolean;
};

export type Series = {
  slug: string;
  url: string;
  tone: Tone;
  pattern: Pattern;
  entry: CollectionEntry<'series'>;
  posts: Post[];
};

const seriesSlugOf = (id: string) => id.split('/')[0];

function assertSlug(slug: string, source: string) {
  if (RESERVED_SLUGS.has(slug)) {
    throw new Error(`"${slug}" (${source}) is a reserved route and cannot be used as a slug.`);
  }
}

let cache: Promise<{ posts: Post[]; series: Series[] }> | undefined;

export function getContent() {
  cache ??= load();
  return cache;
}

async function load() {
  const [standalone, seriesEntries, seriesPostEntries] = await Promise.all([
    getCollection('posts', isPublished),
    getCollection('series', isPublished),
    getCollection('seriesPosts', isPublished),
  ]);

  const series: Series[] = seriesEntries.map((entry) => {
    const slug = seriesSlugOf(entry.id);
    assertSlug(slug, 'series');
    return {
      slug,
      url: `/${slug}/`,
      tone: entry.data.tone ?? toneFor(slug),
      pattern: entry.data.pattern ?? patternFor(slug),
      entry,
      posts: [],
    };
  });
  const seriesBySlug = new Map(series.map((s) => [s.slug, s]));

  const posts: Post[] = standalone.map((entry) => {
    assertSlug(entry.id, 'post');
    return { key: entry.id, url: `/${entry.id}/`, slug: entry.id, pattern: patternFor(entry.id), entry, data: entry.data };
  });

  for (const entry of seriesPostEntries) {
    const [seriesSlug, slug] = entry.id.split('/');
    const parent = seriesBySlug.get(seriesSlug);
    // Posts whose series index is missing or a draft are not published.
    if (!parent) continue;
    const post: Post = {
      key: entry.id,
      url: `/${entry.id}/`,
      slug,
      seriesSlug,
      seriesTitle: parent.entry.data.title,
      tone: parent.tone,
      pattern: parent.pattern,
      entry,
      data: entry.data,
    };
    parent.posts.push(post);
    posts.push(post);
  }

  // A top-level slug may be a post or a series, never both.
  const seen = new Set<string>();
  for (const slug of [...series.map((s) => s.slug), ...posts.filter((p) => !p.seriesSlug).map((p) => p.slug)]) {
    if (seen.has(slug)) throw new Error(`Slug "${slug}" is used by both a series and a standalone post.`);
    seen.add(slug);
  }

  const byOrder = (a: Post, b: Post) =>
    (a.data.order ?? Infinity) - (b.data.order ?? Infinity) || a.data.date.valueOf() - b.data.date.valueOf();
  series.forEach((s) => s.posts.sort(byOrder));
  series.sort((a, b) => (b.posts.at(-1)?.data.date.valueOf() ?? 0) - (a.posts.at(-1)?.data.date.valueOf() ?? 0));
  posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  return { posts, series };
}

/**
 * Drafts, for the secret folder. Empty unless DRAFTS_TOKEN is set at build time, and always empty in dev (dev shows every
 * draft as an ordinary page). `series` holds each series that has a draft, with its published posts and drafts together so
 * Previous and Up next work; a draft links to other drafts inside the secret folder.
 */
let draftCache: Promise<{ token?: string; posts: Post[]; series: Series[] }> | undefined;

export function getDrafts() {
  draftCache ??= loadDrafts();
  return draftCache;
}

async function loadDrafts() {
  const token = parseDraftsToken(process.env.DRAFTS_TOKEN);
  if (!token || import.meta.env.DEV) return { token, posts: [] as Post[], series: [] as Series[] };

  const [standalone, seriesEntries, seriesPostEntries] = await Promise.all([
    getCollection('posts'),
    getCollection('series'),
    getCollection('seriesPosts'),
  ]);

  const posts: Post[] = [];
  for (const entry of standalone.filter((e) => e.data.draft)) {
    assertSlug(entry.id, 'post');
    posts.push({ key: entry.id, url: draftUrl(token, entry.id), slug: entry.id, pattern: patternFor(entry.id), entry, data: entry.data, draft: true });
  }

  const series: Series[] = [];
  for (const entry of seriesEntries) {
    const slug = seriesSlugOf(entry.id);
    const own = seriesPostEntries.filter((e) => e.id.split('/')[0] === slug);
    if (!own.some((e) => e.data.draft)) continue;
    const tone = entry.data.tone ?? toneFor(slug);
    const pattern = entry.data.pattern ?? patternFor(slug);
    const s: Series = { slug, url: `/${slug}/`, tone, pattern, entry, posts: [] };
    for (const e of own) {
      const key = e.id;
      const post: Post = {
        key, url: e.data.draft ? draftUrl(token, key) : `/${key}/`, slug: key.split('/')[1], seriesSlug: slug,
        seriesTitle: entry.data.title, tone, pattern, entry: e, data: e.data, draft: e.data.draft,
      };
      s.posts.push(post);
      if (e.data.draft) posts.push(post);
    }
    s.posts.sort((a, b) => (a.data.order ?? Infinity) - (b.data.order ?? Infinity) || a.data.date.valueOf() - b.data.date.valueOf());
    series.push(s);
  }
  posts.sort((a, b) => a.key.localeCompare(b.key));
  return { token, posts, series };
}

/** Posts that share the most tags with `post`, newest first on ties. */
export function getRelated(post: Post, all: Post[], limit = 3) {
  const tags = new Set(post.data.tags.map((t) => t.toLowerCase()));
  return all
    .filter((p) => p.key !== post.key)
    .map((p) => ({ p, score: p.data.tags.filter((t) => tags.has(t.toLowerCase())).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.p.data.date.valueOf() - a.p.data.date.valueOf())
    .slice(0, limit)
    .map((x) => x.p);
}

/** Letter shown on a post's thumbnail: its series, else its own title. */
export const initialOf = (p: Post) => (p.seriesTitle ?? p.data.title).trim()[0]?.toUpperCase() ?? '·';

export const slugifyTag = (t: string) =>
  t.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export type Topic = { slug: string; label: string; posts: Post[] };

/** Tags across all posts, grouped by slug (case-insensitive). Most-used first. */
export function getTopics(posts: Post[]): Topic[] {
  const map = new Map<string, Topic>();
  for (const p of posts) {
    for (const t of p.data.tags) {
      const slug = slugifyTag(t);
      if (!slug) continue;
      const topic = map.get(slug) ?? { slug, label: t, posts: [] };
      if (!topic.posts.includes(p)) topic.posts.push(p);
      map.set(slug, topic);
    }
  }
  return [...map.values()].sort((a, b) => b.posts.length - a.posts.length || a.label.localeCompare(b.label));
}
