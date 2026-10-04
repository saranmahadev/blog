// Signed-in screens, which the other gates cannot reach: the account menu, profile, inbox (reader and author),
// the verification bar and the comment box. Runs against the local Auth and Firestore emulators with a site built
// for them (see `pnpm check:signed-in`), signs in through the real form, and scans each screen with axe in light
// and dark. Also fails on any Content-Security-Policy violation or script error on the way.
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { serve, chromePath } from './serve.mjs';

const PROJECT = 'demo-drafted';
const AUTH = 'http://127.0.0.1:9099';
const FS = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const POST = 'curious-to-coder/symptoms-that-you-should-pursue-coding';
const PASSWORD = 'correct-horse-battery';
const owner = { 'content-type': 'application/json', authorization: 'Bearer owner' };

async function createUser(email, name, verified) {
  const r = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: PASSWORD, displayName: name, returnSecureToken: true }) });
  const { localId } = await r.json();
  if (verified) await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:update`, { method: 'POST', headers: owner, body: JSON.stringify({ localId, emailVerified: true }) });
  return localId;
}
const ts = (ms) => ({ timestampValue: new Date(ms).toISOString() });
async function putDoc(path, fields) {
  const r = await fetch(`${FS}/${path}`, { method: 'PATCH', headers: owner, body: JSON.stringify({ fields }) });
  if (!r.ok) throw new Error(`seed ${path}: ${r.status} ${await r.text()}`);
}
const str = (s) => ({ stringValue: s });
const nul = { nullValue: null };
const message = (o) => ({ postKey: str(POST), parentId: o.parentId ? str(o.parentId) : nul, replyToId: o.replyToId ? str(o.replyToId) : nul, threadOwnerId: str(o.owner), authorId: str(o.author), authorName: str(o.name), authorRole: str(o.role), body: str(o.body), createdAt: ts(o.at), updatedAt: ts(o.at) });

const reader = await createUser('rin@example.com', 'Rin', true);
await createUser('newbie@example.com', 'Newbie', false);
const author = await createUser('mail@saranmahadev.in', 'Dev', true);
const now = Date.now();
await putDoc(`comments/${reader}_c1`, message({ owner: reader, author: reader, name: 'Rin', role: 'user', body: 'Does this pipeline handle partial failures?', at: now - 3600_000 }));
await putDoc(`comments/${author}_r1`, message({ owner: reader, author, name: 'Dev', role: 'admin', body: 'Yes, each stage retries on its own. Details in part two.', parentId: `${reader}_c1`, replyToId: `${reader}_c1`, at: now - 1800_000 }));
await putDoc(`users/${reader}`, { n: { integerValue: '1' }, m: { integerValue: String(now - 1800_000) } });

const SCREENS = {
  'new reader (email not verified)': { email: 'newbie@example.com', pages: ['/profile/', '/inbox/', `/${POST}/`] },
  'reader with a reply': { email: 'rin@example.com', pages: ['/profile/', '/inbox/', `/${POST}/`], menu: true },
  'author': { email: 'mail@saranmahadev.in', pages: ['/inbox/', `/${POST}/`], menu: true },
};

const { base, close } = await serve();
const browser = await chromium.launch({ executablePath: chromePath() });
let failures = 0, scans = 0;
const note = (m) => { failures++; console.error(m); };

// Age gate: the sign-up form must refuse to create an account until "I am 18 or older" is ticked.
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${base}/register/`, { waitUntil: 'load' });
  await page.fill('#a-user', 'Kid');
  await page.fill('#a-email', 'kid@example.com');
  await page.fill('#a-pass', 'purple tractor lamp river');
  await page.click('button[type=submit]');
  const msg = await page.textContent('#a-age-h', { timeout: 5000 }).catch(() => '');
  if (!/18/.test(msg || '')) note('register: submitting without the age box ticked was not refused');
  await ctx.close();
}

for (const theme of ['light', 'dark']) {
  for (const [label, who] of Object.entries(SCREENS)) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    await ctx.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch {} }, theme);
    const page = await ctx.newPage();
    page.on('console', (m) => { if (/content security policy|refused to/i.test(m.text())) note(`[${theme}] ${label}: ${m.text().slice(0, 200)}`); });
    // Signed-in pages must only talk to this site and the local emulators. A request to Google's hosts here means the
    // Firebase client started loading something (like its popup helper) that the Content-Security-Policy would block live.
    page.on('request', (r) => { const h = new URL(r.url()).hostname; if (!['127.0.0.1', 'localhost'].includes(h) && !r.url().startsWith('data:') && !r.url().startsWith('https://www.google.com/images/cleardot.gif')) note(`[${theme}] ${label}: unexpected request to ${r.url().slice(0, 120)}`); });
    page.on('pageerror', (e) => note(`[${theme}] ${label}: script error ${e.message.slice(0, 200)}`));

    await page.goto(`${base}/login/`, { waitUntil: 'networkidle' });
    await page.fill('#a-email', who.email);
    await page.fill('#a-pass', PASSWORD);
    await page.click('button[type=submit]');
    await page.waitForSelector('button.acct-btn', { timeout: 10_000 }).catch(() => note(`[${theme}] ${label}: sign-in did not complete`));

    for (const url of who.pages) {
      await page.goto(base + url, { waitUntil: 'load' }); // not 'networkidle': Firestore keeps a connection open
      await page.waitForSelector('button.acct-btn', { timeout: 10_000 }).catch(() => note(`[${theme}] ${label} ${url}: not signed in`));
      if (url === '/inbox/') await page.waitForSelector('[role=tablist]', { timeout: 10_000 }).catch(() => note(`[${theme}] ${label} ${url}: inbox did not load`));
      if (url === `/${POST}/`) await page.locator('#comments, .cm').first().scrollIntoViewIfNeeded().catch(() => {});
      // A constructed stylesheet, because the page's Content-Security-Policy refuses an injected <style>.
    await page.evaluate(() => { const s = new CSSStyleSheet(); s.replaceSync('*, *::before, *::after { transition: none !important; animation: none !important; }'); document.adoptedStyleSheets = [...document.adoptedStyleSheets, s]; });
      await page.waitForTimeout(400);
      const runs = [{ name: url, setup: async () => {} }];
      if (who.menu && url === '/inbox/') runs.push({ name: `${url} (account menu open)`, setup: async () => { await page.click('button.acct-btn'); await page.waitForSelector('.acct-menu'); } });
      if (url === '/inbox/' && label.includes('author')) runs.push({ name: `${url} (all conversations)`, setup: async () => { await page.keyboard.press('Escape'); await page.click('[role=tab]:nth-child(2)'); } });
      for (const r of runs) {
        await r.setup();
        const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        scans++;
        const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
        for (const v of serious) note(`[${theme}] ${label} ${r.name}\n  ${v.impact} ${v.id}: ${v.help}\n    ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join('\n    ')}`);
      }
    }
    // The inbox should actually show the conversation we seeded (proves the rules and queries work end to end).
    if (label !== 'new reader (email not verified)') {
      await page.goto(`${base}/inbox/`, { waitUntil: 'load' });
      await page.getByRole('tab', { name: /All conversations/ }).click();
      await page.getByText('partial failures').first().waitFor({ timeout: 10_000 }).catch(() => note(`[${theme}] ${label}: the seeded conversation is not in the inbox`));
    }
    await ctx.close();
  }
}
await browser.close();
close();
if (failures) { console.error(`\n${failures} problem(s) in signed-in screens`); process.exit(1); }
console.log(`signed-in: ${scans} scans (3 accounts x light/dark), the inbox shows the seeded conversation, no policy violations`);
