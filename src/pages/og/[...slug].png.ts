import { getEntry } from 'astro:content';
import type { APIRoute, GetStaticPaths } from 'astro';
import { getPosts } from '../../lib/content';
import { renderCard } from '../../lib/og';
import { coverFor, labelFor } from '../../lib/posts';

export const getStaticPaths = (async () => [
  { params: { slug: 'default' } },
  ...(await getPosts()).map((post) => ({ params: { slug: post.id } })),
]) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const post = (await getPosts()).find((entry) => entry.id === params.slug);

  const png = post
    ? await renderCard({
        title: post.data.title,
        label: labelFor(post, post.data.series ? (await getEntry(post.data.series))?.data.title : undefined),
        tone: coverFor(post).tone,
        word: post.data.coverWord,
      })
    : await renderCard({ title: 'Drafted', label: 'A blog by Saran Mahadev', tone: 'tone-0' });

  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
