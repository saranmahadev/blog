import type { APIRoute } from 'astro';
import { getPosts } from '../lib/content';
import { postMarkdown } from '../lib/markdown';
import { SITE } from '../lib/site';

// Every post in one Markdown file, newest first. Large but cheap: it is built once at deploy time.
export const GET: APIRoute = async ({ site }) => {
  const origin = site!.origin;
  const documents = await Promise.all((await getPosts()).map((post) => postMarkdown(post, origin)));

  const text = `# ${SITE.name}: full text

> ${SITE.description}

Source: ${origin}/ · Author: ${SITE.author.name} · Index: ${origin}/llms.txt

${documents.join('\n\n---\n\n')}`;

  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
