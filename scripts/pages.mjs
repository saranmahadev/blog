// Which pages a browser check should visit: the full list, or (when CI knows only articles changed) the home page plus those articles.
import fs from 'node:fs';

export function pagesFor(full) {
  const slugs = (process.env.CHECK_SLUGS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!slugs.length) return full;
  let urls = [];
  try { urls = [...fs.readFileSync('dist/sitemap.xml', 'utf8').matchAll(/<loc>https?:\/\/[^/]+(\/[^<]*)<\/loc>/g)].map((m) => m[1]); } catch { return full; }
  const hit = urls.filter((u) => slugs.some((s) => u.split('/').filter(Boolean).pop() === s));
  return hit.length ? ['/', ...hit] : full;
}
