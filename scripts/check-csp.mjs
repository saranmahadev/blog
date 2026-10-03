// Loads key pages in a real browser and fails on any Content-Security-Policy violation or script error, so a change that
// adds an unhashed inline script or a blocked request is caught before deploy.
import { chromium } from 'playwright';
import { serve, chromePath } from './serve.mjs';

const PAGES = ['/', '/archive/', '/topics/drafted/', '/welcome-to-drafted/', '/building-drafted/', '/building-drafted/rss-is-enough/', '/building-dev-universe/dev-universe/', '/imaxt/', '/about/', '/login/', '/register/', '/reset/', '/profile/', '/inbox/', '/404.html'];
const { base, close } = await serve();
const browser = await chromium.launch({ executablePath: chromePath() });
const page = await browser.newPage();
const problems = [];
let current = '';
page.on('console', (m) => { if (/content security policy|refused to/i.test(m.text())) problems.push(`${current}: ${m.text().slice(0, 200)}`); });
page.on('pageerror', (e) => problems.push(`${current}: script error: ${e.message.slice(0, 200)}`));

for (const url of PAGES) {
  current = url;
  await page.goto(base + url, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); // wakes lazy islands
  await page.waitForTimeout(300);
  if (url === '/') { // search: Pagefind needs WebAssembly
    await page.click('button.srch');
    await page.fill('#site-search', 'sync');
    await page.waitForSelector('.sres', { timeout: 5000 }).catch(() => problems.push('/: search returned no results'));
  }
  if (url === '/imaxt/') { // a hydrated island
    await page.waitForSelector('.imx-typelab button', { timeout: 4000 }).catch(() => problems.push(`${url}: the type lab did not load`));
    await page.click('.imx-tl-fam button:nth-child(1)').catch(() => {});
  }
}
await browser.close();
close();
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log(`csp: ${PAGES.length} pages load with no policy violations`);
