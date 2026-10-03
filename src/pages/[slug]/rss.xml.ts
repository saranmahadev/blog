import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getContent } from '@/lib/content';
import { SITE } from '@/lib/site';

export async function getStaticPaths() {
  const { series } = await getContent();
  return series.map((s) => ({ params: { slug: s.slug }, props: { series: s } }));
}

export async function GET(context: APIContext) {
  const { series } = context.props as Awaited<ReturnType<typeof getStaticPaths>>[number]['props'];
  return rss({
    title: `${series.entry.data.title} · ${SITE.title}`,
    description: series.entry.data.description,
    site: context.site!,
    items: [...series.posts].reverse().map((p) => ({ title: p.data.title, description: p.data.description, pubDate: p.data.date, link: p.url, categories: p.data.tags })),
  });
}
