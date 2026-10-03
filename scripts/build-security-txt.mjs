// Writes dist/.well-known/security.txt (RFC 9116) with an Expires one year out, so it never goes stale.
import fs from 'node:fs';
import path from 'node:path';

const origin = (process.env.SITE_URL || 'https://blog.saranmahadev.in').replace(/\/$/, '');
const expires = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().replace(/\.\d+Z$/, 'Z');
const dir = path.resolve('dist/.well-known');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'security.txt'), [
  'Contact: mailto:mail@saranmahadev.in',
  `Expires: ${expires}`,
  'Preferred-Languages: en',
  `Canonical: ${origin}/.well-known/security.txt`,
  `Policy: ${origin}/security/`,
  '',
].join('\n'));
console.log('security.txt written');
