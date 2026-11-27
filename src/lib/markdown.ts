import { getEntry } from 'astro:content';
import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';
import { getSeriesPosts, type Post } from './content';
import { SITE } from './site';

const md = new MarkdownIt({ html: false, linkify: true, typographer: false });

export const postPath = (post: Post) => `/posts/${post.id}/`;
export const postMarkdownPath = (post: Post) => `/posts/${post.id}.md`;

const yaml = (value: string) => JSON.stringify(value);

/** One post as a self-contained Markdown document: front matter for machines, then the text. */
export const postMarkdown = async (post: Post, origin: string) => {
  const series = post.data.series ? await getEntry(post.data.series) : undefined;
  const parts = series ? await getSeriesPosts(series.id) : [];
  const part = parts.findIndex((entry) => entry.id === post.id) + 1;

  const meta = [
    `title: ${yaml(post.data.title)}`,
    `description: ${yaml(post.data.description)}`,
    `url: ${origin}${postPath(post)}`,
    `author: ${yaml(SITE.author.name)}`,
    `author_url: ${SITE.author.url}`,
    `published: ${post.data.publishedAt.toISOString().slice(0, 10)}`,
    ...(series ? [`series: ${yaml(series.data.title)}`, `series_url: ${origin}/series/${series.id}/`, `series_part: ${part} of ${parts.length}`] : []),
    ...(post.data.tags.length ? [`tags: [${post.data.tags.map(yaml).join(', ')}]`] : []),
    `site: ${yaml(SITE.name)}`,
    `rights: "© ${post.data.publishedAt.getFullYear()} ${SITE.author.name}. All rights reserved."`,
  ];

  return `---\n${meta.join('\n')}\n---\n\n# ${post.data.title}\n\n> ${post.data.description}\n\n${(post.body ?? '').trim()}\n`;
};

/** Post body as sanitised HTML with absolute links, for feeds. */
export const postHtml = (post: Post, origin: string) =>
  sanitizeHtml(md.render(post.body ?? ''), {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'h1', 'h2', 'h3', 'h4', 'figure', 'figcaption'],
  }).replaceAll('href="/', `href="${origin}/`);
