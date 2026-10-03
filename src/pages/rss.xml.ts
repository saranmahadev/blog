import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getContent } from '@/lib/content';
import { SITE } from '@/lib/site';

export async function GET(context: APIContext) {
  const { posts } = await getContent();
  return rss({
    title: `${SITE.title}, ${SITE.byline.toLowerCase()}`,
    description: SITE.description,
    site: context.site!,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.date,
      link: p.url,
      categories: p.data.tags,
      author: p.data.author,
    })),
  });
}
