export const SITE = {
  title: 'Drafted',
  byline: 'By Dev',
  description: 'Notes on engineering, systems and AI.',
  author: 'Dev',
} as const;

/**
 * The author is whoever signs in with this address once it is verified (Firebase only marks an address verified after
 * the mailbox owner opens the link). The same address is in firestore.rules and functions/src/index.ts, so there is
 * no role to set up and nothing to run in a console.
 */
/** The author's own website, used as the author's url in structured data. */
export const AUTHOR_URL = 'https://www.saranmahadev.in';
export const AUTHOR_EMAIL = 'mail@saranmahadev.in';

/** The public repository: the source of every article is here, and it is where AI agents are pointed to read the content. */
export const REPO = { url: 'https://github.com/saranmahadev/blog', branch: 'main' } as const;

export const NAV = [
  { href: '/', label: 'Home' },
  { href: '/series/', label: 'Series' },
  { href: '/topics/', label: 'Topics' },
  { href: '/archive/', label: 'Archive' },
  { href: '/about/', label: 'About' },
] as const;

const TONES = ['mint', 'lilac', 'sky', 'rose'] as const;
const PATTERNS = ['dots', 'rings', 'grid', 'stripes', 'check'] as const;
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
