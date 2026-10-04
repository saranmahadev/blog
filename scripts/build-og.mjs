// Renders dist/og-card/<slug>/ to dist/og/<slug>.png (1200x630) with headless Chrome, then removes
// dist/og-card so the card pages are not published. Nothing here is committed: the images exist only in dist.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const dist = path.resolve('dist');
const cardDir = path.join(dist, 'og-card');
if (!fs.existsSync(cardDir)) throw new Error('dist/og-card is missing. Run `astro build` first.');

const chrome = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/opt/pw-browsers/chromium']
  .filter(Boolean).find((p) => fs.existsSync(p));

const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.woff': 'font/woff', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = path.join(dist, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(p)] ?? 'application/octet-stream' }).end(fs.readFileSync(p));
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

const slugs = [];
(function walk(dir, rel = '') {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) walk(path.join(dir, e.name), path.posix.join(rel, e.name));
    else if (e.name === 'index.html') slugs.push(rel);
  }
})(cardDir);

const browser = await chromium.launch({ executablePath: chrome });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const slug of slugs) {
  await page.goto(`${base}/og-card/${slug}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const out = path.join(dist, 'og', `${slug}.png`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1200, height: 630 } });
}
// App icons from the favicon, so phones and bookmarks get a crisp square instead of a screenshot.
const svg = fs.readFileSync(path.join(path.resolve('public'), 'favicon.svg'), 'utf8');
for (const [name, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  const icon = await browser.newPage({ viewport: { width: size, height: size } });
  await icon.setContent(`<body style="margin:0;background:#f4f1e8;display:grid;place-items:center;height:100vh"><div style="width:${size}px;height:${size}px">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</div></body>`);
  await icon.screenshot({ path: path.join(dist, name) });
  await icon.close();
}
await browser.close();
server.close();
fs.rmSync(cardDir, { recursive: true });
console.log(`og: ${slugs.length} share images`);
