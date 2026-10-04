// Raw material for scripts/build-feeds.mjs, which writes the feeds after the build and then deletes this file,
// so it is never published. Feeds carry each post's full rendered text, which only exists once the pages are built.
import { getContent, getTopics } from '@/lib/content';
import { isImageCover } from '@/lib/cover';
import { SITE } from '@/lib/site';

export async function GET() {
  const { posts, series } = await getContent();
  const view = (p: (typeof posts)[number]) => ({
    key: p.key,
    url: p.url,
    title: p.data.title,
    description: p.data.description,
    date: p.data.date.toISOString(),
    updated: (p.data.updated ?? p.data.date).toISOString(),
    author: p.data.author,
    tags: p.data.tags,
    series: p.seriesTitle,
    image: isImageCover(p.data.cover) ? p.data.cover.image : `/og/${p.key}.png`,
    /** Path of the Markdown/MDX source in the repository. */
    source: p.entry.filePath,
  });
  return Response.json({
    site: { title: SITE.title, byline: SITE.byline, description: SITE.description, author: SITE.author },
    posts: posts.map(view),
    series: series.map((s) => ({ slug: s.slug, url: s.url, title: s.entry.data.title, description: s.entry.data.description, posts: s.posts.map((p) => p.key) })),
    topics: getTopics(posts).map((t) => ({ slug: t.slug, label: t.label, posts: t.posts.map((p) => p.key) })),
  });
}
