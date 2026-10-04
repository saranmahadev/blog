// Reads the sponsors collection at build time and picks the banner for a page and slot.
import { getCollection } from 'astro:content';
import { houseFor, pickSponsor, type PageInfo, type Slot, type Sponsor } from './sponsors';

export async function allSponsors(): Promise<Sponsor[]> {
  const entries = await getCollection('sponsors');
  return entries.map((e) => ({ id: e.id, ...e.data })) as Sponsor[];
}

export async function sponsorFor(slot: Slot, page: PageInfo) {
  return pickSponsor(await allSponsors(), slot, page);
}

/** Our own banners for a slot, when no paid booking has it. They rotate on the page. */
export async function houseBannersFor(slot: Slot, page: PageInfo) {
  return houseFor(await allSponsors(), slot, page);
}
