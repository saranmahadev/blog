import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

export const byNewest = (a: Post, b: Post) =>
  b.data.publishedAt.getTime() - a.data.publishedAt.getTime();

/** Published posts, newest first. */
export const getPosts = async () =>
  (await getCollection('posts', ({ data }) => !data.draft)).sort(byNewest);

/** Posts of one series in reading order: explicit `order` first, then publish date. */
export const getSeriesPosts = async (seriesId: string) =>
  (await getPosts())
    .filter((post) => post.data.series?.id === seriesId)
    .sort(
      (a, b) =>
        (a.data.order ?? Number.MAX_SAFE_INTEGER) - (b.data.order ?? Number.MAX_SAFE_INTEGER) ||
        a.data.publishedAt.getTime() - b.data.publishedAt.getTime(),
    );

export const tagSlug = (tag: string) =>
  tag
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Every tag in use, with its posts, most-used first. */
export const getTopics = async () => {
  const topics = new Map<string, { slug: string; name: string; posts: Post[] }>();
  for (const post of await getPosts()) {
    for (const tag of post.data.tags) {
      const slug = tagSlug(tag);
      const topic = topics.get(slug) ?? { slug, name: tag, posts: [] };
      topic.posts.push(post);
      topics.set(slug, topic);
    }
  }
  return [...topics.values()].sort((a, b) => b.posts.length - a.posts.length || a.name.localeCompare(b.name));
};

/** Posts ranked by shared tags (and same series), then recency. */
export const getRelated = async (post: Post, limit = 3) => {
  const tags = new Set(post.data.tags.map(tagSlug));
  return (await getPosts())
    .filter((other) => other.id !== post.id)
    .map((other) => ({
      other,
      score:
        other.data.tags.filter((tag) => tags.has(tagSlug(tag))).length * 2 +
        (post.data.series && other.data.series?.id === post.data.series.id ? 3 : 0),
    }))
    .sort((a, b) => b.score - a.score || byNewest(a.other, b.other))
    .slice(0, limit)
    .map(({ other }) => other);
};
