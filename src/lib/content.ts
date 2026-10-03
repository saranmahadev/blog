import { getCollection, type CollectionEntry } from 'astro:content';

/** Top-level paths owned by fixed pages/assets; content may not use them. */
export const RESERVED_SLUGS = new Set([
  'about', 'projects', 'blog', 'series', 'tags', 'search', 'login', 'profile', 'admin',
  'api', 'rss', 'rss.xml', 'sitemap', '404', '_astro', 'images', 'fonts', 'icons',
  'favicon.svg', 'robots.txt',
]);

const isPublished = ({ data }: { data: { draft: boolean } }) =>
  import.meta.env.DEV || !data.draft;

export type Post = {
  /** `<slug>` or `<series>/<post>` */
  key: string;
  url: string;
  slug: string;
  seriesSlug?: string;
  entry: CollectionEntry<'posts'> | CollectionEntry<'seriesPosts'>;
  data: CollectionEntry<'posts'>['data'] & { order?: number };
};

export type Series = {
  slug: string;
  url: string;
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
    return { slug, url: `/${slug}/`, entry, posts: [] };
  });
  const seriesBySlug = new Map(series.map((s) => [s.slug, s]));

  const posts: Post[] = standalone.map((entry) => {
    assertSlug(entry.id, 'post');
    return { key: entry.id, url: `/${entry.id}/`, slug: entry.id, entry, data: entry.data };
  });

  for (const entry of seriesPostEntries) {
    const [seriesSlug, slug] = entry.id.split('/');
    const parent = seriesBySlug.get(seriesSlug);
    // Posts whose series index is missing or a draft are not published.
    if (!parent) continue;
    const post: Post = {
      key: entry.id, url: `/${entry.id}/`, slug, seriesSlug, entry, data: entry.data,
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
    (a.data.order ?? Infinity) - (b.data.order ?? Infinity) ||
    a.data.date.valueOf() - b.data.date.valueOf();
  series.forEach((s) => s.posts.sort(byOrder));
  posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  return { posts, series };
}
