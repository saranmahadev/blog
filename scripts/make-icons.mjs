/**
 * Generates the favicon set from the brand mark (a tilted Burnt Orange square with a Dark Chocolate
 * outline). Run with `npm run icons` after changing the mark; outputs are committed to public/.
 */
import { writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const ORANGE = '#D97835';
const CHOCOLATE = '#281710';
const MILK = '#F5EFE5';

const mark = (stroke, background = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  ${background}
  <rect x="14" y="14" width="36" height="36" rx="10" transform="rotate(12 32 32)" fill="${ORANGE}" stroke="${stroke}" stroke-width="5"/>
</svg>`;

const png = (svg, size) => new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
const milkTile = (size) => png(mark(CHOCOLATE, `<rect width="64" height="64" fill="${MILK}"/>`), size);

// Scalable favicon: the outline flips to Milk on dark browser chrome.
writeFileSync(
  'public/favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <style>.o{stroke:${CHOCOLATE}}@media (prefers-color-scheme:dark){.o{stroke:${MILK}}}</style>
  <rect class="o" x="14" y="14" width="36" height="36" rx="10" transform="rotate(12 32 32)" fill="${ORANGE}" stroke-width="5"/>
</svg>
`,
);

writeFileSync('public/apple-touch-icon.png', milkTile(180));
writeFileSync('public/icon-192.png', milkTile(192));
writeFileSync('public/icon-512.png', milkTile(512));

// favicon.ico: a single 32x32 PNG wrapped in an ICO container.
const ico32 = png(mark(CHOCOLATE), 32);
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(1, 4); // image count
header.writeUInt8(32, 6); // width
header.writeUInt8(32, 7); // height
header.writeUInt16LE(1, 10); // colour planes
header.writeUInt16LE(32, 12); // bits per pixel
header.writeUInt32LE(ico32.length, 14); // image size
header.writeUInt32LE(22, 18); // image offset
writeFileSync('public/favicon.ico', Buffer.concat([header, ico32]));

console.log('wrote favicon.svg, favicon.ico, apple-touch-icon.png, icon-192.png, icon-512.png');
