# Deploy and quality gates

[README](../README.md) · [Writing](WRITING.md) · [Architecture](ARCHITECTURE.md) · [Deploy](DEPLOY.md) · [Security](SECURITY.md) · [Advertising](ADVERTISING.md)

How a change reaches the live site, and the checks that must pass first.

## Deploy

CI (`.github/workflows/deploy.yml`) builds on demand and deploys from `main`. Deploys run once these are set in GitHub:

- Variables: `FIREBASE_PROJECT_ID`, `SITE_URL`
- Secrets: `WORKLOAD_IDENTITY_PROVIDER`, `FIREBASE_DEPLOY_SERVICE_ACCOUNT`

The workflow runs on commits to `main` (build + deploy), when the `build` label is added to a pull request (build and checks only), when `deploy-preview` is added (build plus a temporary preview URL that expires in 7 days), or by hand from the Actions tab. Ordinary PR commits do not run it; to re-check a PR, re-add the label. The Firebase project is set in `.firebaserc`.

### What runs for which change

The workflow looks at the changed files first (`scripts/ci-paths.mjs`, with its rules tested in `scripts/ci-paths.test.mjs`) and skips what a change cannot affect:

| You changed | What runs |
| --- | --- |
| Only docs, `README`, `LICENSE` | Nothing heavy (just the check that decides this) |
| An article (`src/content/posts`, `series`) | Build, links, privacy, SEO, feeds; CSP, axe and keyboard on the home page and that article only. No type check, Lighthouse, ad checks or backend |
| A sponsor banner | Build, links, privacy, SEO, ad checks, CSP, axe, keyboard. No Lighthouse or backend |
| `functions/` | Functions compile only. No site build; only the functions deploy |
| `firestore.rules`, `firebase-tests/` | Rules tests (and the signed-in screens); only rules deploy |
| Components, layouts, styles, pages, libs, check scripts | Type check, unit tests, build and every site check, plus the signed-in screens for auth, inbox, style and layout changes |
| `package.json`, the lockfile, `.github/workflows`, `scripts/ci-paths.mjs` | Everything |
| A manual run, or the weekly run | Everything (the weekly run never deploys) |

Deploy follows the same rule: hosting only if the site changed, rules only if rules changed, functions only if functions changed. The weekly full run guards against a skip rule that is ever wrong. If a deploy failed on an earlier push, start a manual run on `main` to redeploy everything. The `ci-ok` job fails if any job that ran failed; it is the single check to require in branch protection.

### Quality gates

After the build, the `gates` job must pass before any deploy or preview:

- `pnpm check:links`: every internal link, image, script and `#anchor` in `dist/` resolves.
- `pnpm check:privacy`: no third-party font, analytics or session-replay host appears anywhere in `dist/`.
- `pnpm check:seo`: every indexable page has one title (under 75 characters), a description (50-170), one `h1`, a canonical link, a share image and valid structured data; the sitemap lists only built, indexable pages; icons and manifest exist.
- `pnpm check:feeds`: every feed is well formed, has the fields readers need, links only to pages that exist, and carries no scripts or SVG.
- `pnpm check:csp`: key pages (search, hydrated islands, auth pages) load in a real browser with no Content-Security-Policy violation.
- `pnpm check:keyboard`: alt text and accessible names, the skip link, tab order, visible focus, no keyboard traps, search with `/` and Esc, reduced motion.
- `pnpm check:a11y`: axe-core (WCAG 2.1 A/AA) on key pages in light and dark, plus the open search dialog. Fails on serious or critical violations.
- `pnpm check:lighthouse`: Lighthouse (`lighthouserc.json`) on Home and two Imaxt-heavy posts. Floors: performance 90, accessibility 95, SEO 95.

Run them locally after `pnpm build` with `pnpm check:dist` (set `CHROME_PATH` if Chrome is not at a standard location).
