import type { APIRoute } from 'astro';
import { getPosts } from '../lib/content';
import { postHtml, postPath } from '../lib/markdown';
import { SITE } from '../lib/site';

// JSON Feed 1.1: https://www.jsonfeed.org/version/1.1/
export const GET: APIRoute = async ({ site }) => {
  const origin = site!.origin;
  const posts = await getPosts();

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: SITE.name,
    home_page_url: `${origin}/`,
    feed_url: `${origin}/feed.json`,
    description: SITE.description,
    language: SITE.language,
    authors: [{ name: SITE.author.name, url: SITE.author.url }],
    items: posts.map((post) => ({
      id: `${origin}${postPath(post)}`,
      url: `${origin}${postPath(post)}`,
      title: post.data.title,
      summary: post.data.description,
      content_html: postHtml(post, origin),
      date_published: post.data.publishedAt.toISOString(),
      tags: post.data.tags,
      image: `${origin}/og/${post.id}.png`,
    })),
  };

  return new Response(JSON.stringify(feed, null, 2), {
    headers: { 'Content-Type': 'application/feed+json; charset=utf-8' },
  });
};
