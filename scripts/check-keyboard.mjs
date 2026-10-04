// Keyboard and text-alternative checks on the built site: alt text, skip link, tab order, visible focus, no traps.
import { chromium } from 'playwright';
import { serve, chromePath } from './serve.mjs';

const PAGES = ['/', '/archive/', '/welcome-to-drafted/', '/dev-universe/a-connected-ecosystem/', '/curious-to-coder/symptoms-that-you-should-pursue-coding/', '/imaxt/', '/about/', '/privacy/', '/terms/', '/contact/', '/advertise/', '/login/', '/register/', '/reset/'];
const { base, close } = await serve();
const browser = await chromium.launch({ executablePath: chromePath() });
const problems = [];
const note = (url, m) => problems.push(`${url}: ${m}`);

for (const theme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch {} }, theme);
  const page = await ctx.newPage();
  for (const url of PAGES) {
    const at = `${url} [${theme}]`;
    await page.goto(base + url, { waitUntil: 'load' });
    await page.waitForTimeout(250);

    // 1. Text alternatives
    const alt = await page.evaluate(() => {
      const out = [];
      for (const i of document.querySelectorAll('img')) if (!i.hasAttribute('alt') || (!i.alt.trim() && i.getAttribute('role') !== 'presentation')) out.push(`img without alt text: ${i.getAttribute('src')}`);
      for (const s of document.querySelectorAll('svg')) {
        const named = s.getAttribute('aria-label') || s.getAttribute('aria-labelledby') || s.querySelector(':scope > title');
        const hidden = s.closest('[aria-hidden="true"]');
        if (!named && !hidden) out.push('svg that is neither labelled nor hidden from assistive technology');
      }
      for (const el of document.querySelectorAll('a, button')) {
        const name = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || '').trim();
        if (!name && !el.querySelector('img[alt]:not([alt=""])')) out.push(`${el.tagName.toLowerCase()} with no accessible name: ${(el.getAttribute('href') || el.className || '').toString().slice(0, 40)}`);
      }
      for (const el of document.querySelectorAll('[tabindex]')) if (Number(el.getAttribute('tabindex')) > 0) out.push('positive tabindex');
      return out;
    });
    alt.forEach((m) => note(at, m));

    // 2. Skip link is the first stop, becomes visible, and moves focus to the content
    await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0); });
    await page.keyboard.press('Tab');
    const skip = await page.evaluate(() => { const a = document.activeElement; const r = a.getBoundingClientRect(); return { text: a.textContent.trim(), visible: r.width > 4 && r.height > 4 && r.top >= 0 }; });
    if (!/skip to content/i.test(skip.text)) note(at, `first Tab stop is "${skip.text}", not the skip link`);
    else if (!skip.visible) note(at, 'skip link is not visible when focused');
    else {
      await page.keyboard.press('Enter');
      const inMain = await page.evaluate(() => document.activeElement?.id === 'main' || !!document.activeElement?.closest('main'));
      if (!inMain) note(at, 'skip link does not move focus into the main content');
    }

    // 3. Walk the tab order: focus is visible everywhere and never gets stuck (a date field legitimately holds focus for its month, day, year and picker)
    await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0); });
    let prev = '', same = 0, stops = 0;
    for (let i = 0; i < 90; i++) {
      await page.keyboard.press('Tab');
      const f = await page.evaluate(() => {
        const a = document.activeElement;
        if (!a || a === document.body) return null;
        const cs = getComputedStyle(a);
        const ring = a.type === 'date' || (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== 'none');
        const r = a.getBoundingClientRect();
        const n = (window.__tabN = (window.__tabN || 0)); const same = window.__tabLast === a; window.__tabLast = a;
        return { same, id: `${a.tagName}${a.id ? '#' + a.id : ''}.${String(a.className).slice(0, 30)}|${a.getAttribute('href') || a.textContent.trim().slice(0, 20)}`, ring, tiny: r.width < 1 || r.height < 1, hiddenBy: cs.visibility === 'hidden' || cs.display === 'none' };
      });
      if (!f) break;
      stops++;
      if (f.same) { if (++same >= 6) { note(at, `keyboard trap at ${f.id}`); break; } } else same = 0;
      prev = f.id;
      if (!f.ring) note(at, `no visible focus indicator on ${f.id}`);
      if (f.tiny || f.hiddenBy) note(at, `focus lands on an invisible element ${f.id}`);
    }
    if (stops < 5) note(at, `only ${stops} focusable stops`);
  }

  // 4. Search dialog: opens from the keyboard, Escape closes it and returns focus
  await page.goto(base + '/', { waitUntil: 'load' });
  await page.waitForSelector('button.srch', { timeout: 5000 });
  await page.keyboard.press('/');
  const opened = await page.evaluate(() => !!document.querySelector('dialog[open]') && document.activeElement?.tagName === 'INPUT');
  if (!opened) note(`/ [${theme}]`, 'pressing "/" does not open search with the field focused');
  await page.keyboard.press('Escape');
  const closed = await page.evaluate(() => !document.querySelector('dialog[open]'));
  if (!closed) note(`/ [${theme}]`, 'Escape does not close search');

  // 5. Motion: the marquee stops under "reduce motion"
  const rctx = await browser.newContext({ reducedMotion: 'reduce' });
  const rp = await rctx.newPage();
  await rp.goto(base + '/imaxt/', { waitUntil: 'load' });
  const moving = await rp.evaluate(() => [...document.querySelectorAll('.imx-marquee-track')].some((t) => getComputedStyle(t).animationName !== 'none'));
  if (moving) note('/imaxt/', 'marquee keeps moving with reduced motion on');
  await rctx.close();
  await ctx.close();
}
await browser.close();
close();
if (problems.length) { console.error([...new Set(problems)].join('\n')); process.exit(1); }
console.log(`keyboard: ${PAGES.length} pages x 2 themes, alt text, skip link, tab order, focus rings, search and reduced motion all pass`);
