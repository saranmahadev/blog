/**
 * Submits every sitemap URL to IndexNow (Bing, Yandex and others) after a live deploy.
 * The key is public by design: it is served from /<key>.txt so engines can verify ownership.
 */
import { readdirSync, readFileSync } from 'node:fs';

const host = new URL(process.env.SITE_URL ?? 'https://blog.saranmahadev.in').host;
const keyFile = readdirSync('public').find((name) => /^[a-f0-9]{32}\.txt$/.test(name));
if (!keyFile) {
  console.log('No IndexNow key file in public/, skipping.');
  process.exit(0);
}
const key = keyFile.replace('.txt', '');

const sitemap = readFileSync('dist/sitemap-0.xml', 'utf8');
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host, key, keyLocation: `https://${host}/${keyFile}`, urlList }),
});
console.log(`IndexNow: submitted ${urlList.length} URL(s), HTTP ${response.status}`);
