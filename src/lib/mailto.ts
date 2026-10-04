// Builds the booking email. Nothing is sent or stored by the site: the visitor's own mail app opens with the message ready.
import { AUTHOR_EMAIL } from './site';
import { CURRENCIES, TIERS, TERMS, money, priceFor, type Currency, type TermDays, type TierId } from './ad-prices';
import { SLOTS, type Slot } from './sponsors';

export type Request = {
  company: string;
  contact: string;
  link: string;
  tier: TierId;
  /** For the Starter tier, which single slot. */
  slot?: Slot;
  days: TermDays;
  currency: Currency;
  start: string;
  kind: 'text' | 'image';
  headline: string;
  line: string;
  cta: string;
  tone: string;
  /** File name chosen for each slot, when the sponsor brings their own images. */
  images?: Partial<Record<Slot, string>>;
  alt?: string;
  notes: string;
};

export const slotsOf = (r: Pick<Request, 'tier' | 'slot'>): Slot[] =>
  TIERS[r.tier].choose ? [r.slot ?? TIERS[r.tier].slots[0]] : TIERS[r.tier].slots;

export function buildRequest(r: Request) {
  const slots = slotsOf(r);
  const total = priceFor(r.tier, r.currency, r.days);
  const discount = TERMS.find((t) => t.days === r.days)!.discount;
  const lines = [
    `Hello, I would like to book a banner on Drafted.`,
    ``,
    `COMPANY: ${r.company}`,
    `CONTACT: ${r.contact}`,
    `LINK: ${r.link}`,
    ``,
    `TIER: ${TIERS[r.tier].name}`,
    `PLACEMENTS: ${slots.map((s) => `${SLOTS[s].label} (${SLOTS[s].w} x ${SLOTS[s].h})`).join(', ')}`,
    `TERM: ${r.days} days${discount ? ` (${Math.round(discount * 100)}% longer-term discount)` : ''}`,
    `PREFERRED START: ${r.start || 'as soon as possible'}`,
    `QUOTED PRICE: ${money(total, r.currency)} (${CURRENCIES[r.currency].name}, paid in advance; booked for ${r.days} days only, no permanent slots)`,
    ``,
    r.kind === 'text'
      ? [`BANNER: built with the Imaxt text banner`, `HEADLINE: ${r.headline}`, `LINE: ${r.line}`, `BUTTON: ${r.cta}`, `TONE: ${r.tone}`].join('\n')
      : [`BANNER: my own image files, which I will attach to this email`, ...slots.map((s) => `  ${SLOTS[s].label} (${SLOTS[s].w} x ${SLOTS[s].h}): ${r.images?.[s] || 'file name'}`), `ALT TEXT: ${r.alt ?? ''}`].join('\n'),
    ``,
    `NOTES: ${r.notes || 'none'}`,
    ``,
    `I have read the rules on the Advertise page.`,
  ];
  const subject = `Banner request: ${r.company || 'new sponsor'} (${TIERS[r.tier].name}, ${r.days} days)`;
  const body = lines.join('\n');
  const href = `mailto:${AUTHOR_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return { subject, body, href, total };
}
