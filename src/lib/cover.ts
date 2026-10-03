export type ImageCover = { image: string; alt: string };
export type ImaxtCoverData = { kind: 'word' | 'stat' | 'quote' | 'stack'; text: string; sub?: string };
export type Cover = ImageCover | ImaxtCoverData;

export const isImageCover = (c: Cover | undefined): c is ImageCover => !!c && 'image' in c;
export const isImaxtCover = (c: Cover | undefined): c is ImaxtCoverData => !!c && 'kind' in c;

/** Break a phrase into at most `max` balanced lines (greedy, by character count). */
export function splitLines(text: string, max = 3): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= max) return words;
  const target = text.trim().length / max;
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur && (cur + ' ' + w).length > target && lines.length < max - 1) {
      lines.push(cur);
      cur = w;
    } else {
      cur = cur ? cur + ' ' + w : w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Shorten a title into a cover phrase when a post does not set its own. */
export function coverPhrase(title: string, maxWords = 5): string {
  const words = title.replace(/^(part \d+:\s*)/i, '').split(/\s+/).filter(Boolean);
  return words.slice(0, maxWords).join(' ');
}
