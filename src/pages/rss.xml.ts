import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPosts } from '../lib/content';
import { postHtml, postPath } from '../lib/markdown';
import { SITE } from '../lib/site';

export async function GET(context: APIContext) {
  const origin = context.site!.origin;
  const posts = await getPosts();

  return rss({
    title: SITE.name,
    description: SITE.description,
    site: context.site!,
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
    customData: `<language>${SITE.language}</language><atom:link href="${origin}/rss.xml" rel="self" type="application/rss+xml"/>`,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.publishedAt,
      link: postPath(post),
      author: `${SITE.email} (${SITE.author.name})`,
      categories: post.data.tags,
      // Full text, so feed readers and agents do not need a second request.
      content: postHtml(post, origin),
    })),
  });
}
