// The price list for the Advertise page. Edit the numbers here and nothing else: the page, the builder and the email all read this file.
// These are fixed price lists, not live exchange rates. Banners are booked per term, never permanently.
import type { Slot } from './sponsors';

export const CURRENCIES = {
  INR: { symbol: '₹', locale: 'en-IN', name: 'Indian rupee' },
  USD: { symbol: '$', locale: 'en-US', name: 'US dollar' },
  EUR: { symbol: '€', locale: 'en-IE', name: 'Euro' },
  GBP: { symbol: '£', locale: 'en-GB', name: 'British pound' },
} as const;
export type Currency = keyof typeof CURRENCIES;
export const CURRENCY_KEYS = Object.keys(CURRENCIES) as Currency[];

export type TierId = 'starter' | 'standard' | 'premier';

export const TIERS: Record<TierId, { name: string; slots: Slot[]; choose?: boolean; blurb: string; per30: Record<Currency, number> }> = {
  starter: { name: 'Starter', slots: ['inline', 'rail'], choose: true, blurb: 'One slot of your choice: inline or side rail.', per30: { INR: 2000, USD: 25, EUR: 23, GBP: 20 } },
  standard: { name: 'Standard', slots: ['inline', 'end'], blurb: 'Inline and article-end banners together.', per30: { INR: 4500, USD: 55, EUR: 50, GBP: 44 } },
  premier: { name: 'Premier', slots: ['inline', 'end', 'rail'], blurb: 'All three placements.', per30: { INR: 6500, USD: 80, EUR: 73, GBP: 64 } },
};
export const TIER_IDS = Object.keys(TIERS) as TierId[];

/** Longer terms get a small discount. There is no permanent term: the longest is 90 days. */
export const TERMS = [
  { days: 30, discount: 0 },
  { days: 60, discount: 0.05 },
  { days: 90, discount: 0.1 },
] as const;
export type TermDays = (typeof TERMS)[number]['days'];

export const priceFor = (tier: TierId, currency: Currency, days: TermDays) => {
  const term = TERMS.find((t) => t.days === days)!;
  return Math.round(TIERS[tier].per30[currency] * (days / 30) * (1 - term.discount));
};

export const money = (amount: number, currency: Currency) =>
  new Intl.NumberFormat(CURRENCIES[currency].locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
