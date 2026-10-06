// Banner slots, and the pure rules for choosing which banner a page shows. Kept free of Astro imports so it is easy to test.

/** The three sizes we sell. Pixel sizes are fixed on purpose: a sponsor knows exactly what readers see. */
export const SLOTS = {
  inline: { w: 720, h: 90, mobile: { w: 320, h: 100 }, label: 'Inline', where: 'after the introduction, before the first section' },
  end: { w: 720, h: 200, mobile: { w: 320, h: 100 }, label: 'Article end', where: 'after the last paragraph, before the private message box' },
  rail: { w: 300, h: 250, mobile: undefined, label: 'Side rail', where: 'in the right column beside the article, on wide screens only' },
} as const;
export type Slot = keyof typeof SLOTS;
export const SLOT_KEYS = Object.keys(SLOTS) as Slot[];

export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'] as const;
export const MAX_IMAGE_BYTES = 100 * 1024;
export const LIMITS = { headline: 60, line: 90, cta: 24 } as const;

export type Sponsor = {
  id: string;
  name: string;
  /** Dev Universe's own banners. Everything else is a paid, labelled sponsorship. */
  house: boolean;
  href: string;
  kind: 'image' | 'text';
  sizes: Slot[];
  image?: string;
  image2x?: string;
  mobileImage?: string;
  alt?: string;
  headline?: string;
  line?: string;
  cta?: string;
  tone?: 'mint' | 'lilac' | 'sky' | 'rose' | 'accent' | 'ink' | 'white';
  /** House banners only: the animation behind the banner. */
  motion?: 'aurora' | 'orbit' | 'pulse' | 'sweep' | 'grid';
  start?: string;
  end?: string;
  /** `all`, or post keys, series slugs or tags. */
  posts: 'all' | string[];
  exclude: string[];
  active: boolean;
};

export type PageInfo = { key: string; series?: string; tags: string[] };

/** Every banner, paid or our own, says Sponsored. */
export const labelFor = (_s: Pick<Sponsor, 'house'>) => 'Sponsored';

const day = (d: Date) => d.toISOString().slice(0, 10);

export function isLive(s: Sponsor, now = new Date()) {
  if (!s.active) return false;
  const today = day(now);
  return (!s.start || s.start <= today) && (!s.end || today <= s.end);
}

const targets = (s: Sponsor, page: PageInfo) => {
  const hit = (list: string[]) => list.includes(page.key) || (page.series ? list.includes(page.series) : false) || page.tags.some((t) => list.includes(t));
  if (hit(s.exclude)) return false;
  return s.posts === 'all' || hit(s.posts);
};

const hash = (text: string) => {
  let h = 0;
  for (const c of text) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
};

/**
 * The banner for a slot on a page. Paid bookings always come before our own banners, so an unsold slot is never empty.
 * The choice depends only on the page and the slot, so it does not change between builds.
 */
export function pickSponsor(all: Sponsor[], slot: Slot, page: PageInfo, now = new Date()): Sponsor | undefined {
  const fits = all.filter((s) => isLive(s, now) && s.sizes.includes(slot) && targets(s, page));
  const paid = fits.filter((s) => !s.house);
  const pool = (paid.length ? paid : fits).sort((a, b) => a.id.localeCompare(b.id));
  return pool.length ? pool[hash(`${page.key}:${slot}`) % pool.length] : undefined;
}

/**
 * Our own banners that can run on this page and slot, in a fixed order (they rotate on the page). Empty when a paid booking
 * has the slot: paid banners are never rotated or animated, and are never mixed with ours.
 */
export function houseFor(all: Sponsor[], slot: Slot, page: PageInfo, now = new Date()): Sponsor[] {
  const fits = all.filter((s) => isLive(s, now) && s.sizes.includes(slot) && targets(s, page));
  if (fits.some((s) => !s.house)) return [];
  return fits.filter((s) => s.house).sort((a, b) => a.id.localeCompare(b.id));
}
