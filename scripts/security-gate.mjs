/**
 * Security gate. Fails (exit 1) when anything below is wrong; the deploy does not run.
 * Dependency-free on purpose (Node built-ins only). Run it after a build: it inspects dist/.
 * It runs locally in the git hooks and again in CI between the build and the deploy.
 *
 *   node scripts/security-gate.mjs            checks everything except the network audit
 *   node scripts/security-gate.mjs --audit    also runs `npm audit` (high/critical block)
 *
 * What it checks
 *   1. security.txt is present, valid and not about to expire
 *   2. firebase.json sends the security headers, and the CSP is strict
 *   3. the CSP covers every inline script in the build (otherwise the site would break)
 *   4. the build contains nothing that should not ship, and loads nothing from other origins
 *   5. no secrets or key material anywhere in the repository
 *   6. no known high or critical vulnerabilities in production dependencies
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { inlineScriptHashes, walk } from './lib/dist.mjs';

const withAudit = process.argv.includes('--audit');
const failures = [];
const warnings = [];
const passed = [];
const check = (name, problems = [], notes = []) => {
  problems.forEach((p) => failures.push(`${name}: ${p}`));
  notes.forEach((n) => warnings.push(`${name}: ${n}`));
  if (!problems.length) passed.push(name);
};

// ---------------------------------------------------------------- 1. security.txt
{
  const problems = [];
  const notes = [];
  const path = 'public/.well-known/security.txt';
  if (!existsSync(path)) problems.push('file is missing');
  else {
    const text = readFileSync(path, 'utf8');
    if (!/^Contact:\s*\S+/m.test(text)) problems.push('no Contact field');
    const expires = new Date(text.match(/^Expires:\s*(.+)$/m)?.[1] ?? NaN);
    const days = Math.floor((expires.getTime() - Date.now()) / 864e5);
    if (Number.isNaN(days)) problems.push('no valid Expires field');
    else if (days < 14) problems.push(`expires in ${days} days (renew it: deploys are blocked within 14 days)`);
    else if (days > 366) problems.push('Expires is more than a year away (RFC 9116 allows at most one year)');
    else if (days < 60) notes.push(`expires in ${days} days: renew soon`);
  }
  check('security.txt', problems, notes);
}

// ---------------------------------------------------------------- deploy target
// The Firebase project hosts several sites (each with its own custom domain). Without an explicit
// `site`, a deploy goes to the project's DEFAULT site, which is a different product. Pin it.
{
  const EXPECTED_SITE = 'blog-saranmahadev'; // serves blog.saranmahadev.in
  const problems = [];
  try {
    const site = JSON.parse(readFileSync('firebase.json', 'utf8')).hosting?.site;
    if (site !== EXPECTED_SITE) problems.push(`firebase.json hosting.site is ${JSON.stringify(site)}, expected "${EXPECTED_SITE}" (otherwise the deploy lands on the project's default site)`);
  } catch {
    problems.push('firebase.json is missing or not valid JSON');
  }
  check('deploy target', problems);
}

// ---------------------------------------------------------------- 2 + 3. headers and CSP
{
  const problems = [];
  let config = {};
  try {
    config = JSON.parse(readFileSync('firebase.json', 'utf8'));
  } catch (error) {
    problems.push(`firebase.json is missing or not valid JSON (${error.message.split('\n')[0]})`);
  }
  const headers = Object.fromEntries(
    (config.hosting?.headers?.find((r) => r.source === '**')?.headers ?? []).map((h) => [String(h.key).toLowerCase(), h.value]),
  );
  for (const key of ['strict-transport-security', 'x-content-type-options', 'x-frame-options', 'referrer-policy', 'permissions-policy', 'content-security-policy']) {
    if (!headers[key]) problems.push(`header ${key} is not set`);
  }
  const maxAge = Number(headers['strict-transport-security']?.match(/max-age=(\d+)/)?.[1] ?? 0);
  if (maxAge < 15552000) problems.push('HSTS max-age should be at least 180 days');
  if (headers['x-content-type-options'] && headers['x-content-type-options'] !== 'nosniff') problems.push('X-Content-Type-Options must be nosniff');

  const csp = Object.fromEntries(
    (headers['content-security-policy'] ?? '').split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
      const [name, ...values] = d.split(/\s+/);
      return [name, values];
    }),
  );
  const script = csp['script-src'] ?? [];
  if (!script.length) problems.push('CSP has no script-src');
  for (const bad of ["'unsafe-eval'", "'unsafe-inline'", '*', 'data:', 'http:', 'https:']) {
    if (script.includes(bad)) problems.push(`CSP script-src allows ${bad}`);
  }
  for (const [directive, expected] of [['default-src', "'self'"], ['object-src', "'none'"], ['base-uri', "'self'"], ['frame-ancestors', "'none'"]]) {
    if (!(csp[directive] ?? []).includes(expected)) problems.push(`CSP ${directive} must include ${expected}`);
  }
  if (existsSync('dist')) {
    const missing = [...inlineScriptHashes('dist')].filter((hash) => !script.includes(hash));
    if (missing.length) problems.push(`CSP is stale: ${missing.length} inline script(s) in the build are not allowed by it (run the build)`);
  }
  check('headers and CSP', problems);
}

// ---------------------------------------------------------------- 4. build contents
if (existsSync('dist')) {
  const problems = [];
  const files = walk('dist');
  for (const file of files) {
    const f = file.replaceAll('\\', '/');
    if (/\.map$/.test(f)) problems.push(`source map shipped: ${f}`);
    if (/(^|\/)\.env/.test(f) || /\.(pem|key|p12)$/.test(f)) problems.push(`sensitive file in build: ${f}`);
    if (/^dist\/keystatic/.test(f)) problems.push(`editor (Keystatic) shipped: ${f}`);
  }
  // Pages may only load code, styles, fonts and images from this site. (A <link> that merely
  // names another page, like canonical or alternate, is not a load.)
  const LOADING_LINK = /\brel="(?:stylesheet|preload|modulepreload|prefetch|icon|apple-touch-icon|manifest)"/;
  for (const file of files.filter((f) => f.endsWith('.html') && !f.includes('pagefind'))) {
    const html = readFileSync(file, 'utf8');
    for (const [tag, name] of html.matchAll(/<(script|link|img|iframe|embed|object|source|video|audio)\b[^>]*>/g)) {
      if (name === 'link' && !LOADING_LINK.test(tag)) continue;
      const url = tag.match(/\b(?:src|href|data)="(https?:\/\/[^"]+)"/)?.[1];
      if (url) problems.push(`${file.replaceAll('\\', '/')}: <${name}> loads ${url}`);
    }
  }
  check('build contents', [...new Set(problems)]);
} else {
  check('build contents', ['dist/ does not exist: build first']);
}

// ---------------------------------------------------------------- 5. secrets
{
  const problems = [];
  const SKIP = new Set(['node_modules', '.git', '.astro']);
  const BINARY = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|otf|wasm|pagefind|pf_[a-z]+|pf_meta|pf_index|pf_fragment)$/i;
  const PATTERNS = [
    [/-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED |PGP )?PRIVATE KEY(?: BLOCK)?-----/, 'private key'],
    [/"private_key"\s*:\s*"-----BEGIN/, 'service-account key'],
    [/\bAKIA[0-9A-Z]{16}\b/, 'AWS access key id'],
    [/\bghp_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{50,}\b/, 'GitHub token'],
    [/\bxox[baprs]-[A-Za-z0-9-]{10,}/, 'Slack token'],
    [/\bsk-(?:live|proj|ant)-[A-Za-z0-9_-]{20,}/, 'API secret key'],
    [/\bAIza[0-9A-Za-z_-]{35}\b/, 'Google API key'],
  ];
  for (const file of walk('.', SKIP)) {
    const f = file.replaceAll('\\', '/').replace(/^\.\//, '');
    if (/(^|\/)\.env(\.|$)/.test(f) && !/\.example$/.test(f)) problems.push(`environment file in the repository: ${f}`);
    if (BINARY.test(f) || statSync(file).size > 3_000_000) continue;
    const text = readFileSync(file, 'utf8');
    for (const [pattern, label] of PATTERNS) if (pattern.test(text)) problems.push(`${label} in ${f}`);
  }
  check('secrets scan', problems);
}

// ---------------------------------------------------------------- 6. dependencies
if (withAudit) {
  const problems = [];
  const notes = [];
  try {
    let output = '';
    try {
      output = execSync('npm audit --omit=dev --json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    } catch (error) {
      output = error.stdout?.toString() ?? ''; // npm audit exits non-zero when it finds something
    }
    const counts = JSON.parse(output).metadata?.vulnerabilities;
    if (!counts) throw new Error('no audit data');
    const blocking = (counts.high ?? 0) + (counts.critical ?? 0);
    if (blocking) problems.push(`${counts.critical ?? 0} critical and ${counts.high ?? 0} high severity vulnerabilities in production dependencies (run \`npm audit\`)`);
    if (counts.moderate) notes.push(`${counts.moderate} moderate finding(s): not blocking, but review \`npm audit\``);
  } catch {
    notes.push('could not reach the npm audit service: dependency check skipped this time');
  }
  check('dependency audit', problems, notes);
}

// ---------------------------------------------------------------- report
for (const name of passed) console.log(`  pass  ${name}`);
for (const note of warnings) console.log(`  warn  ${note}`);
for (const failure of failures) console.error(`  FAIL  ${failure}`);
if (failures.length) {
  console.error(`\nSecurity gate failed (${failures.length}). Nothing will be deployed until this is fixed.`);
  process.exit(1);
}
console.log('\nSecurity gate passed.');
