import { getCollection, type CollectionEntry } from 'astro:content';
import { patternFor, toneFor, type Pattern, type Tone } from './site';

/** Top-level paths owned by fixed pages/assets; content may not use them. */
export const RESERVED_SLUGS = new Set([
  'about', 'imaxt', 'projects', 'blog', 'series', 'tags', 'search', 'login', 'register', 'reset', 'profile', 'admin',
  'api', 'archive', 'topics', 'rss', 'rss.xml', 'sitemap', '404', '_astro', 'images', 'fonts', 'icons',
  'favicon.svg', 'robots.txt',
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
