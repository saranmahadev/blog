export const SITE = {
  title: 'Dev Maestro',
  description: 'Notes on engineering, systems and AI.',
  author: 'Dev',
} as const;

export const NAV = [
  { href: '/', label: 'Home' },
  { href: '/about/', label: 'About' },
] as const;

export const formatDate = (d: Date) =>
  d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });

export const readingTime = (text: string) =>
  Math.max(1, Math.round(text.trim().split(/\s+/).length / 220));

const TONES = ['peach', 'sage', 'sky', 'lilac', 'butter'] as const;
/** Stable pastel tone for a label, so a tag/series keeps its colour everywhere. */
export const toneFor = (label: string) => {
  let h = 0;
  for (const c of label) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
};
