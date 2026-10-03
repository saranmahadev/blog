import type { APIContext } from 'astro';
import { getContent, getTopics } from '@/lib/content';

const day = (d: Date) => d.toISOString().slice(0, 10);

export async function GET(context: APIContext) {
  const { posts, series } = await getContent();
  const newest = (list: { data: { date: Date; updated?: Date } }[]) =>
    list.reduce((m, p) => Math.max(m, (p.data.updated ?? p.data.date).valueOf()), 0);
  const entries: { path: string; lastmod?: Date }[] = [
    { path: '/', lastmod: new Date(newest(posts)) },
    { path: '/series/' },
    { path: '/topics/' },
    { path: '/archive/', lastmod: new Date(newest(posts)) },
    { path: '/about/' },
    ...series.map((s) => ({ path: s.url, lastmod: new Date(newest(s.posts)) })),
    ...getTopics(posts).map((t) => ({ path: `/topics/${t.slug}/`, lastmod: new Date(newest(t.posts)) })),
    ...posts.map((p) => ({ path: p.url, lastmod: p.data.updated ?? p.data.date })),
  ];
  const body = entries
    .map((e) => `  <url><loc>${new URL(e.path, context.site).href}</loc>${e.lastmod ? `<lastmod>${day(e.lastmod)}</lastmod>` : ''}</url>`)
    .join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`, {
    headers: { 'content-type': 'application/xml' },
  });
}
