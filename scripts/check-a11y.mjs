// axe-core scan of key pages in light and dark; fails on serious or critical violations.
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { serve, chromePath } from './serve.mjs';

const PAGES = ['/', '/archive/', '/topics/', '/topics/drafted/', '/series/', '/welcome-to-drafted/', '/building-drafted/', '/building-drafted/why-drafted-has-no-images/', '/building-drafted/locking-it-down-before-writing/', '/building-dev-universe/dev-universe/', '/curious-to-coder/the-software-you-stopped-noticing/', '/curious-to-coder/symptoms-that-you-should-pursue-coding/', '/building-drafted/light-dark-and-readable/', '/imaxt/', '/about/', '/login/', '/register/', '/reset/', '/inbox/', '/404.html'];
const { base, close } = await serve();
const browser = await chromium.launch({ executablePath: chromePath() });
let failures = 0;
for (const theme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  await ctx.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch {} }, theme);
  const page = await ctx.newPage();
  for (const url of PAGES) {
    await page.goto(base + url, { waitUntil: 'networkidle' });
    // Measure settled colours, not mid-transition ones.
    // A constructed stylesheet, because the page's Content-Security-Policy refuses an injected <style>.
    await page.evaluate(() => { const s = new CSSStyleSheet(); s.replaceSync('*, *::before, *::after { transition: none !important; animation: none !important; }'); document.adoptedStyleSheets = [...document.adoptedStyleSheets, s]; });
    // Also scan the search dialog once per theme.
    const runs = [{ label: url, setup: async () => {} }];
    if (url === '/') runs.push({ label: '/ (search open)', setup: async () => { await page.click('button.srch'); await page.fill('#site-search', 'sync'); await page.waitForSelector('.sres'); } });
    for (const r of runs) {
      await r.setup();
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      if (serious.length) {
        failures += serious.length;
        console.error(`[${theme}] ${r.label}`);
        for (const v of serious) console.error(`  ${v.impact} ${v.id}: ${v.help}\n    ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join('\n    ')}`);
      }
    }
  }
  await ctx.close();
}
await browser.close();
close();
if (failures) { console.error(`\n${failures} serious/critical accessibility violation(s)`); process.exit(1); }
console.log(`a11y: ${PAGES.length} pages x 2 themes, no serious or critical violations`);
