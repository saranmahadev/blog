// Our own banners rotate; paid ones never do. Checks, in a real browser: one banner visible per slot, a different one after each
// reload, different slots show different banners, rotation over time, pause, dots, and no automatic rotation under reduced motion.
import { chromium } from 'playwright';
import { serve, chromePath } from './serve.mjs';

const URL_PATH = '/dev-universe/a-connected-ecosystem/';
const { base, close } = await serve();
const browser = await chromium.launch({ executablePath: chromePath() });
const problems = [];
const note = (m) => problems.push(m);

const visible = (page) => page.evaluate(() => [...document.querySelectorAll('[data-rot]')].map((r) => {
  const on = [...r.querySelectorAll('.rot-slide')].filter((s) => !s.hasAttribute('inert'));
  return { count: on.length, head: on[0]?.querySelector('.sponsor-head')?.textContent ?? '' };
}));

async function open(ctx) {
  const page = await ctx.newPage();
  await page.clock.install();
  await page.goto(base + URL_PATH, { waitUntil: 'load' });
  await page.evaluate(() => document.querySelector('[data-rot]')?.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(400); // lets the visibility observer report in real time
  await page.clock.runFor(200);
  return page;
}

// 1. Without JavaScript: first banner only, no controls.
{
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(base + URL_PATH, { waitUntil: 'load' });
  const n = await page.evaluate(() => [...document.querySelectorAll('[data-rot]')].map((r) => ({ on: r.querySelectorAll('.rot-slide:not([inert])').length, ctl: !r.querySelector('.rot-ctl')?.hidden })));
  if (!n.length) note('no rotating banners found on the article page');
  n.forEach((x) => { if (x.on !== 1) note(`without JavaScript ${x.on} banners are in the page (want 1)`); if (x.ctl) note('rotation controls show without JavaScript'); });
  await ctx.close();
}

// 2. With JavaScript and normal motion.
{
  const ctx = await browser.newContext({ reducedMotion: 'no-preference', viewport: { width: 1400, height: 900 } });
  const page = await open(ctx);
  const first = await visible(page);
  first.forEach((x) => { if (x.count !== 1) note(`${x.count} banners visible in one slot (want 1)`); });
  const heads = first.map((x) => x.head);
  if (new Set(heads).size !== heads.length) note(`slots on one page show the same banner: ${heads.join(' | ')}`);

  // time
  await page.clock.runFor(9500);
  const later = await visible(page);
  if (later[0].head === first[0].head) note('the banner did not change after a rotation period');

  // pause
  const rot = page.locator('[data-rot]').first();
  await rot.locator('.rot-pp').click();
  if ((await rot.locator('.rot-pp').getAttribute('aria-pressed')) !== 'true') note('pause button does not report its state');
  const held = (await visible(page))[0].head;
  await page.clock.runFor(30000);
  if ((await visible(page))[0].head !== held) note('banner rotated while paused');
  await rot.locator('.rot-pp').click();

  // dots
  await rot.locator('.rot-dot').nth(2).click();
  const dot = await rot.evaluate((r) => [...r.querySelectorAll('.rot-dot')].findIndex((d) => d.getAttribute('aria-current') === 'true'));
  if (dot !== 2) note(`clicking the third dot shows banner ${dot + 1}`);

  // reload: a different banner each time in the same tab
  const seen = [];
  for (let k = 0; k < 4; k++) { await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(150); seen.push((await visible(page))[0].head); }
  for (let k = 1; k < seen.length; k++) if (seen[k] === seen[k - 1]) note(`a reload showed the same banner twice in a row ("${seen[k]}")`);
  await ctx.close();
}

// 3. Reduced motion: no automatic rotation, no animation.
{
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1400, height: 900 } });
  const page = await open(ctx);
  const a = (await visible(page))[0].head;
  await page.clock.runFor(40000);
  if ((await visible(page))[0].head !== a) note('banner rotated automatically with reduced motion on');
  const moving = await page.evaluate(() => [...document.querySelectorAll('.sponsor-fx, .sponsor-fx .sponsor-cta, .sponsor-fx::before')].some((e) => getComputedStyle(e).animationName !== 'none') || [...document.querySelectorAll('.sponsor-fx')].some((e) => getComputedStyle(e, '::before').animationName !== 'none'));
  if (moving) note('banner animation still runs with reduced motion on');
  await ctx.close();
}

await browser.close();
close();
if (problems.length) { console.error([...new Set(problems)].join('\n')); process.exit(1); }
console.log('rotation: one banner per slot, a new one each reload and over time, pause and dots work, reduced motion respected');
