export const SITE = {
  title: 'Drafted',
  byline: 'By Dev',
  description: 'Notes on engineering, systems and AI.',
  author: 'Dev',
} as const;

export const NAV = [
  { href: '/', label: 'Home' },
  { href: '/series/', label: 'Series' },
  { href: '/about/', label: 'About' },
] as const;

export const TONES = ['mint', 'lilac', 'sky', 'rose'] as const;
export const PATTERNS = ['dots', 'rings', 'grid', 'stripes', 'check'] as const;
export type Tone = (typeof TONES)[number];
export type Pattern = (typeof PATTERNS)[number];

const hash = (s: string) => {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
};

/** Stable tone/pattern for a slug, used when a series does not set its own. */
export const toneFor = (slug: string): Tone => TONES[hash(slug) % TONES.length];
export const patternFor = (slug: string): Pattern => PATTERNS[hash(slug + 'p') % PATTERNS.length];

export const formatDate = (d: Date, opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }) =>
  d.toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' });

export const formatShort = (d: Date) => formatDate(d, { month: 'short', day: 'numeric' });

export const readingTime = (text: string) => Math.max(1, Math.round(text.trim().split(/\s+/).length / 220));
