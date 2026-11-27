import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';

/**
 * Satori renders outside the browser, so it cannot read CSS variables.
 * These mirror the cover tones in src/styles/tokens.css (documented exception to "no raw hex");
 * keep the two in sync. Order matches `tone-0` .. `tone-5`.
 */
const TONES = [
  { bg: '#D97835', fg: '#281710' }, // Ember: orange-600 / chocolate-900
  { bg: '#75432D', fg: '#F5EFE5' }, // Cocoa: chocolate-600 / milk-300
  { bg: '#DCCBB7', fg: '#281710' }, // Almond: milk-500 / chocolate-900
  { bg: '#402419', fg: '#FFC494' }, // Chocolate: chocolate-800 / orange-300
  { bg: '#FFC494', fg: '#281710' }, // Apricot: orange-300 / chocolate-900
  { bg: '#B88F77', fg: '#180D09' }, // Clay: chocolate-400 / chocolate-1000
];

// Resolved from the project root: import.meta.url points into the bundled output during `astro build`.
const fontFile = (weight: number) =>
  readFile(join(process.cwd(), 'node_modules/@fontsource/inter/files', `inter-latin-${weight}-normal.woff`));

let fonts: Promise<{ name: string; data: Buffer; weight: 600 | 800; style: 'normal' }[]> | undefined;
const loadFonts = () =>
  (fonts ??= Promise.all([fontFile(600), fontFile(800)]).then(([semi, heavy]) => [
    { name: 'Inter', data: semi, weight: 600 as const, style: 'normal' as const },
    { name: 'Inter', data: heavy, weight: 800 as const, style: 'normal' as const },
  ]));

interface Card {
  title: string;
  label: string;
  /** `tone-N` class name from coverFor / toneFor. */
  tone: string;
  word?: string | null;
}

const h = (type: string, style: Record<string, unknown>, children?: unknown) => ({
  type,
  props: { style: { display: 'flex', ...style }, children },
});

export const renderCard = async ({ title, label, tone, word }: Card) => {
  const palette = TONES[Number(tone.replace('tone-', ''))] ?? TONES[0];
  const size = title.length < 40 ? 92 : title.length < 70 ? 74 : 60;

  const tree = h('div', {
    position: 'relative',
    boxSizing: 'border-box',
    flexDirection: 'column',
    justifyContent: 'space-between',
    width: '100%',
    height: '100%',
    padding: 72,
    background: palette.bg,
    color: palette.fg,
    fontFamily: 'Inter',
    overflow: 'hidden',
  }, [
    // Decorative disc, echoing the cover pattern on the site.
    h('div', {
      position: 'absolute',
      top: -220,
      right: -180,
      width: 640,
      height: 640,
      borderRadius: 640,
      background: palette.fg,
      opacity: 0.12,
    }),
    word
      ? h('div', {
          position: 'absolute',
          right: 40,
          bottom: -50,
          fontSize: Math.min(320, Math.floor(1000 / (word.length * 0.62))),
          fontWeight: 800,
          letterSpacing: -8,
          lineHeight: 1,
          opacity: 0.11,
        }, word)
      : h('div', { display: 'none' }),
    h('div', {
      alignSelf: 'flex-start',
      padding: '8px 18px',
      borderRadius: 8,
      background: palette.fg,
      color: palette.bg,
      fontSize: 26,
      fontWeight: 800,
      letterSpacing: 2,
      textTransform: 'uppercase',
    }, label),
    h('div', {
      maxWidth: 980,
      fontSize: size,
      fontWeight: 800,
      lineHeight: 1,
      letterSpacing: -3,
    }, title),
    h('div', { fontSize: 30, fontWeight: 600 }, 'Drafted · Saran Mahadev'),
  ]);

  const svg = await satori(tree as never, { width: 1200, height: 630, fonts: await loadFonts() });
  return new Resvg(svg).render().asPng();
};
