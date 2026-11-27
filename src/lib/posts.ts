import type { CollectionEntry } from 'astro:content';

type Post = CollectionEntry<'posts'>;

export const formatDate = (date: Date, month: 'short' | 'long' = 'short') =>
  date.toLocaleDateString('en', { day: 'numeric', month, year: 'numeric' });

export const readingTime = (body = '') => {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
};

const hash = (value: string) =>
  [...value].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);

const TONES = 6;
const PATTERNS = 4;

/** Series (or first tag) decides the colour so related posts read as a family; the id decides the pattern. */
export const toneFor = (key: string) => `tone-${hash(key) % TONES}`;

export const coverFor = (post: Post) => ({
  tone: toneFor(post.data.series?.id ?? post.data.tags[0] ?? post.id),
  pattern: `pat-${hash(post.id) % PATTERNS}`,
});

export const labelFor = (post: Post, seriesTitle?: string) =>
  seriesTitle ?? post.data.tags[0] ?? 'Post';
