// Decides which CI steps a change can affect, from the list of changed files. Used by .github/workflows/deploy.yml and tested in
// scripts/ci-paths.test.mjs, so the skip rules are checked rather than trusted. When in doubt a rule says "run".
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const DOCS = [/\.md$/, /^docs\//, /^LICENSE$/, /^design\//, /^\.github\/(?!workflows\/|dependabot)/];
const AREAS = {
  // Anything that changes what is in dist/.
  site: [/^src\/(?!.*\.test\.)/, /^public\//, /^astro\.config\.mjs$/, /^tsconfig\.json$/, /^package\.json$/, /^pnpm-lock\.yaml$/, /^\.nvmrc$/, /^scripts\/(build-|csp-hashes|serve)/, /^firebase\.json$/],
  content: [/^src\/content\/(posts|series)\//],
  // UI code, styles, layouts and dependencies: not just articles.
  code: [/^scripts\/check-/, /^src\/(components|layouts|pages|styles|lib|plugins)\//, /^src\/content\.config\.ts$/, /^astro\.config\.mjs$/, /^package\.json$/, /^pnpm-lock\.yaml$/, /^tsconfig\.json$/, /^\.nvmrc$/, /^scripts\/(build-|csp-hashes)/, /^firebase\.json$/],
  feeds: [/^src\/content\/(posts|series)\//, /^scripts\/(build-feeds|check-feeds)/, /^src\/pages\/.*\.(xml|json)\.ts$/, /^src\/pages\/(rss|atom|feed)/, /^src\/lib\/content\.ts$/, /^package\.json$/, /^pnpm-lock\.yaml$/],
  ads: [/^src\/content\/sponsors\//, /^public\/sponsors\//, /^src\/components\/sponsor\//, /^src\/lib\/(sponsors|ad-prices|mailto|ads)/, /^src\/pages\/advertise\.astro$/, /^src\/styles\//, /^scripts\/check-(sponsors|advertise)/, /^package\.json$/, /^pnpm-lock\.yaml$/],
  rules: [/^firestore\.rules$/, /^firestore\.indexes\.json$/, /^firebase-tests\//, /^vitest\.config\.ts$/, /^package\.json$/, /^pnpm-lock\.yaml$/],
  functions: [/^functions\/(?!lib\/|node_modules\/)/],
  signedin: [/^src\/(components\/(auth|inbox|comments|sync|library)|lib\/(firebase|sync|auth)|styles|layouts)/, /^scripts\/check-signed-in/, /^firebase\.json$/, /^firestore\.rules$/, /^package\.json$/, /^pnpm-lock\.yaml$/],
  // Changing the pipeline or a gate re-proves everything it touches.
  workflow: [/^\.github\/workflows\//, /^scripts\/(serve|ci-paths|pages)/, /^lighthouserc\.json$/],
};

export function classify(files, { full = false } = {}) {
  const hit = (list) => files.some((f) => list.some((r) => r.test(f)));
  const out = Object.fromEntries(Object.entries(AREAS).map(([k, v]) => [k, full || hit(v)]));
  const everything = out.workflow || full || files.some((f) => /^(package\.json|pnpm-lock\.yaml)$/.test(f));
  if (everything) for (const k of Object.keys(out)) out[k] = true;
  out.docsOnly = !full && files.length > 0 && files.every((f) => DOCS.some((r) => r.test(f)));
  // Articles changed and nothing else in the UI: browser gates only need to look at those pages.
  const articleOnly = !everything && out.content && !out.code && !files.some((f) => AREAS.site.some((r) => r.test(f)) && !AREAS.content.some((r) => r.test(f)) && !/^public\/sponsors\//.test(f));
  out.articleOnly = articleOnly;
  out.slugs = articleOnly ? [...new Set(files.filter((f) => AREAS.content[0].test(f)).map((f) => f.replace(/^src\/content\/(posts|series)\//, '').replace(/\/index\.md$/, '').replace(/\.mdx?$/, '').split('/').pop()))].join(',') : '';
  // Derived run decisions (one place, so the workflow only reads booleans).
  out.build = out.site || out.content || out.code || full;
  out.typecheck = out.code || out.content;
  out.browser = out.code || out.content || out.ads; // CSP, axe and keyboard checks
  out.unit = out.code || out.ads;
  out.lighthouse = out.code || out.workflow || full;
  out.backend = out.rules || out.functions || out.signedin;
  return out;
}

function changedFiles(base, head) {
  if (!base || /^0+$/.test(base)) return null;
  try { return execFileSync('git', ['diff', '--name-only', `${base}...${head}`], { encoding: 'utf8' }).split('\n').filter(Boolean); }
  catch { try { return execFileSync('git', ['diff', '--name-only', base, head], { encoding: 'utf8' }).split('\n').filter(Boolean); } catch { return null; } }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [base, head = 'HEAD', mode = ''] = process.argv.slice(2);
  const files = mode === 'full' ? null : changedFiles(base, head);
  const out = classify(files ?? [], { full: files === null }); // unknown change set means run everything
  const lines = Object.entries(out).map(([k, v]) => `${k}=${v}`);
  console.log(lines.join('\n'));
  console.log(`changed files: ${files ? files.length : 'unknown (full run)'}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, lines.join('\n') + '\n');
}
