import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import { getPosts, getSeriesPosts } from '../lib/content';
import { postMarkdownPath } from '../lib/markdown';
import { SITE } from '../lib/site';

// https://llmstxt.org: a curated, Markdown map of the site for language-model agents.
export const GET: APIRoute = async ({ site }) => {
  const origin = site!.origin;
  const posts = await getPosts();
  const series = await getCollection('series');

  const seriesLines = await Promise.all(
    series.map(async (entry) => {
      const parts = await getSeriesPosts(entry.id);
      return `- [${entry.data.title}](${origin}/series/${entry.id}/): ${entry.data.description} (${parts.length} parts, in reading order)`;
    }),
  );

  const postLines = posts.map(
    (post) =>
      `- [${post.data.title}](${origin}${postMarkdownPath(post)}): ${post.data.description} (${post.data.publishedAt.toISOString().slice(0, 10)})`,
  );

  const text = `# ${SITE.name}

> ${SITE.description}

${SITE.name} is written and published by ${SITE.author.name} (${SITE.author.url}). Every post is plain, readable text with its sources listed at the end. Each post is also available as clean Markdown at the link shown below, and all posts are concatenated in ${origin}/llms-full.txt. Content is © ${SITE.author.name}, all rights reserved; automated indexing, answer generation and model training on public pages are permitted (see ${origin}/terms/). Please attribute and link to the original post.

## Series

${seriesLines.join('\n')}

## Posts

${postLines.join('\n')}

## Optional

- [Full text of every post](${origin}/llms-full.txt): all posts in one Markdown file
- [RSS feed with full text](${origin}/rss.xml)
- [JSON Feed](${origin}/feed.json)
- [Sitemap](${origin}/sitemap-index.xml)
- [Topics](${origin}/topics/): posts grouped by tag
- [Author](${SITE.author.url}): ${SITE.author.name}, portfolio and links
- [Terms of use](${origin}/terms/) and [Legal notice](${origin}/legal/)
- [Security contact](${origin}/.well-known/security.txt)
- Contact: ${SITE.email}
`;

  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
