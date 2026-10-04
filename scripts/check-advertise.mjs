// Exercises the Advertise page's builder in a real browser: sizes, prices in each currency, image checks, preview, and the request text.
import { chromium } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { serve, chromePath } from './serve.mjs';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ad-check-'));
const { base, close } = await serve();
const b = await chromium.launch({ executablePath: chromePath() });
const ctx = await b.newContext({ viewport: { width: 1280, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] });
const p = await ctx.newPage();
const fails = []; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails.push(m); };
const viol = [];
p.on('console', (m) => { if (/content security|refused to/i.test(m.text())) viol.push(m.text().slice(0, 150)); });
p.on('pageerror', (e) => viol.push('pageerror ' + e.message));

// make test images in the browser
async function png(w, h, pad = 0) {
  return p.evaluate(({ w, h, pad }) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = '#b6f0d3'; x.fillRect(0, 0, w, h); x.fillStyle = '#1c1c1c'; x.font = '28px sans-serif'; x.fillText('Acme banner', 20, h / 2); if (pad) { const img = x.getImageData(0, 0, w, h); for (let i = 0; i < img.data.length; i += 4) { img.data[i] = Math.random() * 255; img.data[i + 1] = Math.random() * 255; img.data[i + 2] = Math.random() * 255; } x.putImageData(img, 0, 0); } return c.toDataURL('image/png').split(',')[1]; }, { w, h, pad });
}
await p.goto(base + '/advertise/', { waitUntil: 'networkidle' });
for (const [n, d] of [['good', [720, 90, 0]], ['wrong', [700, 90, 0]], ['big', [720, 90, 1]], ['double', [1440, 400, 0]]]) fs.writeFileSync(`${tmp}/${n}.png`, Buffer.from(await png(...d), 'base64'));

// specimens
for (const [slot, w, h] of [['inline', 720, 90], ['end', 720, 200], ['rail', 300, 250]]) {
  const bb = await p.locator(`.adv-specbox-${slot} .sponsor-text`).boundingBox();
  ok(Math.abs(bb.height - h) <= 1 && bb.width <= w + 1, `specimen ${slot} is ${Math.round(bb.width)}x${Math.round(bb.height)} (expect height ${h}, width up to ${w})`);
}
// currency + tier + term
await p.selectOption('select', 'USD');
ok(await p.getByText('$55').first().isVisible(), 'USD prices show ($55 for Standard)');
await p.getByLabel(/Premier/).check().catch(async () => { await p.locator('label.adv-tier', { hasText: 'Premier' }).click(); });
await p.locator('label.adv-chip', { hasText: '90 days' }).click();
ok(await p.getByText('$216').first().isVisible(), 'Premier, 90 days in USD totals $216');
// preview matches production
await p.locator('label.adv-tier', { hasText: 'Standard' }).click();
const pv = await p.locator('.adv-stage .sponsor-text').boundingBox();
ok(Math.abs(pv.height - 90) <= 1 && pv.width <= 721, `builder preview inline is ${Math.round(pv.width)}x${Math.round(pv.height)}`);
await p.getByLabel(/Headline/).fill('Ship faster with Acme');
ok(await p.locator('.adv-stage .sponsor-head').innerText() === 'Ship faster with Acme', 'preview follows the headline');
// validation
await p.getByRole('button', { name: /Open my email app/ }).click();
ok(await p.locator('.adv-errors').isVisible(), 'empty form shows problems');
// image mode
await p.getByRole('tab', { name: /own image/ }).click();
await p.setInputFiles('input[type=file]', `${tmp}/wrong.png`);
await p.waitForTimeout(400);
ok((await p.locator('.adv-checks').innerText()).includes('700 x 90'), 'wrong-size image is rejected with the sizes');
await p.setInputFiles('input[type=file]', `${tmp}/big.png`);
await p.waitForTimeout(400);
ok(/KB/.test(await p.locator('.adv-checks').innerText()), 'oversized file is rejected');
await p.setInputFiles('input[type=file]', `${tmp}/good.png`);
await p.waitForTimeout(500);
ok((await p.locator('.adv-checks li').first().innerText()).includes('Ready'), 'correct 720x90 image passes for Inline');
ok(await p.locator('.adv-stage img').isVisible(), 'image preview is shown');
await p.getByLabel('Preview which placement').getByText('Article end').click();
await p.setInputFiles('input[type=file]', `${tmp}/double.png`);
await p.waitForTimeout(500);
ok((await p.locator('.adv-checks li').nth(1).innerText()).includes('Ready'), 'a 2x image passes for Article end');
// fill and copy
await p.getByLabel('Company or project').fill('Acme & Sons');
await p.getByLabel('Your name').fill('Ria');
await p.locator('input[type=url]').fill('https://acme.example');
await p.getByLabel(/Alt text/).fill('Acme banner: ship faster');
await p.getByRole('button', { name: 'Copy the request' }).click();
await p.waitForTimeout(300);
const clip = await p.evaluate(() => navigator.clipboard.readText());
ok(clip.includes('Standard') && clip.includes('90 days') && clip.includes('$') && clip.includes('Acme & Sons') && clip.includes('good.png'), 'copied request has tier, term, price, company and file names');
ok(viol.length === 0, 'no CSP violations or script errors ' + viol.join(' | '));
// Without JavaScript the page still offers a plain email link and the price list.
const plain = await (await b.newContext({ javaScriptEnabled: false })).newPage();
await plain.goto(base + '/advertise/');
ok(await plain.locator('a[href^="mailto:"]').count() > 0, 'without JavaScript there is a plain email link');
ok((await plain.locator('noscript').first().innerText()).length >= 0 && (await plain.content()).includes('Prices per 30 days in rupees'), 'without JavaScript the rupee price list is shown');
fs.rmSync(tmp, { recursive: true, force: true });
await b.close(); close();
if (fails.length) { console.error('\nFAILED:', fails.join('; ')); process.exit(1); }
