import type { APIRoute, GetStaticPaths } from 'astro';
import { getPosts } from '../../lib/content';
import { postMarkdown } from '../../lib/markdown';

// /posts/<slug>.md: the same post as clean Markdown, for agents, readers and tools.
export const getStaticPaths = (async () =>
  (await getPosts()).map((post) => ({ params: { slug: post.id }, props: { post } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props, site }) =>
  new Response(await postMarkdown(props.post, site!.origin), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
