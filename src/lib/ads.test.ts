import { describe, expect, it } from 'vitest';
import { CURRENCY_KEYS, TERMS, TIER_IDS, priceFor } from './ad-prices';
import { buildRequest, slotsOf, type Request } from './mailto';
import { pickSponsor, labelFor, isLive, type Sponsor } from './sponsors';

const s = (over: Partial<Sponsor>): Sponsor => ({ id: 'a', name: 'A', house: false, href: 'https://example.com', kind: 'text', sizes: ['inline'], posts: 'all', exclude: [], active: true, ...over });
const page = { key: 'curious-to-coder/symptoms', series: 'dev-universe', tags: ['Web'] };

describe('prices', () => {
  it('has every tier in every currency, and longer terms cost a little less per day', () => {
    for (const t of TIER_IDS) for (const c of CURRENCY_KEYS) {
      const p30 = priceFor(t, c, 30), p90 = priceFor(t, c, 90);
      expect(p30).toBeGreaterThan(0);
      expect(p90).toBeLessThan(p30 * 3);
    }
    expect(TERMS.map((t) => t.days)).toEqual([30, 60, 90]); // nothing longer: no permanent slots
  });
  it('applies the discount to the whole term', () => {
    expect(priceFor('standard', 'INR', 60)).toBe(Math.round(4500 * 2 * 0.95));
    expect(priceFor('premier', 'USD', 90)).toBe(Math.round(80 * 3 * 0.9));
  });
});

describe('choosing a banner', () => {
  it('shows nothing when nothing fits', () => expect(pickSponsor([], 'inline', page)).toBeUndefined());
  it('ignores inactive, expired and not-yet-started banners', () => {
    const now = new Date('2026-10-10');
    expect(isLive(s({ active: false }), now)).toBe(false);
    expect(isLive(s({ end: '2026-10-09' }), now)).toBe(false);
    expect(isLive(s({ start: '2026-10-11' }), now)).toBe(false);
    expect(isLive(s({ start: '2026-10-01', end: '2026-10-31' }), now)).toBe(true);
  });
  it('prefers a paid sponsor over our own banners, and our own fill the rest', () => {
    const house = s({ id: 'h', house: true });
    const paid = s({ id: 'p' });
    expect(pickSponsor([house, paid], 'inline', page)?.id).toBe('p');
    expect(pickSponsor([house, paid], 'rail', page)).toBeUndefined();
    expect(pickSponsor([house], 'inline', page)?.id).toBe('h');
  });
  it('respects targeting and exclusions', () => {
    expect(pickSponsor([s({ posts: ['dev-universe'] })], 'inline', page)).toBeDefined();
    expect(pickSponsor([s({ posts: ['other'] })], 'inline', page)).toBeUndefined();
    expect(pickSponsor([s({ posts: ['Web'] })], 'inline', page)).toBeDefined();
    expect(pickSponsor([s({ exclude: [page.key] })], 'inline', page)).toBeUndefined();
  });
  it('is stable: the same page and slot always get the same banner', () => {
    const list = [s({ id: 'a', house: true }), s({ id: 'b', house: true }), s({ id: 'c', house: true })];
    expect(pickSponsor(list, 'inline', page)?.id).toBe(pickSponsor([...list].reverse(), 'inline', page)?.id);
  });
  it('labels our banners honestly', () => {
    expect(labelFor({ house: true })).toBe('Sponsored');
    expect(labelFor({ house: false })).toBe('Sponsored');
  });
});

const req: Request = { company: 'Acme & Sons', contact: 'Ria', link: 'https://acme.example', tier: 'standard', days: 60, currency: 'USD', start: '2026-11-01', kind: 'text', headline: 'Ship faster', line: 'Tooling for teams', cta: 'Try it', tone: 'mint', notes: '' };
describe('booking email', () => {
  it('names the tier, term, slots and a price in the chosen currency', () => {
    const { subject, body, total } = buildRequest(req);
    expect(subject).toContain('Standard');
    expect(body).toContain('Inline (720 x 90), Article end (720 x 200)');
    expect(body).toContain('60 days');
    expect(body).toContain('$105');
    expect(total).toBe(105);
  });
  it('encodes the message so it survives a mailto link', () => {
    const { href } = buildRequest(req);
    expect(href.startsWith('mailto:')).toBe(true);
    expect(href).toContain('Acme%20%26%20Sons');
    expect(href).not.toContain(' ');
    expect(decodeURIComponent(href.split('body=')[1])).toContain('Ship faster');
  });
  it('asks for the image to be attached when the sponsor brings their own', () => {
    expect(buildRequest({ ...req, kind: 'image', images: { inline: 'banner.png', end: 'big.png' }, alt: 'Acme logo' }).body).toContain('Inline (720 x 90): banner.png');
  });
  it('a starter booking has exactly one slot', () => {
    expect(slotsOf({ tier: 'starter', slot: 'rail' })).toEqual(['rail']);
    expect(slotsOf({ tier: 'premier' })).toEqual(['inline', 'end', 'rail']);
  });
});
