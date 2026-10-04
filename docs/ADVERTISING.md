# Advertising

[README](../README.md) · [Writing](WRITING.md) · [Architecture](ARCHITECTURE.md) · [Deploy](DEPLOY.md) · [Security](SECURITY.md) · [Advertising](ADVERTISING.md)

Sponsored banners, the Advertise page and how to add or retire a banner.

## Advertising

Banners are the only ad format. They come in three fixed sizes, are hosted on this site, carry no tracking and never load anything from another site.

| Slot | Size | Where |
|---|---|---|
| Inline | 720 x 90 | after the introduction of an `.mdx` post |
| End | 720 x 200 | after the last paragraph, before the message box |
| Rail | 300 x 250 | right column, wide screens only |

- **Data, not code.** Each banner is a file in `src/content/sponsors/` (shape in `example.json`; images in `public/sponsors/`). Paid sponsors take priority; our own Dev Universe banners fill every slot that is not booked. Every banner, ours or paid, says *Sponsored* and uses `rel="sponsored"`. A post can opt out with `sponsors: false`.
- **Prices** (tiers, currencies, terms) are in `src/lib/ad-prices.ts`. The Advertise page, its builder and the booking email all read that one file. There are no permanent slots: the longest term is 90 days.
- **Advertise page** (`/advertise/`): specimens, rules, prices with a currency selector, and a builder that previews an Imaxt text banner or the visitor's own image and writes a `mailto:` request. Nothing is uploaded or stored; there is no database.
- **Checks**: `pnpm check:sponsors` (sizes, labels, links, file budget) and `pnpm check:advertise` (the builder in a real browser). Both run in CI.
