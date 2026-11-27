/**
 * Every check, run on your machine (CI only builds and deploys):
 *   type check -> build -> verify (links, SEO, agent files) -> security gate
 *
 *   npm run release:prepare            run everything
 *   node scripts/release.mjs --stage   same, then `git add firebase.json` (used by the pre-commit hook)
 *
 * The build rewrites the CSP script hashes in firebase.json; --stage keeps that file in the commit
 * so the repository never disagrees with the build.
 */
import { execSync } from 'node:child_process';

const stage = process.argv.includes('--stage');

const run = (label, command) => {
  console.log(`\n> ${label}`);
  execSync(command, { stdio: 'inherit' });
};

try {
  run('Type check', 'npx astro check');
  run('Build (site, search index, CSP hashes)', 'npm run build');
  run('Verify (links, SEO, agent files)', 'npm run verify:dist');
  run('Security gate', 'node scripts/security-gate.mjs');
  if (stage) run('Keep firebase.json in sync', 'git add firebase.json');
} catch {
  console.error('\nRelease checks stopped. Fix the problem above and run them again.');
  process.exit(1);
}
console.log('\nAll release checks passed.');
